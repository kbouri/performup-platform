import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/profile/bank-accounts - Mes comptes bancaires
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const bankAccounts = await prisma.bankAccount.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
      },
      orderBy: [{ currency: "asc" }, { accountName: "asc" }],
    });

    return NextResponse.json({
      accounts: bankAccounts.map((account) => ({
        id: account.id,
        accountName: account.accountName,
        accountType: account.accountType,
        bankName: account.bankName,
        currency: account.currency,
        country: account.country,
        iban: account.iban ? maskIban(account.iban) : null,
        isActive: account.isActive,
        createdAt: account.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching user bank accounts:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation de vos comptes bancaires" },
      { status: 500 }
    );
  }
}

// POST /api/profile/bank-accounts - Ajouter un compte bancaire
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    // Verifier que l'utilisateur a un role qui peut avoir des comptes bancaires
    const allowedRoles = ["STUDENT", "MENTOR", "PROFESSOR"];
    const userRole = session.user.role || "";
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { error: "Votre role ne permet pas d'ajouter des comptes bancaires" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { accountType, bankName, accountName, currency, country, iban } = body;

    // Validations
    if (!accountType || !accountName || !currency) {
      return NextResponse.json(
        { error: "Champs requis: accountType, accountName, currency" },
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

    // Limiter le nombre de comptes par utilisateur
    const existingCount = await prisma.bankAccount.count({
      where: { userId: session.user.id },
    });

    if (existingCount >= 10) {
      return NextResponse.json(
        { error: "Nombre maximum de comptes atteint (10)" },
        { status: 400 }
      );
    }

    // Verifier unicite du nom de compte
    const existingAccount = await prisma.bankAccount.findFirst({
      where: {
        userId: session.user.id,
        accountName,
      },
    });

    if (existingAccount) {
      return NextResponse.json(
        { error: "Un compte avec ce nom existe deja" },
        { status: 400 }
      );
    }

    const bankAccount = await prisma.bankAccount.create({
      data: {
        userId: session.user.id,
        accountType,
        bankName: bankName || null,
        accountName,
        currency,
        country: country || null,
        iban: iban || null,
        isActive: true,
        isAdminOwned: false,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE_OWN_BANK_ACCOUNT",
        resourceType: "BankAccount",
        resourceId: bankAccount.id,
        metadata: {
          accountName,
          currency,
          accountType,
        },
      },
    });

    return NextResponse.json(
      {
        account: {
          id: bankAccount.id,
          accountName: bankAccount.accountName,
          accountType: bankAccount.accountType,
          bankName: bankAccount.bankName,
          currency: bankAccount.currency,
          country: bankAccount.country,
          iban: bankAccount.iban ? maskIban(bankAccount.iban) : null,
          isActive: bankAccount.isActive,
          createdAt: bankAccount.createdAt,
        },
        message: "Compte bancaire ajoute avec succes",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating user bank account:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'ajout du compte bancaire" },
      { status: 500 }
    );
  }
}

// Masquer l'IBAN pour la securite (afficher seulement les 4 derniers caracteres)
function maskIban(iban: string): string {
  if (iban.length <= 4) return iban;
  return "*".repeat(iban.length - 4) + iban.slice(-4);
}
