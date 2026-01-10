import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";
import {
  createTransaction,
  TransactionTypes,
  validateAccountCurrency,
  type Currency,
} from "@/lib/accounting";

// GET /api/admin/accounting/expenses - Liste des charges
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
    const category = searchParams.get("category");
    const currency = searchParams.get("currency");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = searchParams.get("limit");

    const where: Record<string, unknown> = {};

    if (category && category !== "all") {
      where.category = category;
    }

    if (currency && currency !== "all") {
      where.currency = currency;
    }

    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) {
        (where.expenseDate as Record<string, unknown>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.expenseDate as Record<string, unknown>).lte = new Date(endDate);
      }
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { expenseDate: "desc" },
      take: limit ? parseInt(limit) : undefined,
      include: {
        student: {
          include: {
            user: {
              select: { name: true, firstName: true, lastName: true },
            },
          },
        },
        payingAccount: {
          select: { id: true, accountName: true, bankName: true, currency: true },
        },
        transactions: {
          select: { id: true, transactionNumber: true },
        },
      },
    });

    // Calculer les totaux par devise
    const totalsByCurrency: Record<string, number> = {};
    for (const e of expenses) {
      totalsByCurrency[e.currency] = (totalsByCurrency[e.currency] || 0) + e.amount;
    }

    // Grouper par categorie
    const byCategory = expenses.reduce(
      (acc, e) => ({
        ...acc,
        [e.category]: (acc[e.category] || 0) + e.amount,
      }),
      {} as Record<string, number>
    );

    return NextResponse.json({
      expenses: expenses.map((e) => ({
        id: e.id,
        category: e.category,
        customCategory: e.customCategory,
        amount: e.amount,
        currency: e.currency,
        supplier: e.supplier,
        description: e.description,
        expenseDate: e.expenseDate,
        isRecurring: e.isRecurring,
        recurrenceRule: e.recurrenceRule,
        student: e.student
          ? {
              id: e.student.id,
              name:
                e.student.user.firstName && e.student.user.lastName
                  ? `${e.student.user.firstName} ${e.student.user.lastName}`
                  : e.student.user.name,
            }
          : null,
        payingAccount: e.payingAccount,
        hasTransaction: e.transactions.length > 0,
        createdAt: e.createdAt,
      })),
      summary: {
        totalsByCurrency,
        byCategory,
        count: expenses.length,
      },
    });
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation des charges" },
      { status: 500 }
    );
  }
}

// POST /api/admin/accounting/expenses - Creer une charge
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
      category,
      customCategory,
      amount,
      currency = "EUR",
      supplier,
      description,
      expenseDate,
      isRecurring,
      recurrenceRule,
      studentId,
      payingAccountId,
      createTransactionEntry = true,
    } = body;

    if (!category || !amount || !expenseDate) {
      return NextResponse.json(
        { error: "Categorie, montant et date sont requis" },
        { status: 400 }
      );
    }

    // Valider la devise du compte si specifie
    if (payingAccountId) {
      const isValidAccount = await validateAccountCurrency(
        payingAccountId,
        currency as Currency
      );
      if (!isValidAccount) {
        return NextResponse.json(
          { error: "La devise du compte ne correspond pas a la devise de la charge" },
          { status: 400 }
        );
      }
    }

    // Creer la charge
    const expense = await prisma.expense.create({
      data: {
        category,
        customCategory,
        amount,
        currency,
        supplier,
        description,
        expenseDate: new Date(expenseDate),
        isRecurring: isRecurring || false,
        recurrenceRule,
        studentId: studentId || null,
        payingAccountId: payingAccountId || null,
      },
      include: {
        payingAccount: {
          select: { accountName: true },
        },
      },
    });

    // Creer l'entree dans le journal si demande
    let transaction = null;
    if (createTransactionEntry && payingAccountId) {
      transaction = await createTransaction({
        date: new Date(expenseDate),
        type: TransactionTypes.EXPENSE,
        amount,
        currency: currency as Currency,
        sourceAccountId: payingAccountId,
        expenseId: expense.id,
        studentId: studentId || undefined,
        description: supplier
          ? `Charge ${category} - ${supplier}`
          : `Charge ${category}`,
        notes: description,
        createdBy: session.user.id,
      });
    }

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE_EXPENSE",
        resourceType: "Expense",
        resourceId: expense.id,
        metadata: {
          category,
          amount,
          currency,
          supplier,
        },
      },
    });

    return NextResponse.json(
      {
        expense: {
          ...expense,
          transaction: transaction
            ? { id: transaction.id, transactionNumber: transaction.transactionNumber }
            : null,
        },
        message: "Charge creee avec succes",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating expense:", error);
    return NextResponse.json(
      { error: "Erreur lors de la creation de la charge" },
      { status: 500 }
    );
  }
}
