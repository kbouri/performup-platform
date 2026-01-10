import { NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/admin/accounting/cashflow - Tresorerie actuelle par compte et devise
export async function GET() {
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

    // Recuperer tous les comptes actifs avec leurs transactions
    const accounts = await prisma.bankAccount.findMany({
      where: { isActive: true },
      include: {
        user: {
          select: { name: true, firstName: true, lastName: true },
        },
        transactionsAsSource: {
          select: { amount: true, currency: true },
        },
        transactionsAsDestination: {
          select: { amount: true, currency: true },
        },
      },
      orderBy: [{ currency: "asc" }, { accountName: "asc" }],
    });

    // Calculer le solde de chaque compte
    const accountsWithBalances = accounts.map((account) => {
      const totalOut = account.transactionsAsSource.reduce(
        (sum, t) => sum + t.amount,
        0
      );
      const totalIn = account.transactionsAsDestination.reduce(
        (sum, t) => sum + t.amount,
        0
      );
      const balance = totalIn - totalOut;

      const ownerName =
        account.user.firstName && account.user.lastName
          ? `${account.user.firstName} ${account.user.lastName}`
          : account.user.name;

      return {
        id: account.id,
        accountName: account.accountName,
        bankName: account.bankName,
        currency: account.currency,
        accountType: account.accountType,
        country: account.country,
        isAdminOwned: account.isAdminOwned,
        owner: ownerName,
        balance,
        totalIn,
        totalOut,
      };
    });

    // Totaux par devise
    const totalsByCurrency: Record<string, { balance: number; totalIn: number; totalOut: number }> = {};
    for (const account of accountsWithBalances) {
      if (!totalsByCurrency[account.currency]) {
        totalsByCurrency[account.currency] = { balance: 0, totalIn: 0, totalOut: 0 };
      }
      totalsByCurrency[account.currency].balance += account.balance;
      totalsByCurrency[account.currency].totalIn += account.totalIn;
      totalsByCurrency[account.currency].totalOut += account.totalOut;
    }

    // Grouper par devise
    const accountsByCurrency: Record<string, typeof accountsWithBalances> = {};
    for (const account of accountsWithBalances) {
      if (!accountsByCurrency[account.currency]) {
        accountsByCurrency[account.currency] = [];
      }
      accountsByCurrency[account.currency].push(account);
    }

    // Comptes admin vs non-admin
    const adminAccounts = accountsWithBalances.filter((a) => a.isAdminOwned);
    const otherAccounts = accountsWithBalances.filter((a) => !a.isAdminOwned);

    // Totaux admin seulement
    const adminTotalsByCurrency: Record<string, number> = {};
    for (const account of adminAccounts) {
      if (!adminTotalsByCurrency[account.currency]) {
        adminTotalsByCurrency[account.currency] = 0;
      }
      adminTotalsByCurrency[account.currency] += account.balance;
    }

    return NextResponse.json({
      accounts: accountsWithBalances,
      accountsByCurrency,
      totalsByCurrency,
      adminAccounts,
      otherAccounts,
      adminTotalsByCurrency,
      summary: {
        totalAccounts: accounts.length,
        adminAccountsCount: adminAccounts.length,
        currencies: Object.keys(totalsByCurrency),
      },
    });
  } catch (error) {
    console.error("Error fetching cashflow:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation de la tresorerie" },
      { status: 500 }
    );
  }
}
