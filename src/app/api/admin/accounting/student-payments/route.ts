import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";
import {
  createTransaction,
  TransactionTypes,
  type Currency,
} from "@/lib/accounting";

// GET /api/admin/accounting/student-payments - Liste des paiements etudiants
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const currency = searchParams.get("currency");
    const studentId = searchParams.get("studentId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: Record<string, unknown> = {
      studentId: { not: null },
    };

    if (status && status !== "all") {
      where.status = status;
    }

    if (currency) {
      where.currency = currency;
    }

    if (studentId) {
      where.studentId = studentId;
    }

    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) {
        (where.paymentDate as Record<string, unknown>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.paymentDate as Record<string, unknown>).lte = new Date(endDate);
      }
    }

    const payments = await prisma.payment.findMany({
      where,
      orderBy: { paymentDate: "desc" },
      include: {
        student: {
          include: {
            user: {
              select: { name: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        bankAccount: {
          select: { accountName: true, bankName: true, currency: true },
        },
        receivedByUser: {
          select: { name: true, firstName: true, lastName: true },
        },
        schedule: {
          select: { id: true, amount: true, dueDate: true },
        },
      },
    });

    // Statistiques par devise
    const byCurrency: Record<string, { total: number; count: number }> = {};
    for (const payment of payments.filter((p) => p.status === "VALIDATED")) {
      if (!byCurrency[payment.currency]) {
        byCurrency[payment.currency] = { total: 0, count: 0 };
      }
      byCurrency[payment.currency].total += payment.amount;
      byCurrency[payment.currency].count += 1;
    }

    return NextResponse.json({
      payments: payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        paymentDate: p.paymentDate,
        status: p.status,
        notes: p.notes,
        student: p.student
          ? {
              id: p.student.id,
              name:
                p.student.user.firstName && p.student.user.lastName
                  ? `${p.student.user.firstName} ${p.student.user.lastName}`
                  : p.student.user.name,
              email: p.student.user.email,
            }
          : null,
        bankAccount: p.bankAccount,
        receivedBy: p.receivedByUser
          ? p.receivedByUser.firstName && p.receivedByUser.lastName
            ? `${p.receivedByUser.firstName} ${p.receivedByUser.lastName}`
            : p.receivedByUser.name
          : null,
        schedule: p.schedule,
        validatedAt: p.validatedAt,
        createdAt: p.createdAt,
      })),
      summary: {
        total: payments.length,
        validated: payments.filter((p) => p.status === "VALIDATED").length,
        pending: payments.filter((p) => p.status === "PENDING_VALIDATION").length,
        byCurrency,
      },
    });
  } catch (error) {
    console.error("Error fetching student payments:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation des paiements" },
      { status: 500 }
    );
  }
}

// POST /api/admin/accounting/student-payments - Enregistrer un paiement etudiant
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const {
      studentId,
      amount,
      currency,
      paymentDate,
      bankAccountId,
      scheduleId,
      notes,
      autoValidate,
    } = body;

    // Validations
    if (!studentId || !amount || !currency || !paymentDate || !bankAccountId) {
      return NextResponse.json(
        {
          error:
            "Champs requis: studentId, amount, currency, paymentDate, bankAccountId",
        },
        { status: 400 }
      );
    }

    // Verifier que l'etudiant existe
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: { select: { name: true, firstName: true, lastName: true } },
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: "Etudiant non trouve" },
        { status: 404 }
      );
    }

    // Verifier le compte bancaire
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: bankAccountId },
    });

    if (!bankAccount) {
      return NextResponse.json(
        { error: "Compte bancaire non trouve" },
        { status: 404 }
      );
    }

    if (!bankAccount.isActive) {
      return NextResponse.json(
        { error: "Ce compte bancaire est inactif" },
        { status: 400 }
      );
    }

    // Verifier que la devise correspond
    if (bankAccount.currency !== currency) {
      return NextResponse.json(
        {
          error: `La devise du paiement (${currency}) ne correspond pas a celle du compte (${bankAccount.currency})`,
        },
        { status: 400 }
      );
    }

    // Verifier l'echeance si specifiee
    let schedule = null;
    if (scheduleId) {
      schedule = await prisma.paymentSchedule.findUnique({
        where: { id: scheduleId },
      });

      if (!schedule) {
        return NextResponse.json(
          { error: "Echeance non trouvee" },
          { status: 404 }
        );
      }

      if (schedule.studentId !== studentId) {
        return NextResponse.json(
          { error: "Cette echeance n'appartient pas a cet etudiant" },
          { status: 400 }
        );
      }
    }

    const status = autoValidate ? "VALIDATED" : "PENDING_VALIDATION";

    // Creer le paiement
    const payment = await prisma.payment.create({
      data: {
        studentId,
        amount,
        currency,
        paymentDate: new Date(paymentDate),
        bankAccountId,
        scheduleId: scheduleId || null,
        receivedBy: session.user.id,
        status,
        validatedBy: autoValidate ? session.user.id : null,
        validatedAt: autoValidate ? new Date() : null,
        notes: notes || null,
      },
      include: {
        student: {
          include: {
            user: { select: { name: true, firstName: true, lastName: true } },
          },
        },
        bankAccount: {
          select: { accountName: true, currency: true },
        },
      },
    });

    // Si valide automatiquement, creer la transaction et mettre a jour l'echeance
    if (autoValidate) {
      // Creer la transaction dans le journal
      await createTransaction({
        date: new Date(paymentDate),
        type: TransactionTypes.STUDENT_PAYMENT,
        amount,
        currency: currency as Currency,
        destinationAccountId: bankAccountId,
        paymentId: payment.id,
        paymentScheduleId: scheduleId || undefined,
        studentId,
        description: `Paiement de ${student.user.firstName || student.user.name}`,
        createdBy: session.user.id,
      });

      // Mettre a jour l'echeance si liee
      if (schedule) {
        const newPaidAmount = schedule.paidAmount + amount;
        const newStatus =
          newPaidAmount >= schedule.amount
            ? "PAID"
            : newPaidAmount > 0
            ? "PARTIAL"
            : "PENDING";

        await prisma.paymentSchedule.update({
          where: { id: scheduleId },
          data: {
            paidAmount: newPaidAmount,
            status: newStatus,
            paidDate: newStatus === "PAID" ? new Date() : null,
            actualCurrency: currency !== schedule.currency ? currency : null,
          },
        });
      }
    }

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE_STUDENT_PAYMENT",
        resourceType: "Payment",
        resourceId: payment.id,
        metadata: {
          studentId,
          amount,
          currency,
          bankAccountId,
          autoValidate,
        },
      },
    });

    return NextResponse.json(
      {
        payment: {
          id: payment.id,
          amount: payment.amount,
          currency: payment.currency,
          paymentDate: payment.paymentDate,
          status: payment.status,
          student: {
            id: payment.student!.id,
            name:
              payment.student!.user.firstName && payment.student!.user.lastName
                ? `${payment.student!.user.firstName} ${payment.student!.user.lastName}`
                : payment.student!.user.name,
          },
          bankAccount: payment.bankAccount,
        },
        message: autoValidate
          ? "Paiement enregistre et valide"
          : "Paiement enregistre (en attente de validation)",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating student payment:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement du paiement" },
      { status: 500 }
    );
  }
}
