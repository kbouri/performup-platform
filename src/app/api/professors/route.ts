import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/professors - List all active professors
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // QUANT or VERBAL

    const where: Record<string, unknown> = {};
    if (type) {
      where.type = type;
    }

    const professors = await prisma.professor.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            email: true,
            image: true,
            active: true,
          },
        },
      },
      orderBy: {
        user: {
          name: "asc",
        },
      },
    });

    const formattedProfessors = professors
      .filter((p) => p.user.active)
      .map((prof) => ({
        id: prof.id,
        userId: prof.userId,
        name:
          prof.user.name ||
          `${prof.user.firstName || ""} ${prof.user.lastName || ""}`.trim(),
        email: prof.user.email,
        image: prof.user.image,
        type: prof.type,
        hourlyRate: prof.hourlyRate,
        availability: prof.availability,
      }));

    return NextResponse.json({ professors: formattedProfessors });
  } catch (error) {
    console.error("Error fetching professors:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des professeurs" },
      { status: 500 }
    );
  }
}
