import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/admin/accounting/positions - Liste des positions par admin et devise
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

    // Recuperer toutes les positions
    const positions = await prisma.adminPosition.findMany({
      include: {
        admin: {
          select: { id: true, name: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: [{ adminId: "asc" }, { currency: "asc" }],
    });

    // Grouper par admin
    const positionsByAdmin: Record<
      string,
      {
        admin: { id: string; name: string; email: string };
        positions: Array<{
          id: string;
          currency: string;
          advanced: number;
          received: number;
          balance: number;
          asOfDate: string;
        }>;
        totalBalance: Record<string, number>;
      }
    > = {};

    for (const pos of positions) {
      const adminName =
        pos.admin.firstName && pos.admin.lastName
          ? `${pos.admin.firstName} ${pos.admin.lastName}`
          : pos.admin.name || pos.admin.email;

      if (!positionsByAdmin[pos.adminId]) {
        positionsByAdmin[pos.adminId] = {
          admin: {
            id: pos.admin.id,
            name: adminName,
            email: pos.admin.email,
          },
          positions: [],
          totalBalance: {},
        };
      }

      const balance = pos.advanced - pos.received;
      positionsByAdmin[pos.adminId].positions.push({
        id: pos.id,
        currency: pos.currency,
        advanced: pos.advanced,
        received: pos.received,
        balance,
        asOfDate: pos.asOfDate.toISOString(),
      });

      positionsByAdmin[pos.adminId].totalBalance[pos.currency] = balance;
    }

    // Calculer les totaux globaux par devise
    const globalTotals: Record<string, { advanced: number; received: number; balance: number }> = {};
    for (const pos of positions) {
      if (!globalTotals[pos.currency]) {
        globalTotals[pos.currency] = { advanced: 0, received: 0, balance: 0 };
      }
      globalTotals[pos.currency].advanced += pos.advanced;
      globalTotals[pos.currency].received += pos.received;
      globalTotals[pos.currency].balance += pos.advanced - pos.received;
    }

    // Suggestions de reequilibrage (si un admin a un solde positif et un autre negatif)
    const rebalancingSuggestions: Array<{
      fromAdmin: string;
      toAdmin: string;
      amount: number;
      currency: string;
    }> = [];

    for (const currency of ["EUR", "MAD", "USD"]) {
      const adminsWithPositiveBalance: Array<{ adminId: string; name: string; balance: number }> = [];
      const adminsWithNegativeBalance: Array<{ adminId: string; name: string; balance: number }> = [];

      for (const [adminId, data] of Object.entries(positionsByAdmin)) {
        const balance = data.totalBalance[currency] || 0;
        if (balance > 0) {
          adminsWithPositiveBalance.push({ adminId, name: data.admin.name, balance });
        } else if (balance < 0) {
          adminsWithNegativeBalance.push({ adminId, name: data.admin.name, balance: Math.abs(balance) });
        }
      }

      // Suggerer des transferts si possible
      for (const positive of adminsWithPositiveBalance) {
        for (const negative of adminsWithNegativeBalance) {
          const transferAmount = Math.min(positive.balance, negative.balance);
          if (transferAmount > 0) {
            rebalancingSuggestions.push({
              fromAdmin: negative.name,
              toAdmin: positive.name,
              amount: transferAmount,
              currency,
            });
          }
        }
      }
    }

    return NextResponse.json({
      positions: Object.values(positionsByAdmin),
      globalTotals,
      rebalancingSuggestions: rebalancingSuggestions.slice(0, 5), // Max 5 suggestions
    });
  } catch (error) {
    console.error("Error fetching positions:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation des positions" },
      { status: 500 }
    );
  }
}

// POST /api/admin/accounting/positions - Mettre a jour une position manuellement
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
    const { adminId, currency, advanced, received, notes } = body;

    if (!adminId || !currency) {
      return NextResponse.json(
        { error: "Admin et devise sont requis" },
        { status: 400 }
      );
    }

    // Verifier que l'admin existe
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { id: true, role: true },
    });

    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Admin non trouve" },
        { status: 404 }
      );
    }

    // Creer ou mettre a jour la position
    const position = await prisma.adminPosition.upsert({
      where: {
        adminId_currency: {
          adminId,
          currency,
        },
      },
      update: {
        advanced: advanced ?? undefined,
        received: received ?? undefined,
        asOfDate: new Date(),
      },
      create: {
        adminId,
        currency,
        advanced: advanced || 0,
        received: received || 0,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE_ADMIN_POSITION",
        resourceType: "AdminPosition",
        resourceId: position.id,
        metadata: {
          adminId,
          currency,
          advanced,
          received,
          notes,
        },
      },
    });

    return NextResponse.json({
      position,
      message: "Position mise a jour",
    });
  } catch (error) {
    console.error("Error updating position:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise a jour de la position" },
      { status: 500 }
    );
  }
}
