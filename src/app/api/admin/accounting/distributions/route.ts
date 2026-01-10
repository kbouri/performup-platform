import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";
import {
  createTransaction,
  TransactionTypes,
  type Currency,
} from "@/lib/accounting";

// GET /api/admin/accounting/distributions - Liste des distributions
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
    const currency = searchParams.get("currency");

    const where: Record<string, unknown> = {};
    if (currency && currency !== "all") {
      where.currency = currency;
    }

    const distributions = await prisma.distribution.findMany({
      where,
      orderBy: { distributionDate: "desc" },
      take: limit ? parseInt(limit) : 50,
      include: {
        distributions: {
          include: {
            founder: {
              select: { id: true, name: true, firstName: true, lastName: true },
            },
          },
        },
        transactions: {
          select: { id: true, transactionNumber: true },
        },
      },
    });

    // Calculer les totaux par devise
    const totalsByCurrency: Record<string, { distributed: number; invested: number }> = {};
    for (const d of distributions) {
      if (!totalsByCurrency[d.currency]) {
        totalsByCurrency[d.currency] = { distributed: 0, invested: 0 };
      }
      totalsByCurrency[d.currency].distributed += d.distributedAmount;
      totalsByCurrency[d.currency].invested += d.investmentAmount;
    }

    return NextResponse.json({
      distributions: distributions.map((d) => ({
        id: d.id,
        totalAmount: d.totalAmount,
        currency: d.currency,
        investmentAmount: d.investmentAmount,
        distributedAmount: d.distributedAmount,
        distributionDate: d.distributionDate,
        notes: d.notes,
        founderDistributions: d.distributions.map((fd) => ({
          id: fd.id,
          founder:
            fd.founder.firstName && fd.founder.lastName
              ? `${fd.founder.firstName} ${fd.founder.lastName}`
              : fd.founder.name,
          founderId: fd.founderId,
          amount: fd.amount,
          percentage: fd.percentage,
        })),
        hasTransactions: d.transactions.length > 0,
        createdAt: d.createdAt,
      })),
      summary: {
        count: distributions.length,
        totalsByCurrency,
      },
    });
  } catch (error) {
    console.error("Error fetching distributions:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation des distributions" },
      { status: 500 }
    );
  }
}

// POST /api/admin/accounting/distributions - Creer une distribution
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
      totalAmount,
      currency = "EUR",
      investmentAmount = 0,
      distributionDate,
      notes,
      founders, // Array of { founderId, percentage }
      sourceAccountId,
      updatePositions = true,
    } = body;

    if (!totalAmount || !distributionDate || !founders || founders.length === 0) {
      return NextResponse.json(
        { error: "Montant total, date et fondateurs sont requis" },
        { status: 400 }
      );
    }

    // Valider que les pourcentages totalisent 100%
    const totalPercentage = founders.reduce(
      (acc: number, f: { percentage: number }) => acc + f.percentage,
      0
    );
    if (Math.abs(totalPercentage - 100) > 0.01) {
      return NextResponse.json(
        { error: "Les pourcentages doivent totaliser 100%" },
        { status: 400 }
      );
    }

    const distributedAmount = totalAmount - investmentAmount;

    // Verifier que tous les fondateurs existent et sont admins
    const founderIds = founders.map((f: { founderId: string }) => f.founderId);
    const validFounders = await prisma.user.findMany({
      where: { id: { in: founderIds }, role: "ADMIN" },
      select: { id: true, name: true, firstName: true, lastName: true },
    });

    if (validFounders.length !== founderIds.length) {
      return NextResponse.json(
        { error: "Un ou plusieurs fondateurs sont invalides" },
        { status: 400 }
      );
    }

    // Calculer les montants pour chaque fondateur
    const founderDistributions = founders.map((f: { founderId: string; percentage: number }) => ({
      founderId: f.founderId,
      amount: Math.round((distributedAmount * f.percentage) / 100),
      percentage: f.percentage,
    }));

    // Creer la distribution
    const distribution = await prisma.distribution.create({
      data: {
        totalAmount,
        currency,
        investmentAmount,
        distributedAmount,
        distributionDate: new Date(distributionDate),
        notes,
        distributions: {
          create: founderDistributions,
        },
      },
      include: {
        distributions: {
          include: {
            founder: {
              select: { id: true, name: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    // Creer la transaction si un compte source est specifie
    let transaction = null;
    if (sourceAccountId) {
      transaction = await createTransaction({
        date: new Date(distributionDate),
        type: TransactionTypes.DISTRIBUTION,
        amount: distributedAmount,
        currency: currency as Currency,
        sourceAccountId,
        distributionId: distribution.id,
        description: `Distribution aux fondateurs`,
        notes,
        createdBy: session.user.id,
      });
    }

    // Mettre a jour les positions des admins si demande
    if (updatePositions) {
      for (const fd of founderDistributions) {
        await prisma.adminPosition.upsert({
          where: {
            adminId_currency: {
              adminId: fd.founderId,
              currency,
            },
          },
          update: {
            received: { increment: fd.amount },
            asOfDate: new Date(),
          },
          create: {
            adminId: fd.founderId,
            currency,
            advanced: 0,
            received: fd.amount,
          },
        });
      }
    }

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE_DISTRIBUTION",
        resourceType: "Distribution",
        resourceId: distribution.id,
        metadata: {
          totalAmount,
          currency,
          investmentAmount,
          distributedAmount,
          founderCount: founders.length,
          positionsUpdated: updatePositions,
        },
      },
    });

    return NextResponse.json(
      {
        distribution: {
          id: distribution.id,
          totalAmount: distribution.totalAmount,
          currency: distribution.currency,
          investmentAmount: distribution.investmentAmount,
          distributedAmount: distribution.distributedAmount,
          distributionDate: distribution.distributionDate,
          founderDistributions: distribution.distributions.map((fd) => ({
            founder:
              fd.founder.firstName && fd.founder.lastName
                ? `${fd.founder.firstName} ${fd.founder.lastName}`
                : fd.founder.name,
            amount: fd.amount,
            percentage: fd.percentage,
          })),
          transaction: transaction
            ? { id: transaction.id, transactionNumber: transaction.transactionNumber }
            : null,
        },
        message: "Distribution creee avec succes",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating distribution:", error);
    return NextResponse.json(
      { error: "Erreur lors de la creation de la distribution" },
      { status: 500 }
    );
  }
}
