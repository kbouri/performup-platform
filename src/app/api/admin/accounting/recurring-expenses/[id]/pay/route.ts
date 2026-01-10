import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";
import {
  createTransaction,
  TransactionTypes,
  type Currency,
} from "@/lib/accounting";

// POST /api/admin/accounting/recurring-expenses/[id]/pay - Marquer comme paye
export async function POST(
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

    const recurringExpense = await prisma.recurringExpense.findUnique({
      where: { id },
      include: {
        payingAccount: true,
      },
    });

    if (!recurringExpense) {
      return NextResponse.json(
        { error: "Charge recurrente non trouvee" },
        { status: 404 }
      );
    }

    if (!recurringExpense.isActive) {
      return NextResponse.json(
        { error: "Cette charge recurrente est inactive" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { paymentDate, notes, payingAccountId } = body;

    const actualPaymentDate = paymentDate ? new Date(paymentDate) : new Date();
    const actualPayingAccountId = payingAccountId || recurringExpense.payingAccountId;

    if (!actualPayingAccountId) {
      return NextResponse.json(
        { error: "Un compte de paiement est requis" },
        { status: 400 }
      );
    }

    // Creer la charge effective
    const expense = await prisma.expense.create({
      data: {
        category: recurringExpense.category,
        amount: recurringExpense.amount,
        currency: recurringExpense.currency,
        supplier: recurringExpense.supplier,
        description: `${recurringExpense.name} - Paiement recurrent`,
        expenseDate: actualPaymentDate,
        isRecurring: true,
        payingAccountId: actualPayingAccountId,
      },
    });

    // Creer la transaction
    const transaction = await createTransaction({
      date: actualPaymentDate,
      type: TransactionTypes.EXPENSE,
      amount: recurringExpense.amount,
      currency: recurringExpense.currency as Currency,
      sourceAccountId: actualPayingAccountId,
      expenseId: expense.id,
      description: `Charge recurrente: ${recurringExpense.name}`,
      notes: notes || recurringExpense.notes || undefined,
      createdBy: session.user.id,
    });

    // Calculer la prochaine date d'echeance
    const nextDueDate = new Date(recurringExpense.nextDueDate);
    switch (recurringExpense.frequency) {
      case "MONTHLY":
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        break;
      case "QUARTERLY":
        nextDueDate.setMonth(nextDueDate.getMonth() + 3);
        break;
      case "YEARLY":
        nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
        break;
    }

    // Mettre a jour la charge recurrente
    await prisma.recurringExpense.update({
      where: { id },
      data: {
        lastPaidDate: actualPaymentDate,
        nextDueDate,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "PAY_RECURRING_EXPENSE",
        resourceType: "RecurringExpense",
        resourceId: id,
        metadata: {
          expenseId: expense.id,
          transactionNumber: transaction.transactionNumber,
          amount: recurringExpense.amount,
          currency: recurringExpense.currency,
          nextDueDate: nextDueDate.toISOString(),
        },
      },
    });

    return NextResponse.json({
      message: "Paiement enregistre avec succes",
      expense: {
        id: expense.id,
        amount: expense.amount,
        currency: expense.currency,
      },
      transaction: {
        id: transaction.id,
        transactionNumber: transaction.transactionNumber,
      },
      nextDueDate,
    });
  } catch (error) {
    console.error("Error paying recurring expense:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement du paiement" },
      { status: 500 }
    );
  }
}
