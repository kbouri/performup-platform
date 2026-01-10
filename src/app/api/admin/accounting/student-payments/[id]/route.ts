import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";
import {
  createTransaction,
  TransactionTypes,
  type Currency,
} from "@/lib/accounting";

// GET /api/admin/accounting/student-payments/[id] - Detail d'un paiement
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    if (!isAdmin(session.user)) {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const { id } = await params;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            user: {
              select: { name: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        bankAccount: {
          select: { id: true, accountName: true, bankName: true, currency: true },
        },
        receivedByUser: {
          select: { name: true, firstName: true, lastName: true },
        },
        schedule: {
          include: {
            quote: {
              select: { id: true, quoteNumber: true, totalAmount: true },
            },
          },
        },
        transactions: {
          select: { id: true, transactionNumber: true, date: true },
        },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Paiement non trouve" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      payment: {
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        paymentDate: payment.paymentDate,
        status: payment.status,
        notes: payment.notes,
        validatedAt: payment.validatedAt,
        createdAt: payment.createdAt,
        student: payment.student
          ? {
              id: payment.student.id,
              name:
                payment.student.user.firstName && payment.student.user.lastName
                  ? `${payment.student.user.firstName} ${payment.student.user.lastName}`
                  : payment.student.user.name,
              email: payment.student.user.email,
            }
          : null,
        bankAccount: payment.bankAccount,
        receivedBy: payment.receivedByUser
          ? payment.receivedByUser.firstName && payment.receivedByUser.lastName
            ? `${payment.receivedByUser.firstName} ${payment.receivedByUser.lastName}`
            : payment.receivedByUser.name
          : null,
        schedule: payment.schedule
          ? {
              id: payment.schedule.id,
              amount: payment.schedule.amount,
              dueDate: payment.schedule.dueDate,
              status: payment.schedule.status,
              quote: payment.schedule.quote,
            }
          : null,
        transactions: payment.transactions,
      },
    });
  } catch (error) {
    console.error("Error fetching payment:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation du paiement" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/accounting/student-payments/[id] - Modifier/Valider un paiement
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    if (!isAdmin(session.user)) {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const { id } = await params;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        student: {
          include: { user: { select: { name: true, firstName: true } } },
        },
        schedule: true,
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Paiement non trouve" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { action, notes } = body;

    if (action === "validate") {
      if (payment.status !== "PENDING_VALIDATION") {
        return NextResponse.json(
          { error: "Ce paiement ne peut pas etre valide" },
          { status: 400 }
        );
      }

      // Valider le paiement
      await prisma.payment.update({
        where: { id },
        data: {
          status: "VALIDATED",
          validatedBy: session.user.id,
          validatedAt: new Date(),
        },
      });

      // Creer la transaction dans le journal
      await createTransaction({
        date: payment.paymentDate,
        type: TransactionTypes.STUDENT_PAYMENT,
        amount: payment.amount,
        currency: payment.currency as Currency,
        destinationAccountId: payment.bankAccountId || undefined,
        paymentId: payment.id,
        paymentScheduleId: payment.scheduleId || undefined,
        studentId: payment.studentId || undefined,
        description: `Paiement de ${payment.student?.user.firstName || payment.student?.user.name}`,
        createdBy: session.user.id,
      });

      // Mettre a jour l'echeance si liee
      if (payment.schedule) {
        const newPaidAmount = payment.schedule.paidAmount + payment.amount;
        const newStatus =
          newPaidAmount >= payment.schedule.amount
            ? "PAID"
            : newPaidAmount > 0
            ? "PARTIAL"
            : "PENDING";

        await prisma.paymentSchedule.update({
          where: { id: payment.scheduleId! },
          data: {
            paidAmount: newPaidAmount,
            status: newStatus,
            paidDate: newStatus === "PAID" ? new Date() : null,
            actualCurrency:
              payment.currency !== payment.schedule.currency
                ? payment.currency
                : null,
          },
        });
      }

      // Log audit
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "VALIDATE_STUDENT_PAYMENT",
          resourceType: "Payment",
          resourceId: id,
          metadata: { amount: payment.amount, currency: payment.currency },
        },
      });

      return NextResponse.json({
        message: "Paiement valide avec succes",
        status: "VALIDATED",
      });
    } else if (action === "reject") {
      if (payment.status !== "PENDING_VALIDATION") {
        return NextResponse.json(
          { error: "Ce paiement ne peut pas etre rejete" },
          { status: 400 }
        );
      }

      await prisma.payment.update({
        where: { id },
        data: {
          status: "REJECTED",
          notes: notes || payment.notes,
        },
      });

      // Log audit
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "REJECT_STUDENT_PAYMENT",
          resourceType: "Payment",
          resourceId: id,
          metadata: { reason: notes },
        },
      });

      return NextResponse.json({
        message: "Paiement rejete",
        status: "REJECTED",
      });
    } else {
      // Mise a jour simple (notes uniquement si pas valide)
      if (payment.status === "VALIDATED") {
        return NextResponse.json(
          { error: "Un paiement valide ne peut pas etre modifie" },
          { status: 400 }
        );
      }

      await prisma.payment.update({
        where: { id },
        data: { notes: notes ?? payment.notes },
      });

      return NextResponse.json({ message: "Paiement mis a jour" });
    }
  } catch (error) {
    console.error("Error updating payment:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise a jour du paiement" },
      { status: 500 }
    );
  }
}
