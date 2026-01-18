import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/admin/schools/[id]/programs/[programId] - Get program details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; programId: string }> }
) {
  try {
    const { id: schoolId, programId } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || !isAdmin(session.user)) {
      return NextResponse.json({ error: "Non autorise" }, { status: 403 });
    }

    const program = await prisma.schoolProgram.findUnique({
      where: { id: programId },
      include: {
        school: {
          select: {
            id: true,
            name: true,
            country: true,
            city: true,
            logoUrl: true,
          },
        },
        deadlines: {
          orderBy: { deadline: "asc" },
        },
        essayQuestions: {
          where: { active: true },
          orderBy: [{ round: "asc" }, { order: "asc" }],
        },
        documents: {
          orderBy: { createdAt: "desc" },
        },
        studentSchools: {
          include: {
            student: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            applications: true,
            essays: true,
            studentSchools: true,
          },
        },
      },
    });

    if (!program || program.schoolId !== schoolId) {
      return NextResponse.json(
        { error: "Programme non trouve" },
        { status: 404 }
      );
    }

    return NextResponse.json({ program });
  } catch (error) {
    console.error("Error fetching program:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation du programme" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/schools/[id]/programs/[programId] - Update program
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; programId: string }> }
) {
  try {
    const { id: schoolId, programId } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || !isAdmin(session.user)) {
      return NextResponse.json({ error: "Non autorise" }, { status: 403 });
    }

    const program = await prisma.schoolProgram.findUnique({
      where: { id: programId },
    });

    if (!program || program.schoolId !== schoolId) {
      return NextResponse.json(
        { error: "Programme non trouve" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      name,
      type,
      duration,
      degree,
      description,
      website,
      requiresGMAT,
      requiresGRE,
      requiresTOEFL,
      requiresIELTS,
      requiresTAGEMAGE,
      minGMATScore,
      minGREScore,
      minTOEFLScore,
      minIELTSScore,
      otherRequirements,
      acceptanceRate,
      avgGMATScore,
      avgGREScore,
      classSize,
      internationalPct,
      avgWorkExperience,
      avgAge,
      tuitionFees,
      tuitionCurrency,
      internalNotes,
      active,
    } = body;

    const updatedProgram = await prisma.schoolProgram.update({
      where: { id: programId },
      data: {
        name: name !== undefined ? name : undefined,
        type: type !== undefined ? type : undefined,
        duration: duration !== undefined ? duration : undefined,
        degree: degree !== undefined ? degree : undefined,
        description: description !== undefined ? description : undefined,
        website: website !== undefined ? website : undefined,
        requiresGMAT: requiresGMAT !== undefined ? requiresGMAT : undefined,
        requiresGRE: requiresGRE !== undefined ? requiresGRE : undefined,
        requiresTOEFL: requiresTOEFL !== undefined ? requiresTOEFL : undefined,
        requiresIELTS: requiresIELTS !== undefined ? requiresIELTS : undefined,
        requiresTAGEMAGE: requiresTAGEMAGE !== undefined ? requiresTAGEMAGE : undefined,
        minGMATScore: minGMATScore !== undefined ? minGMATScore : undefined,
        minGREScore: minGREScore !== undefined ? minGREScore : undefined,
        minTOEFLScore: minTOEFLScore !== undefined ? minTOEFLScore : undefined,
        minIELTSScore: minIELTSScore !== undefined ? minIELTSScore : undefined,
        otherRequirements: otherRequirements !== undefined ? otherRequirements : undefined,
        acceptanceRate: acceptanceRate !== undefined ? acceptanceRate : undefined,
        avgGMATScore: avgGMATScore !== undefined ? avgGMATScore : undefined,
        avgGREScore: avgGREScore !== undefined ? avgGREScore : undefined,
        classSize: classSize !== undefined ? classSize : undefined,
        internationalPct: internationalPct !== undefined ? internationalPct : undefined,
        avgWorkExperience: avgWorkExperience !== undefined ? avgWorkExperience : undefined,
        avgAge: avgAge !== undefined ? avgAge : undefined,
        tuitionFees: tuitionFees !== undefined ? tuitionFees : undefined,
        tuitionCurrency: tuitionCurrency !== undefined ? tuitionCurrency : undefined,
        internalNotes: internalNotes !== undefined ? internalNotes : undefined,
        active: active !== undefined ? active : undefined,
      },
      include: {
        school: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      program: updatedProgram,
      message: "Programme mis a jour avec succes",
    });
  } catch (error) {
    console.error("Error updating program:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise a jour du programme" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/schools/[id]/programs/[programId] - Delete program
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; programId: string }> }
) {
  try {
    const { id: schoolId, programId } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || !isAdmin(session.user)) {
      return NextResponse.json({ error: "Non autorise" }, { status: 403 });
    }

    const program = await prisma.schoolProgram.findUnique({
      where: { id: programId },
    });

    if (!program || program.schoolId !== schoolId) {
      return NextResponse.json(
        { error: "Programme non trouve" },
        { status: 404 }
      );
    }

    await prisma.schoolProgram.delete({
      where: { id: programId },
    });

    return NextResponse.json({
      message: "Programme supprime avec succes",
    });
  } catch (error) {
    console.error("Error deleting program:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du programme" },
      { status: 500 }
    );
  }
}
