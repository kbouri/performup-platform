import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";
import { TransactionTypeLabels, type TransactionType } from "@/lib/accounting";

// GET /api/admin/accounting/journal/[id] - Detail d'une transaction
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

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        sourceAccount: {
          select: { id: true, accountName: true, bankName: true, currency: true },
        },
        destinationAccount: {
          select: { id: true, accountName: true, bankName: true, currency: true },
        },
        payment: {
          select: {
            id: true,
            amount: true,
            currency: true,
            status: true,
            paymentDate: true,
          },
        },
        expense: {
          select: {
            id: true,
            category: true,
            supplier: true,
            amount: true,
            currency: true,
            expenseDate: true,
          },
        },
        distribution: {
          select: {
            id: true,
            totalAmount: true,
            currency: true,
            distributionDate: true,
          },
        },
        mission: {
          select: {
            id: true,
            title: true,
            amount: true,
            status: true,
            date: true,
          },
        },
        paymentSchedule: {
          select: {
            id: true,
            amount: true,
            dueDate: true,
            status: true,
          },
        },
        student: {
          include: {
            user: { select: { name: true, firstName: true, lastName: true, email: true } },
          },
        },
        mentor: {
          include: {
            user: { select: { name: true, firstName: true, lastName: true, email: true } },
          },
        },
        professor: {
          include: {
            user: { select: { name: true, firstName: true, lastName: true, email: true } },
          },
        },
        creator: {
          select: { name: true, firstName: true, lastName: true, email: true },
        },
        linkedTransaction: {
          select: {
            id: true,
            transactionNumber: true,
            amount: true,
            currency: true,
          },
        },
        fxPairTransaction: {
          select: {
            id: true,
            transactionNumber: true,
            amount: true,
            currency: true,
          },
        },
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Transaction non trouvee" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      transaction: {
        id: transaction.id,
        transactionNumber: transaction.transactionNumber,
        date: transaction.date,
        type: transaction.type,
        typeLabel: TransactionTypeLabels[transaction.type as TransactionType] || transaction.type,
        amount: transaction.amount,
        currency: transaction.currency,
        sourceAccount: transaction.sourceAccount,
        destinationAccount: transaction.destinationAccount,
        description: transaction.description,
        notes: transaction.notes,
        exchangeRate: transaction.exchangeRate,
        fxFees: transaction.fxFees,
        // References detaillees
        payment: transaction.payment,
        expense: transaction.expense,
        distribution: transaction.distribution,
        mission: transaction.mission,
        paymentSchedule: transaction.paymentSchedule,
        student: transaction.student
          ? {
              id: transaction.student.id,
              name:
                transaction.student.user.firstName && transaction.student.user.lastName
                  ? `${transaction.student.user.firstName} ${transaction.student.user.lastName}`
                  : transaction.student.user.name,
              email: transaction.student.user.email,
            }
          : null,
        mentor: transaction.mentor
          ? {
              id: transaction.mentor.id,
              name:
                transaction.mentor.user.firstName && transaction.mentor.user.lastName
                  ? `${transaction.mentor.user.firstName} ${transaction.mentor.user.lastName}`
                  : transaction.mentor.user.name,
              email: transaction.mentor.user.email,
            }
          : null,
        professor: transaction.professor
          ? {
              id: transaction.professor.id,
              name:
                transaction.professor.user.firstName && transaction.professor.user.lastName
                  ? `${transaction.professor.user.firstName} ${transaction.professor.user.lastName}`
                  : transaction.professor.user.name,
              email: transaction.professor.user.email,
            }
          : null,
        linkedTransaction: transaction.linkedTransaction,
        fxPairTransaction: transaction.fxPairTransaction,
        creator: {
          name:
            transaction.creator.firstName && transaction.creator.lastName
              ? `${transaction.creator.firstName} ${transaction.creator.lastName}`
              : transaction.creator.name,
          email: transaction.creator.email,
        },
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching transaction:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation de la transaction" },
      { status: 500 }
    );
  }
}
