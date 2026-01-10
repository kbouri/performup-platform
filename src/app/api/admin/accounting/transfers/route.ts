import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";
import {
  createTransaction,
  TransactionTypes,
  type Currency,
} from "@/lib/accounting";

// GET /api/admin/accounting/transfers - Liste des transferts
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

    const transfers = await prisma.transaction.findMany({
      where: {
        type: "TRANSFER",
      },
      orderBy: { date: "desc" },
      take: limit ? parseInt(limit) : 50,
      include: {
        sourceAccount: {
          select: { id: true, accountName: true, bankName: true, currency: true },
        },
        destinationAccount: {
          select: { id: true, accountName: true, bankName: true, currency: true },
        },
        creator: {
          select: { name: true, firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json({
      transfers: transfers.map((t) => ({
        id: t.id,
        transactionNumber: t.transactionNumber,
        date: t.date,
        amount: t.amount,
        currency: t.currency,
        sourceAccount: t.sourceAccount,
        destinationAccount: t.destinationAccount,
        description: t.description,
        notes: t.notes,
        creator:
          t.creator.firstName && t.creator.lastName
            ? `${t.creator.firstName} ${t.creator.lastName}`
            : t.creator.name,
        createdAt: t.createdAt,
      })),
      count: transfers.length,
    });
  } catch (error) {
    console.error("Error fetching transfers:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation des transferts" },
      { status: 500 }
    );
  }
}

// POST /api/admin/accounting/transfers - Creer un transfert entre comptes (meme devise)
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
      sourceAccountId,
      destinationAccountId,
      amount,
      date,
      description,
      notes,
    } = body;

    if (!sourceAccountId || !destinationAccountId || !amount) {
      return NextResponse.json(
        { error: "Compte source, compte destination et montant sont requis" },
        { status: 400 }
      );
    }

    if (sourceAccountId === destinationAccountId) {
      return NextResponse.json(
        { error: "Le compte source et destination doivent etre differents" },
        { status: 400 }
      );
    }

    // Verifier les comptes
    const [sourceAccount, destinationAccount] = await Promise.all([
      prisma.bankAccount.findUnique({
        where: { id: sourceAccountId },
        select: { id: true, accountName: true, currency: true, isActive: true },
      }),
      prisma.bankAccount.findUnique({
        where: { id: destinationAccountId },
        select: { id: true, accountName: true, currency: true, isActive: true },
      }),
    ]);

    if (!sourceAccount || !sourceAccount.isActive) {
      return NextResponse.json(
        { error: "Compte source invalide ou inactif" },
        { status: 400 }
      );
    }

    if (!destinationAccount || !destinationAccount.isActive) {
      return NextResponse.json(
        { error: "Compte destination invalide ou inactif" },
        { status: 400 }
      );
    }

    // Verifier que les devises sont identiques
    if (sourceAccount.currency !== destinationAccount.currency) {
      return NextResponse.json(
        {
          error: `Les devises doivent etre identiques pour un transfert. Utilisez l'endpoint FX pour un change de devise.`,
          sourceAccountCurrency: sourceAccount.currency,
          destinationAccountCurrency: destinationAccount.currency,
        },
        { status: 400 }
      );
    }

    const transferDate = date ? new Date(date) : new Date();
    const currency = sourceAccount.currency as Currency;

    // Creer la transaction de sortie (debit source)
    const outgoingTxn = await createTransaction({
      date: transferDate,
      type: TransactionTypes.TRANSFER,
      amount,
      currency,
      sourceAccountId,
      description:
        description ||
        `Transfert vers ${destinationAccount.accountName}`,
      notes,
      createdBy: session.user.id,
    });

    // Creer la transaction d'entree (credit destination)
    const incomingTxn = await createTransaction({
      date: transferDate,
      type: TransactionTypes.TRANSFER,
      amount,
      currency,
      destinationAccountId,
      linkedTransactionId: outgoingTxn.id,
      description:
        description ||
        `Transfert depuis ${sourceAccount.accountName}`,
      notes,
      createdBy: session.user.id,
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE_TRANSFER",
        resourceType: "Transaction",
        resourceId: outgoingTxn.id,
        metadata: {
          amount,
          currency,
          fromAccount: sourceAccount.accountName,
          toAccount: destinationAccount.accountName,
          outgoingTxn: outgoingTxn.transactionNumber,
          incomingTxn: incomingTxn.transactionNumber,
        },
      },
    });

    return NextResponse.json(
      {
        message: "Transfert effectue avec succes",
        transfer: {
          amount,
          currency,
          sourceAccount: {
            id: sourceAccount.id,
            name: sourceAccount.accountName,
          },
          destinationAccount: {
            id: destinationAccount.id,
            name: destinationAccount.accountName,
          },
          outgoingTransaction: {
            id: outgoingTxn.id,
            transactionNumber: outgoingTxn.transactionNumber,
          },
          incomingTransaction: {
            id: incomingTxn.id,
            transactionNumber: incomingTxn.transactionNumber,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating transfer:", error);
    return NextResponse.json(
      { error: "Erreur lors de la creation du transfert" },
      { status: 500 }
    );
  }
}
