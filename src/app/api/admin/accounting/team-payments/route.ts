import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";
import {
  createTransaction,
  TransactionTypes,
  type Currency,
} from "@/lib/accounting";

// GET /api/admin/accounting/team-payments - Liste des paiements equipe
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
    const type = searchParams.get("type"); // mentor, professor
    const currency = searchParams.get("currency");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: Record<string, unknown> = {
      OR: [{ mentorId: { not: null } }, { professorId: { not: null } }],
    };

    if (status && status !== "all") {
      where.status = status;
    }

    if (currency) {
      where.currency = currency;
    }

    if (type === "mentor") {
      where.OR = undefined;
      where.mentorId = { not: null };
    } else if (type === "professor") {
      where.OR = undefined;
      where.professorId = { not: null };
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
        mentor: {
          include: {
            user: {
              select: { name: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        professor: {
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
        type: p.mentorId ? "MENTOR" : "PROFESSOR",
        mentor: p.mentor
          ? {
              id: p.mentor.id,
              name:
                p.mentor.user.firstName && p.mentor.user.lastName
                  ? `${p.mentor.user.firstName} ${p.mentor.user.lastName}`
                  : p.mentor.user.name,
              email: p.mentor.user.email,
            }
          : null,
        professor: p.professor
          ? {
              id: p.professor.id,
              name:
                p.professor.user.firstName && p.professor.user.lastName
                  ? `${p.professor.user.firstName} ${p.professor.user.lastName}`
                  : p.professor.user.name,
              email: p.professor.user.email,
              type: p.professor.type,
            }
          : null,
        bankAccount: p.bankAccount,
        paidBy: p.receivedByUser
          ? p.receivedByUser.firstName && p.receivedByUser.lastName
            ? `${p.receivedByUser.firstName} ${p.receivedByUser.lastName}`
            : p.receivedByUser.name
          : null,
        validatedAt: p.validatedAt,
        createdAt: p.createdAt,
      })),
      summary: {
        total: payments.length,
        validated: payments.filter((p) => p.status === "VALIDATED").length,
        pending: payments.filter((p) => p.status === "PENDING_VALIDATION").length,
        mentorPayments: payments.filter((p) => p.mentorId).length,
        professorPayments: payments.filter((p) => p.professorId).length,
        byCurrency,
      },
    });
  } catch (error) {
    console.error("Error fetching team payments:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation des paiements" },
      { status: 500 }
    );
  }
}

// POST /api/admin/accounting/team-payments - Enregistrer un paiement equipe
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
      mentorId,
      professorId,
      amount,
      currency,
      paymentDate,
      bankAccountId,
      missionIds,
      notes,
    } = body;

    // Validations
    if (!amount || !currency || !paymentDate || !bankAccountId) {
      return NextResponse.json(
        {
          error: "Champs requis: amount, currency, paymentDate, bankAccountId",
        },
        { status: 400 }
      );
    }

    if (!mentorId && !professorId) {
      return NextResponse.json(
        { error: "Un mentor ou professeur doit etre specifie" },
        { status: 400 }
      );
    }

    // Verifier le compte bancaire (source du paiement)
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

    if (bankAccount.currency !== currency) {
      return NextResponse.json(
        {
          error: `La devise du paiement (${currency}) ne correspond pas a celle du compte (${bankAccount.currency})`,
        },
        { status: 400 }
      );
    }

    // Verifier les missions si specifiees
    if (missionIds && missionIds.length > 0) {
      const missions = await prisma.mission.findMany({
        where: {
          id: { in: missionIds },
          status: "VALIDATED",
        },
      });

      if (missions.length !== missionIds.length) {
        return NextResponse.json(
          { error: "Une ou plusieurs missions sont invalides ou non validees" },
          { status: 400 }
        );
      }

      // Verifier que les missions appartiennent au bon mentor/professeur
      for (const mission of missions) {
        if (mentorId && mission.mentorId !== mentorId) {
          return NextResponse.json(
            { error: "Une mission n'appartient pas a ce mentor" },
            { status: 400 }
          );
        }
        if (professorId && mission.professorId !== professorId) {
          return NextResponse.json(
            { error: "Une mission n'appartient pas a ce professeur" },
            { status: 400 }
          );
        }
      }
    }

    // Creer le paiement
    const payment = await prisma.payment.create({
      data: {
        mentorId: mentorId || null,
        professorId: professorId || null,
        amount,
        currency,
        paymentDate: new Date(paymentDate),
        bankAccountId,
        receivedBy: session.user.id,
        status: "VALIDATED",
        validatedBy: session.user.id,
        validatedAt: new Date(),
        notes: notes || null,
      },
      include: {
        mentor: {
          include: {
            user: { select: { name: true, firstName: true, lastName: true } },
          },
        },
        professor: {
          include: {
            user: { select: { name: true, firstName: true, lastName: true } },
          },
        },
        bankAccount: { select: { accountName: true, currency: true } },
      },
    });

    // Creer la transaction dans le journal
    const transactionType = mentorId
      ? TransactionTypes.MENTOR_PAYMENT
      : TransactionTypes.PROFESSOR_PAYMENT;

    const recipientName = payment.mentor
      ? payment.mentor.user.firstName && payment.mentor.user.lastName
        ? `${payment.mentor.user.firstName} ${payment.mentor.user.lastName}`
        : payment.mentor.user.name
      : payment.professor
      ? payment.professor.user.firstName && payment.professor.user.lastName
        ? `${payment.professor.user.firstName} ${payment.professor.user.lastName}`
        : payment.professor.user.name
      : "Inconnu";

    await createTransaction({
      date: new Date(paymentDate),
      type: transactionType,
      amount,
      currency: currency as Currency,
      sourceAccountId: bankAccountId,
      paymentId: payment.id,
      mentorId: mentorId || undefined,
      professorId: professorId || undefined,
      description: `Paiement a ${recipientName}`,
      createdBy: session.user.id,
    });

    // Marquer les missions comme payees
    if (missionIds && missionIds.length > 0) {
      await prisma.mission.updateMany({
        where: { id: { in: missionIds } },
        data: {
          status: "PAID",
          paidAt: new Date(),
        },
      });
    }

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE_TEAM_PAYMENT",
        resourceType: "Payment",
        resourceId: payment.id,
        metadata: {
          mentorId,
          professorId,
          amount,
          currency,
          missionIds,
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
          recipient: recipientName,
          bankAccount: payment.bankAccount,
        },
        message: `Paiement de ${amount / 100} ${currency} enregistre pour ${recipientName}`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating team payment:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement du paiement" },
      { status: 500 }
    );
  }
}
