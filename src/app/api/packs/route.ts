import { NextRequest, NextResponse } from "next/server";
import { auth, canManagePacks } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/packs - List all active packs
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const packs = await prisma.pack.findMany({
      where: { active: true },
      orderBy: [{ isAddon: "asc" }, { displayName: "asc" }],
    });

    const formattedPacks = packs.map((pack) => ({
      id: pack.id,
      name: pack.name,
      displayName: pack.displayName,
      description: pack.description,
      price: pack.price,
      geography: pack.geography,
      isAddon: pack.isAddon,
    }));

    return NextResponse.json({ packs: formattedPacks });
  } catch (error) {
    console.error("Error fetching packs:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des packs" },
      { status: 500 }
    );
  }
}

// POST /api/packs - Create a new pack (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    if (!canManagePacks(session.user)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await request.json();
    const { name, displayName, description, price, geography, isAddon, folderTemplate } = body;

    const pack = await prisma.pack.create({
      data: {
        name,
        displayName,
        description,
        price,
        geography,
        isAddon: isAddon || false,
        folderTemplate,
      },
    });

    return NextResponse.json({ pack }, { status: 201 });
  } catch (error) {
    console.error("Error creating pack:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du pack" },
      { status: 500 }
    );
  }
}
