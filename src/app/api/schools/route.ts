import { NextRequest, NextResponse } from "next/server";
import { auth, canManageStudents } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/schools - List all active schools with programs
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const country = searchParams.get("country");

    const where: Record<string, unknown> = { active: true };
    if (country) {
      where.country = country;
    }

    const schools = await prisma.school.findMany({
      where,
      include: {
        programs: {
          where: { active: true },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    const formattedSchools = schools.map((school) => ({
      id: school.id,
      name: school.name,
      country: school.country,
      city: school.city,
      website: school.website,
      logoUrl: school.logoUrl,
      programs: school.programs.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        duration: p.duration,
        degree: p.degree,
      })),
    }));

    return NextResponse.json({ schools: formattedSchools });
  } catch (error) {
    console.error("Error fetching schools:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des écoles" },
      { status: 500 }
    );
  }
}

// POST /api/schools - Create a new school (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    if (!canManageStudents(session.user)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await request.json();
    const { name, country, city, website, programs } = body;

    const school = await prisma.school.create({
      data: {
        name,
        country,
        city,
        website,
        programs: {
          create:
            programs?.map((p: { name: string; type: string; duration?: string; degree?: string }) => ({
              name: p.name,
              type: p.type,
              duration: p.duration,
              degree: p.degree,
            })) || [],
        },
      },
      include: {
        programs: true,
      },
    });

    return NextResponse.json({ school }, { status: 201 });
  } catch (error) {
    console.error("Error creating school:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de l'école" },
      { status: 500 }
    );
  }
}
