import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/admin/accounting/payments - List payments
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    if (!isAdmin(session.user)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: Record<string, unknown> = {};

    if (status && status !== "all") {
      where.status = status;
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
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        mentor: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
        professor: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
        receivedByUser: {
          select: {
            name: true,
          },
        },
        schedule: true,
      },
    });

    const total = payments
      .filter((p) => p.status === "VALIDATED")
      .reduce((acc, p) => acc + p.amount, 0);

    const pending = payments
      .filter((p) => p.status === "PENDING_VALIDATION")
      .reduce((acc, p) => acc + p.amount, 0);

    return NextResponse.json({
      payments: payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        paymentDate: p.paymentDate,
        status: p.status,
        notes: p.notes,
        student: p.student
          ? {
              id: p.student.id,
              name: p.student.user.name,
              email: p.student.user.email,
            }
          : null,
        mentor: p.mentor
          ? {
              id: p.mentor.id,
              name: p.mentor.user.name,
            }
          : null,
        professor: p.professor
          ? {
              id: p.professor.id,
              name: p.professor.user.name,
            }
          : null,
        receivedBy: p.receivedByUser?.name,
        schedule: p.schedule,
        createdAt: p.createdAt,
      })),
      summary: {
        total,
        pending,
        count: payments.length,
        validated: payments.filter((p) => p.status === "VALIDATED").length,
        pendingValidation: payments.filter((p) => p.status === "PENDING_VALIDATION")
          .length,
      },
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des paiements" },
      { status: 500 }
    );
  }
}

// POST /api/admin/accounting/payments - Record a payment
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    if (!isAdmin(session.user)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await request.json();
    const {
      amount,
      paymentDate,
      studentId,
      mentorId,
      professorId,
      scheduleId,
      notes,
    } = body;

    if (!amount || !paymentDate) {
      return NextResponse.json(
        { error: "Montant et date sont requis" },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.create({
      data: {
        amount,
        paymentDate: new Date(paymentDate),
        studentId: studentId || null,
        mentorId: mentorId || null,
        professorId: professorId || null,
        scheduleId: scheduleId || null,
        receivedBy: session.user.id,
        status: "PENDING_VALIDATION",
        notes,
      },
      include: {
        student: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Update payment schedule if linked
    if (scheduleId) {
      const schedule = await prisma.paymentSchedule.findUnique({
        where: { id: scheduleId },
      });

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
            paidDate: newStatus === "PAID" ? new Date() : undefined,
          },
        });
      }
    }

    return NextResponse.json(
      {
        payment,
        message: "Paiement enregistré avec succès",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating payment:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement du paiement" },
      { status: 500 }
    );
  }
}

