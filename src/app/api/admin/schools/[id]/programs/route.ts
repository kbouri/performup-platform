import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/admin/schools/[id]/programs - Get all programs for a school
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: schoolId } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || !isAdmin(session.user)) {
      return NextResponse.json({ error: "Non autorise" }, { status: 403 });
    }

    const programs = await prisma.schoolProgram.findMany({
      where: { schoolId },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            applications: true,
            essays: true,
            studentSchools: true,
            deadlines: true,
            essayQuestions: true,
          },
        },
      },
    });

    return NextResponse.json({ programs });
  } catch (error) {
    console.error("Error fetching programs:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation des programmes" },
      { status: 500 }
    );
  }
}

// POST /api/admin/schools/[id]/programs - Create a new program
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: schoolId } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || !isAdmin(session.user)) {
      return NextResponse.json({ error: "Non autorise" }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      type,
      duration,
      degree,
      description,
      website,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Le nom du programme est requis" },
        { status: 400 }
      );
    }

    const program = await prisma.schoolProgram.create({
      data: {
        schoolId,
        name,
        type: type || "MiM",
        duration: duration || null,
        degree: degree || null,
        description: description || null,
        website: website || null,
      },
    });

    return NextResponse.json(
      {
        program,
        message: "Programme cree avec succes",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating program:", error);
    return NextResponse.json(
      { error: "Erreur lors de la creation du programme" },
      { status: 500 }
    );
  }
}
