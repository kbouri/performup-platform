import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";
import { TransactionTypeLabels, type TransactionType } from "@/lib/accounting";

// GET /api/admin/accounting/journal - Liste des transactions du journal
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
    const type = searchParams.get("type");
    const currency = searchParams.get("currency");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const accountId = searchParams.get("accountId");
    const studentId = searchParams.get("studentId");
    const mentorId = searchParams.get("mentorId");
    const professorId = searchParams.get("professorId");
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");

    const where: Record<string, unknown> = {};

    if (type && type !== "all") {
      where.type = type;
    }

    if (currency && currency !== "all") {
      where.currency = currency;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        (where.date as Record<string, unknown>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.date as Record<string, unknown>).lte = new Date(endDate);
      }
    }

    if (accountId) {
      where.OR = [
        { sourceAccountId: accountId },
        { destinationAccountId: accountId },
      ];
    }

    if (studentId) {
      where.studentId = studentId;
    }

    if (mentorId) {
      where.mentorId = mentorId;
    }

    if (professorId) {
      where.professorId = professorId;
    }

    const [transactions, totalCount] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: limit ? parseInt(limit) : 100,
        skip: offset ? parseInt(offset) : 0,
        include: {
          sourceAccount: {
            select: { id: true, accountName: true, currency: true },
          },
          destinationAccount: {
            select: { id: true, accountName: true, currency: true },
          },
          payment: {
            select: { id: true, status: true },
          },
          expense: {
            select: { id: true, category: true, supplier: true },
          },
          mission: {
            select: { id: true, title: true },
          },
          student: {
            include: {
              user: { select: { name: true, firstName: true, lastName: true } },
            },
          },
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
          creator: {
            select: { name: true, firstName: true, lastName: true },
          },
        },
      }),
      prisma.transaction.count({ where }),
    ]);

    // Calculer les totaux par devise
    const totalsByCurrency: Record<string, { incoming: number; outgoing: number }> = {};
    for (const t of transactions) {
      if (!totalsByCurrency[t.currency]) {
        totalsByCurrency[t.currency] = { incoming: 0, outgoing: 0 };
      }
      if (t.destinationAccountId) {
        totalsByCurrency[t.currency].incoming += t.amount;
      }
      if (t.sourceAccountId) {
        totalsByCurrency[t.currency].outgoing += t.amount;
      }
    }

    // Grouper par type
    const byType = transactions.reduce(
      (acc, t) => ({
        ...acc,
        [t.type]: (acc[t.type] || 0) + 1,
      }),
      {} as Record<string, number>
    );

    return NextResponse.json({
      transactions: transactions.map((t) => ({
        id: t.id,
        transactionNumber: t.transactionNumber,
        date: t.date,
        type: t.type,
        typeLabel: TransactionTypeLabels[t.type as TransactionType] || t.type,
        amount: t.amount,
        currency: t.currency,
        sourceAccount: t.sourceAccount,
        destinationAccount: t.destinationAccount,
        description: t.description,
        notes: t.notes,
        exchangeRate: t.exchangeRate,
        fxFees: t.fxFees,
        linkedTransactionId: t.linkedTransactionId,
        // References
        payment: t.payment,
        expense: t.expense,
        mission: t.mission,
        student: t.student
          ? {
              id: t.student.id,
              name:
                t.student.user.firstName && t.student.user.lastName
                  ? `${t.student.user.firstName} ${t.student.user.lastName}`
                  : t.student.user.name,
            }
          : null,
        mentor: t.mentor
          ? {
              id: t.mentor.id,
              name:
                t.mentor.user.firstName && t.mentor.user.lastName
                  ? `${t.mentor.user.firstName} ${t.mentor.user.lastName}`
                  : t.mentor.user.name,
            }
          : null,
        professor: t.professor
          ? {
              id: t.professor.id,
              name:
                t.professor.user.firstName && t.professor.user.lastName
                  ? `${t.professor.user.firstName} ${t.professor.user.lastName}`
                  : t.professor.user.name,
            }
          : null,
        creator:
          t.creator.firstName && t.creator.lastName
            ? `${t.creator.firstName} ${t.creator.lastName}`
            : t.creator.name,
        createdAt: t.createdAt,
      })),
      pagination: {
        total: totalCount,
        limit: limit ? parseInt(limit) : 100,
        offset: offset ? parseInt(offset) : 0,
        hasMore: (offset ? parseInt(offset) : 0) + transactions.length < totalCount,
      },
      summary: {
        totalsByCurrency,
        byType,
        count: transactions.length,
      },
    });
  } catch (error) {
    console.error("Error fetching journal:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation du journal" },
      { status: 500 }
    );
  }
}
