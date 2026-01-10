import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/admin/accounting/forecast - Previsions revenus et depenses
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
    const months = parseInt(searchParams.get("months") || "6");

    const today = new Date();
    const endDate = new Date(today);
    endDate.setMonth(endDate.getMonth() + months);

    // ===== PREVISION REVENUS =====

    // Echeances non payees (revenus attendus des etudiants)
    const pendingSchedules = await prisma.paymentSchedule.findMany({
      where: {
        status: { in: ["PENDING", "PARTIALLY_PAID"] },
        dueDate: { lte: endDate },
      },
      include: {
        quote: {
          include: {
            student: {
              include: {
                user: {
                  select: { firstName: true, lastName: true },
                },
              },
            },
          },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    // Calculer revenus attendus par mois et devise
    const revenueByMonthCurrency: Record<string, Record<string, number>> = {};
    const revenueDetails: Array<{
      id: string;
      student: string;
      amount: number;
      remainingAmount: number;
      currency: string;
      dueDate: string;
      status: string;
    }> = [];

    for (const schedule of pendingSchedules) {
      const monthKey = `${schedule.dueDate.getFullYear()}-${String(schedule.dueDate.getMonth() + 1).padStart(2, "0")}`;
      const currency = schedule.currency || "EUR";
      const remainingAmount = schedule.amount - (schedule.paidAmount || 0);

      if (!revenueByMonthCurrency[monthKey]) {
        revenueByMonthCurrency[monthKey] = {};
      }
      if (!revenueByMonthCurrency[monthKey][currency]) {
        revenueByMonthCurrency[monthKey][currency] = 0;
      }
      revenueByMonthCurrency[monthKey][currency] += remainingAmount;

      const studentName = schedule.quote?.student?.user
        ? `${schedule.quote.student.user.firstName || ""} ${schedule.quote.student.user.lastName || ""}`.trim()
        : "Etudiant inconnu";

      revenueDetails.push({
        id: schedule.id,
        student: studentName,
        amount: schedule.amount,
        remainingAmount,
        currency,
        dueDate: schedule.dueDate.toISOString(),
        status: schedule.status,
      });
    }

    // ===== PREVISION DEPENSES =====

    // Missions non payees
    const pendingMissions = await prisma.mission.findMany({
      where: {
        status: { in: ["PENDING", "VALIDATED"] },
      },
      include: {
        mentor: {
          select: { user: { select: { firstName: true, lastName: true } } },
        },
        professor: {
          select: { user: { select: { firstName: true, lastName: true } } },
        },
      },
      orderBy: { date: "asc" },
    });

    // Charges recurrentes actives
    const recurringExpenses = await prisma.recurringExpense.findMany({
      where: { isActive: true },
    });

    // Calculer depenses prevues par mois et devise
    const expensesByMonthCurrency: Record<string, Record<string, number>> = {};
    const expenseDetails: Array<{
      id: string;
      type: "mission" | "recurring";
      name: string;
      amount: number;
      currency: string;
      dueDate: string;
    }> = [];

    // Ajouter missions non payees
    for (const mission of pendingMissions) {
      const monthKey = `${mission.date.getFullYear()}-${String(mission.date.getMonth() + 1).padStart(2, "0")}`;
      const currency = mission.currency;

      if (!expensesByMonthCurrency[monthKey]) {
        expensesByMonthCurrency[monthKey] = {};
      }
      if (!expensesByMonthCurrency[monthKey][currency]) {
        expensesByMonthCurrency[monthKey][currency] = 0;
      }
      expensesByMonthCurrency[monthKey][currency] += mission.amount;

      const personName = mission.mentor?.user
        ? `${mission.mentor.user.firstName || ""} ${mission.mentor.user.lastName || ""}`.trim()
        : mission.professor?.user
        ? `${mission.professor.user.firstName || ""} ${mission.professor.user.lastName || ""}`.trim()
        : "Inconnu";

      expenseDetails.push({
        id: mission.id,
        type: "mission",
        name: `${mission.title} - ${personName}`,
        amount: mission.amount,
        currency,
        dueDate: mission.date.toISOString(),
      });
    }

    // Projeter charges recurrentes sur les prochains mois
    for (const recurring of recurringExpenses) {
      let nextDate = new Date(recurring.nextDueDate);

      while (nextDate <= endDate) {
        const monthKey = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`;
        const currency = recurring.currency;

        if (!expensesByMonthCurrency[monthKey]) {
          expensesByMonthCurrency[monthKey] = {};
        }
        if (!expensesByMonthCurrency[monthKey][currency]) {
          expensesByMonthCurrency[monthKey][currency] = 0;
        }
        expensesByMonthCurrency[monthKey][currency] += recurring.amount;

        expenseDetails.push({
          id: `${recurring.id}-${monthKey}`,
          type: "recurring",
          name: recurring.name,
          amount: recurring.amount,
          currency,
          dueDate: nextDate.toISOString(),
        });

        // Avancer a la prochaine date selon la frequence
        const newDate = new Date(nextDate);
        switch (recurring.frequency) {
          case "MONTHLY":
            newDate.setMonth(newDate.getMonth() + 1);
            break;
          case "QUARTERLY":
            newDate.setMonth(newDate.getMonth() + 3);
            break;
          case "YEARLY":
            newDate.setFullYear(newDate.getFullYear() + 1);
            break;
        }
        nextDate = newDate;
      }
    }

    // ===== PROJECTION CASHFLOW =====

    // Recuperer soldes actuels
    const accounts = await prisma.bankAccount.findMany({
      where: { isActive: true, isAdminOwned: true },
      include: {
        transactionsAsSource: { select: { amount: true } },
        transactionsAsDestination: { select: { amount: true } },
      },
    });

    const currentBalanceByCurrency: Record<string, number> = {};
    for (const account of accounts) {
      const totalOut = account.transactionsAsSource.reduce((s, t) => s + t.amount, 0);
      const totalIn = account.transactionsAsDestination.reduce((s, t) => s + t.amount, 0);
      const balance = totalIn - totalOut;

      if (!currentBalanceByCurrency[account.currency]) {
        currentBalanceByCurrency[account.currency] = 0;
      }
      currentBalanceByCurrency[account.currency] += balance;
    }

    // Generer projection mensuelle
    const projection: Array<{
      month: string;
      currency: string;
      openingBalance: number;
      expectedRevenue: number;
      expectedExpenses: number;
      netFlow: number;
      closingBalance: number;
    }> = [];

    const currencies = Array.from(new Set([
      ...Object.keys(currentBalanceByCurrency),
      ...Object.values(revenueByMonthCurrency).flatMap((m) => Object.keys(m)),
      ...Object.values(expensesByMonthCurrency).flatMap((m) => Object.keys(m)),
    ]));

    for (const currency of currencies) {
      let runningBalance = currentBalanceByCurrency[currency] || 0;

      // Generer pour chaque mois
      for (let i = 0; i < months; i++) {
        const date = new Date(today);
        date.setMonth(date.getMonth() + i);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

        const revenue = revenueByMonthCurrency[monthKey]?.[currency] || 0;
        const expenses = expensesByMonthCurrency[monthKey]?.[currency] || 0;
        const netFlow = revenue - expenses;

        projection.push({
          month: monthKey,
          currency,
          openingBalance: runningBalance,
          expectedRevenue: revenue,
          expectedExpenses: expenses,
          netFlow,
          closingBalance: runningBalance + netFlow,
        });

        runningBalance += netFlow;
      }
    }

    // Trier par mois puis devise
    projection.sort((a, b) => {
      if (a.month !== b.month) return a.month.localeCompare(b.month);
      return a.currency.localeCompare(b.currency);
    });

    // ===== TOTAUX =====

    const totalRevenueByCurrency: Record<string, number> = {};
    const totalExpensesByCurrency: Record<string, number> = {};

    for (const detail of revenueDetails) {
      if (!totalRevenueByCurrency[detail.currency]) {
        totalRevenueByCurrency[detail.currency] = 0;
      }
      totalRevenueByCurrency[detail.currency] += detail.remainingAmount;
    }

    for (const detail of expenseDetails) {
      if (!totalExpensesByCurrency[detail.currency]) {
        totalExpensesByCurrency[detail.currency] = 0;
      }
      totalExpensesByCurrency[detail.currency] += detail.amount;
    }

    return NextResponse.json({
      period: {
        from: today.toISOString(),
        to: endDate.toISOString(),
        months,
      },
      currentBalance: currentBalanceByCurrency,
      revenue: {
        byMonthCurrency: revenueByMonthCurrency,
        details: revenueDetails,
        totals: totalRevenueByCurrency,
        count: revenueDetails.length,
      },
      expenses: {
        byMonthCurrency: expensesByMonthCurrency,
        details: expenseDetails,
        totals: totalExpensesByCurrency,
        missionsCount: pendingMissions.length,
        recurringCount: recurringExpenses.length,
      },
      projection,
      summary: {
        currencies: Array.from(currencies),
      },
    });
  } catch (error) {
    console.error("Error fetching forecast:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation des previsions" },
      { status: 500 }
    );
  }
}
