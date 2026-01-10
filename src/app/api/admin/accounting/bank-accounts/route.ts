import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/admin/accounting/bank-accounts - Liste tous les comptes bancaires
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
    const currency = searchParams.get("currency");
    const accountType = searchParams.get("accountType");
    const isActive = searchParams.get("isActive");
    const isAdminOwned = searchParams.get("isAdminOwned");
    const userId = searchParams.get("userId");

    const where: Record<string, unknown> = {};

    if (currency) {
      where.currency = currency;
    }

    if (accountType) {
      where.accountType = accountType;
    }

    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    if (isAdminOwned !== null && isAdminOwned !== undefined) {
      where.isAdminOwned = isAdminOwned === "true";
    }

    if (userId) {
      where.userId = userId;
    }

    const bankAccounts = await prisma.bankAccount.findMany({
      where,
      orderBy: [
        { isAdminOwned: "desc" },
        { currency: "asc" },
        { accountName: "asc" },
      ],
      include: {
        user: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        _count: {
          select: {
            transactionsAsSource: true,
            transactionsAsDestination: true,
            paymentsReceived: true,
            expensesPaid: true,
          },
        },
      },
    });

    // Calculer les soldes pour chaque compte
    const accountsWithBalance = await Promise.all(
      bankAccounts.map(async (account) => {
        // Entrees (destination)
        const incomingSum = await prisma.transaction.aggregate({
          where: { destinationAccountId: account.id },
          _sum: { amount: true },
        });

        // Sorties (source)
        const outgoingSum = await prisma.transaction.aggregate({
          where: { sourceAccountId: account.id },
          _sum: { amount: true },
        });

        const balance =
          (incomingSum._sum.amount || 0) - (outgoingSum._sum.amount || 0);

        return {
          id: account.id,
          accountName: account.accountName,
          accountType: account.accountType,
          bankName: account.bankName,
          currency: account.currency,
          country: account.country,
          iban: account.iban,
          isActive: account.isActive,
          isAdminOwned: account.isAdminOwned,
          createdAt: account.createdAt,
          updatedAt: account.updatedAt,
          user: {
            id: account.user.id,
            name:
              account.user.firstName && account.user.lastName
                ? `${account.user.firstName} ${account.user.lastName}`
                : account.user.name,
            email: account.user.email,
            role: account.user.role,
          },
          balance,
          transactionCount:
            account._count.transactionsAsSource +
            account._count.transactionsAsDestination,
        };
      })
    );

    // Grouper par devise
    const byCurrency: Record<string, typeof accountsWithBalance> = {};
    for (const account of accountsWithBalance) {
      if (!byCurrency[account.currency]) {
        byCurrency[account.currency] = [];
      }
      byCurrency[account.currency].push(account);
    }

    // Calculer totaux par devise
    const totals: Record<string, number> = {};
    for (const [cur, accounts] of Object.entries(byCurrency)) {
      totals[cur] = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    }

    return NextResponse.json({
      accounts: accountsWithBalance,
      byCurrency,
      totals,
      summary: {
        totalAccounts: bankAccounts.length,
        activeAccounts: bankAccounts.filter((a) => a.isActive).length,
        adminAccounts: bankAccounts.filter((a) => a.isAdminOwned).length,
        userAccounts: bankAccounts.filter((a) => !a.isAdminOwned).length,
      },
    });
  } catch (error) {
    console.error("Error fetching bank accounts:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation des comptes bancaires" },
      { status: 500 }
    );
  }
}

// POST /api/admin/accounting/bank-accounts - Creer un compte bancaire
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
      userId,
      accountType,
      bankName,
      accountName,
      currency,
      country,
      iban,
      isAdminOwned,
    } = body;

    // Validations
    if (!userId || !accountType || !accountName || !currency) {
      return NextResponse.json(
        {
          error:
            "Champs requis: userId, accountType, accountName, currency",
        },
        { status: 400 }
      );
    }

    if (!["BANK", "CASH"].includes(accountType)) {
      return NextResponse.json(
        { error: "accountType doit etre BANK ou CASH" },
        { status: 400 }
      );
    }

    if (!["EUR", "MAD", "USD"].includes(currency)) {
      return NextResponse.json(
        { error: "currency doit etre EUR, MAD ou USD" },
        { status: 400 }
      );
    }

    // Verifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouve" },
        { status: 404 }
      );
    }

    // Verifier unicite du nom de compte pour cet utilisateur
    const existingAccount = await prisma.bankAccount.findFirst({
      where: {
        userId,
        accountName,
      },
    });

    if (existingAccount) {
      return NextResponse.json(
        { error: "Un compte avec ce nom existe deja pour cet utilisateur" },
        { status: 400 }
      );
    }

    const bankAccount = await prisma.bankAccount.create({
      data: {
        userId,
        accountType,
        bankName: bankName || null,
        accountName,
        currency,
        country: country || null,
        iban: iban || null,
        isActive: true,
        isAdminOwned: isAdminOwned || false,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE_BANK_ACCOUNT",
        resourceType: "BankAccount",
        resourceId: bankAccount.id,
        metadata: {
          accountName,
          currency,
          accountType,
          ownerId: userId,
        },
      },
    });

    return NextResponse.json(
      {
        account: {
          ...bankAccount,
          user: {
            id: bankAccount.user.id,
            name:
              bankAccount.user.firstName && bankAccount.user.lastName
                ? `${bankAccount.user.firstName} ${bankAccount.user.lastName}`
                : bankAccount.user.name,
            email: bankAccount.user.email,
            role: bankAccount.user.role,
          },
          balance: 0,
          transactionCount: 0,
        },
        message: "Compte bancaire cree avec succes",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating bank account:", error);
    return NextResponse.json(
      { error: "Erreur lors de la creation du compte bancaire" },
      { status: 500 }
    );
  }
}
