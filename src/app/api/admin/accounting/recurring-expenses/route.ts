import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";
import { validateAccountCurrency, type Currency } from "@/lib/accounting";

// GET /api/admin/accounting/recurring-expenses - Liste des charges recurrentes
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
    const isActive = searchParams.get("isActive");

    const where: Record<string, unknown> = {};

    if (category && category !== "all") {
      where.category = category;
    }

    if (isActive !== null && isActive !== "all") {
      where.isActive = isActive === "true";
    }

    const recurringExpenses = await prisma.recurringExpense.findMany({
      where,
      orderBy: { nextDueDate: "asc" },
      include: {
        payingAccount: {
          select: { id: true, accountName: true, bankName: true, currency: true },
        },
        creator: {
          select: { name: true, firstName: true, lastName: true },
        },
      },
    });

    // Calculer les totaux mensuels par devise
    const monthlyTotalsByCurrency: Record<string, number> = {};
    for (const re of recurringExpenses.filter((r) => r.isActive)) {
      let monthlyAmount = re.amount;
      if (re.frequency === "QUARTERLY") {
        monthlyAmount = re.amount / 3;
      } else if (re.frequency === "YEARLY") {
        monthlyAmount = re.amount / 12;
      }
      monthlyTotalsByCurrency[re.currency] =
        (monthlyTotalsByCurrency[re.currency] || 0) + monthlyAmount;
    }

    // Charges dues ce mois
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const dueThisMonth = recurringExpenses.filter(
      (re) =>
        re.isActive &&
        re.nextDueDate >= startOfMonth &&
        re.nextDueDate <= endOfMonth
    );

    return NextResponse.json({
      recurringExpenses: recurringExpenses.map((re) => ({
        id: re.id,
        name: re.name,
        supplier: re.supplier,
        category: re.category,
        amount: re.amount,
        currency: re.currency,
        frequency: re.frequency,
        nextDueDate: re.nextDueDate,
        lastPaidDate: re.lastPaidDate,
        isActive: re.isActive,
        notes: re.notes,
        payingAccount: re.payingAccount,
        creator:
          re.creator.firstName && re.creator.lastName
            ? `${re.creator.firstName} ${re.creator.lastName}`
            : re.creator.name,
        createdAt: re.createdAt,
      })),
      summary: {
        totalCount: recurringExpenses.length,
        activeCount: recurringExpenses.filter((r) => r.isActive).length,
        monthlyTotalsByCurrency,
        dueThisMonth: dueThisMonth.length,
        dueThisMonthTotal: dueThisMonth.reduce(
          (acc, re) => {
            acc[re.currency] = (acc[re.currency] || 0) + re.amount;
            return acc;
          },
          {} as Record<string, number>
        ),
      },
    });
  } catch (error) {
    console.error("Error fetching recurring expenses:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation des charges recurrentes" },
      { status: 500 }
    );
  }
}

// POST /api/admin/accounting/recurring-expenses - Creer une charge recurrente
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
      name,
      supplier,
      category,
      amount,
      currency = "EUR",
      frequency,
      nextDueDate,
      payingAccountId,
      notes,
    } = body;

    if (!name || !category || !amount || !frequency || !nextDueDate) {
      return NextResponse.json(
        { error: "Nom, categorie, montant, frequence et date sont requis" },
        { status: 400 }
      );
    }

    // Valider frequence
    if (!["MONTHLY", "QUARTERLY", "YEARLY"].includes(frequency)) {
      return NextResponse.json(
        { error: "Frequence invalide. Utilisez MONTHLY, QUARTERLY ou YEARLY" },
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

    const recurringExpense = await prisma.recurringExpense.create({
      data: {
        name,
        supplier,
        category,
        amount,
        currency,
        frequency,
        nextDueDate: new Date(nextDueDate),
        payingAccountId: payingAccountId || null,
        notes,
        createdBy: session.user.id,
      },
      include: {
        payingAccount: {
          select: { accountName: true },
        },
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE_RECURRING_EXPENSE",
        resourceType: "RecurringExpense",
        resourceId: recurringExpense.id,
        metadata: {
          name,
          category,
          amount,
          currency,
          frequency,
        },
      },
    });

    return NextResponse.json(
      {
        recurringExpense,
        message: "Charge recurrente creee avec succes",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating recurring expense:", error);
    return NextResponse.json(
      { error: "Erreur lors de la creation de la charge recurrente" },
      { status: 500 }
    );
  }
}
