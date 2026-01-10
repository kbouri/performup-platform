import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/admin/accounting/expenses/[id] - Detail d'une charge
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

    const expense = await prisma.expense.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            user: { select: { name: true, firstName: true, lastName: true } },
          },
        },
        payingAccount: {
          select: { id: true, accountName: true, bankName: true, currency: true },
        },
        transactions: {
          select: {
            id: true,
            transactionNumber: true,
            date: true,
            amount: true,
            currency: true,
          },
        },
      },
    });

    if (!expense) {
      return NextResponse.json(
        { error: "Charge non trouvee" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      expense: {
        id: expense.id,
        category: expense.category,
        customCategory: expense.customCategory,
        amount: expense.amount,
        currency: expense.currency,
        supplier: expense.supplier,
        description: expense.description,
        expenseDate: expense.expenseDate,
        isRecurring: expense.isRecurring,
        recurrenceRule: expense.recurrenceRule,
        student: expense.student
          ? {
              id: expense.student.id,
              name:
                expense.student.user.firstName && expense.student.user.lastName
                  ? `${expense.student.user.firstName} ${expense.student.user.lastName}`
                  : expense.student.user.name,
            }
          : null,
        payingAccount: expense.payingAccount,
        transactions: expense.transactions,
        createdAt: expense.createdAt,
      },
    });
  } catch (error) {
    console.error("Error fetching expense:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation de la charge" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/accounting/expenses/[id] - Modifier une charge
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

    const expense = await prisma.expense.findUnique({
      where: { id },
      include: { transactions: true },
    });

    if (!expense) {
      return NextResponse.json(
        { error: "Charge non trouvee" },
        { status: 404 }
      );
    }

    // Si une transaction existe, certaines modifications sont limitees
    const hasTransaction = expense.transactions.length > 0;

    const body = await request.json();
    const {
      category,
      customCategory,
      supplier,
      description,
      expenseDate,
    } = body;

    // Ne pas permettre de modifier amount/currency si transaction existe
    if (hasTransaction && (body.amount !== undefined || body.currency !== undefined)) {
      return NextResponse.json(
        { error: "Impossible de modifier le montant ou la devise d'une charge avec transaction" },
        { status: 400 }
      );
    }

    const updatedExpense = await prisma.expense.update({
      where: { id },
      data: {
        category: category ?? expense.category,
        customCategory: customCategory ?? expense.customCategory,
        supplier: supplier ?? expense.supplier,
        description: description ?? expense.description,
        expenseDate: expenseDate ? new Date(expenseDate) : expense.expenseDate,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE_EXPENSE",
        resourceType: "Expense",
        resourceId: id,
        metadata: { changes: body },
      },
    });

    return NextResponse.json({
      expense: updatedExpense,
      message: "Charge mise a jour",
    });
  } catch (error) {
    console.error("Error updating expense:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise a jour de la charge" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/accounting/expenses/[id] - Supprimer une charge
export async function DELETE(
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

    const expense = await prisma.expense.findUnique({
      where: { id },
      include: { transactions: true },
    });

    if (!expense) {
      return NextResponse.json(
        { error: "Charge non trouvee" },
        { status: 404 }
      );
    }

    // Ne pas permettre de supprimer si des transactions existent
    if (expense.transactions.length > 0) {
      return NextResponse.json(
        { error: "Impossible de supprimer une charge liee a des transactions. Annulez d'abord les transactions." },
        { status: 400 }
      );
    }

    await prisma.expense.delete({
      where: { id },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE_EXPENSE",
        resourceType: "Expense",
        resourceId: id,
        metadata: {
          category: expense.category,
          amount: expense.amount,
          currency: expense.currency,
        },
      },
    });

    return NextResponse.json({
      message: "Charge supprimee",
    });
  } catch (error) {
    console.error("Error deleting expense:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la charge" },
      { status: 500 }
    );
  }
}
