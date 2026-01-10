import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";
import { validateAccountCurrency, type Currency } from "@/lib/accounting";

// GET /api/admin/accounting/recurring-expenses/[id] - Detail d'une charge recurrente
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

    const recurringExpense = await prisma.recurringExpense.findUnique({
      where: { id },
      include: {
        payingAccount: {
          select: { id: true, accountName: true, bankName: true, currency: true },
        },
        creator: {
          select: { name: true, firstName: true, lastName: true },
        },
      },
    });

    if (!recurringExpense) {
      return NextResponse.json(
        { error: "Charge recurrente non trouvee" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      recurringExpense: {
        id: recurringExpense.id,
        name: recurringExpense.name,
        supplier: recurringExpense.supplier,
        category: recurringExpense.category,
        amount: recurringExpense.amount,
        currency: recurringExpense.currency,
        frequency: recurringExpense.frequency,
        nextDueDate: recurringExpense.nextDueDate,
        lastPaidDate: recurringExpense.lastPaidDate,
        isActive: recurringExpense.isActive,
        notes: recurringExpense.notes,
        payingAccount: recurringExpense.payingAccount,
        creator:
          recurringExpense.creator.firstName && recurringExpense.creator.lastName
            ? `${recurringExpense.creator.firstName} ${recurringExpense.creator.lastName}`
            : recurringExpense.creator.name,
        createdAt: recurringExpense.createdAt,
        updatedAt: recurringExpense.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching recurring expense:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation de la charge recurrente" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/accounting/recurring-expenses/[id] - Modifier une charge recurrente
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

    const recurringExpense = await prisma.recurringExpense.findUnique({
      where: { id },
    });

    if (!recurringExpense) {
      return NextResponse.json(
        { error: "Charge recurrente non trouvee" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      name,
      supplier,
      category,
      amount,
      frequency,
      nextDueDate,
      payingAccountId,
      isActive,
      notes,
    } = body;

    // Valider frequence si modifiee
    if (frequency && !["MONTHLY", "QUARTERLY", "YEARLY"].includes(frequency)) {
      return NextResponse.json(
        { error: "Frequence invalide" },
        { status: 400 }
      );
    }

    // Valider la devise du compte si modifie
    if (payingAccountId && payingAccountId !== recurringExpense.payingAccountId) {
      const isValidAccount = await validateAccountCurrency(
        payingAccountId,
        recurringExpense.currency as Currency
      );
      if (!isValidAccount) {
        return NextResponse.json(
          { error: "La devise du compte ne correspond pas a la devise de la charge" },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.recurringExpense.update({
      where: { id },
      data: {
        name: name ?? recurringExpense.name,
        supplier: supplier !== undefined ? supplier : recurringExpense.supplier,
        category: category ?? recurringExpense.category,
        amount: amount ?? recurringExpense.amount,
        frequency: frequency ?? recurringExpense.frequency,
        nextDueDate: nextDueDate ? new Date(nextDueDate) : recurringExpense.nextDueDate,
        payingAccountId:
          payingAccountId !== undefined ? payingAccountId : recurringExpense.payingAccountId,
        isActive: isActive !== undefined ? isActive : recurringExpense.isActive,
        notes: notes !== undefined ? notes : recurringExpense.notes,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE_RECURRING_EXPENSE",
        resourceType: "RecurringExpense",
        resourceId: id,
        metadata: { changes: body },
      },
    });

    return NextResponse.json({
      recurringExpense: updated,
      message: "Charge recurrente mise a jour",
    });
  } catch (error) {
    console.error("Error updating recurring expense:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise a jour de la charge recurrente" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/accounting/recurring-expenses/[id] - Supprimer une charge recurrente
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

    const recurringExpense = await prisma.recurringExpense.findUnique({
      where: { id },
    });

    if (!recurringExpense) {
      return NextResponse.json(
        { error: "Charge recurrente non trouvee" },
        { status: 404 }
      );
    }

    await prisma.recurringExpense.delete({
      where: { id },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE_RECURRING_EXPENSE",
        resourceType: "RecurringExpense",
        resourceId: id,
        metadata: {
          name: recurringExpense.name,
          category: recurringExpense.category,
          amount: recurringExpense.amount,
        },
      },
    });

    return NextResponse.json({
      message: "Charge recurrente supprimee",
    });
  } catch (error) {
    console.error("Error deleting recurring expense:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la charge recurrente" },
      { status: 500 }
    );
  }
}
