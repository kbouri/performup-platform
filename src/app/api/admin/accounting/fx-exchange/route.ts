import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";
import {
  createFxExchangeTransactions,
  type Currency,
} from "@/lib/accounting";

// GET /api/admin/accounting/fx-exchange - Liste des operations de change
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
    const limit = searchParams.get("limit");

    // Recuperer les transactions de type FX_EXCHANGE qui ont un compte source
    // (ce sont les transactions de debit)
    const fxOperations = await prisma.transaction.findMany({
      where: {
        type: "FX_EXCHANGE",
        sourceAccountId: { not: null },
      },
      orderBy: { date: "desc" },
      take: limit ? parseInt(limit) : 50,
      include: {
        sourceAccount: {
          select: { id: true, accountName: true, bankName: true, currency: true },
        },
        linkedTransaction: {
          include: {
            destinationAccount: {
              select: { id: true, accountName: true, bankName: true, currency: true },
            },
          },
        },
        creator: {
          select: { name: true, firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json({
      fxOperations: fxOperations.map((t) => ({
        id: t.id,
        transactionNumber: t.transactionNumber,
        date: t.date,
        fromAmount: t.amount,
        fromCurrency: t.currency,
        fromAccount: t.sourceAccount,
        toAmount: t.linkedTransaction?.amount || 0,
        toCurrency: t.linkedTransaction?.currency || "",
        toAccount: t.linkedTransaction?.destinationAccount || null,
        exchangeRate: t.exchangeRate,
        fxFees: t.fxFees,
        description: t.description,
        notes: t.notes,
        creator:
          t.creator.firstName && t.creator.lastName
            ? `${t.creator.firstName} ${t.creator.lastName}`
            : t.creator.name,
        createdAt: t.createdAt,
      })),
      count: fxOperations.length,
    });
  } catch (error) {
    console.error("Error fetching FX operations:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation des operations de change" },
      { status: 500 }
    );
  }
}

// POST /api/admin/accounting/fx-exchange - Effectuer un change de devise
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
      fromAccountId,
      toAccountId,
      fromAmount,
      toAmount,
      exchangeRate,
      fxFees,
      date,
      description,
      notes,
    } = body;

    if (!fromAccountId || !toAccountId || !fromAmount || !toAmount) {
      return NextResponse.json(
        { error: "Comptes, montants source et destination sont requis" },
        { status: 400 }
      );
    }

    if (fromAccountId === toAccountId) {
      return NextResponse.json(
        { error: "Les comptes source et destination doivent etre differents" },
        { status: 400 }
      );
    }

    // Verifier les comptes
    const [fromAccount, toAccount] = await Promise.all([
      prisma.bankAccount.findUnique({
        where: { id: fromAccountId },
        select: { id: true, accountName: true, currency: true, isActive: true },
      }),
      prisma.bankAccount.findUnique({
        where: { id: toAccountId },
        select: { id: true, accountName: true, currency: true, isActive: true },
      }),
    ]);

    if (!fromAccount || !fromAccount.isActive) {
      return NextResponse.json(
        { error: "Compte source invalide ou inactif" },
        { status: 400 }
      );
    }

    if (!toAccount || !toAccount.isActive) {
      return NextResponse.json(
        { error: "Compte destination invalide ou inactif" },
        { status: 400 }
      );
    }

    // Verifier que les devises sont differentes
    if (fromAccount.currency === toAccount.currency) {
      return NextResponse.json(
        {
          error: "Pour un change de devise, les comptes doivent avoir des devises differentes. Utilisez l'endpoint transferts pour un transfert dans la meme devise.",
        },
        { status: 400 }
      );
    }

    // Calculer le taux de change implicite si non fourni
    const calculatedExchangeRate = exchangeRate || toAmount / fromAmount;

    const fxDate = date ? new Date(date) : new Date();

    // Creer les deux transactions liees
    const { fromTransaction, toTransaction } = await createFxExchangeTransactions({
      date: fxDate,
      fromAmount,
      fromCurrency: fromAccount.currency as Currency,
      fromAccountId,
      toAmount,
      toCurrency: toAccount.currency as Currency,
      toAccountId,
      exchangeRate: calculatedExchangeRate,
      fxFees: fxFees || undefined,
      description:
        description ||
        `Change ${fromAccount.currency} -> ${toAccount.currency}`,
      notes,
      createdBy: session.user.id,
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE_FX_EXCHANGE",
        resourceType: "Transaction",
        resourceId: fromTransaction,
        metadata: {
          fromAmount,
          fromCurrency: fromAccount.currency,
          fromAccount: fromAccount.accountName,
          toAmount,
          toCurrency: toAccount.currency,
          toAccount: toAccount.accountName,
          exchangeRate: calculatedExchangeRate,
          fxFees,
        },
      },
    });

    return NextResponse.json(
      {
        message: "Operation de change effectuee avec succes",
        fxExchange: {
          fromAmount,
          fromCurrency: fromAccount.currency,
          fromAccount: {
            id: fromAccount.id,
            name: fromAccount.accountName,
          },
          toAmount,
          toCurrency: toAccount.currency,
          toAccount: {
            id: toAccount.id,
            name: toAccount.accountName,
          },
          exchangeRate: calculatedExchangeRate,
          fxFees: fxFees || 0,
          fromTransaction,
          toTransaction,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating FX exchange:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'operation de change" },
      { status: 500 }
    );
  }
}
