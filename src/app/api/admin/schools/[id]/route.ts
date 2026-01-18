import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/admin/schools/[id] - Get school details with programs
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || !isAdmin(session.user)) {
      return NextResponse.json({ error: "Non autorise" }, { status: 403 });
    }

    const school = await prisma.school.findUnique({
      where: { id },
      include: {
        programs: {
          orderBy: { name: "asc" },
          include: {
            _count: {
              select: {
                applications: true,
                essays: true,
                studentSchools: true,
              },
            },
          },
        },
      },
    });

    if (!school) {
      return NextResponse.json(
        { error: "Ecole non trouvee" },
        { status: 404 }
      );
    }

    return NextResponse.json({ school });
  } catch (error) {
    console.error("Error fetching school:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation de l'ecole" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/schools/[id] - Update school
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || !isAdmin(session.user)) {
      return NextResponse.json({ error: "Non autorise" }, { status: 403 });
    }

    const body = await request.json();
    const { name, country, city, website, description, logoUrl, active } = body;

    const school = await prisma.school.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        country: country !== undefined ? country : undefined,
        city: city !== undefined ? city : undefined,
        website: website !== undefined ? website : undefined,
        description: description !== undefined ? description : undefined,
        logoUrl: logoUrl !== undefined ? logoUrl : undefined,
        active: active !== undefined ? active : undefined,
      },
    });

    return NextResponse.json({
      school,
      message: "Ecole mise a jour avec succes",
    });
  } catch (error) {
    console.error("Error updating school:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise a jour de l'ecole" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/schools/[id] - Delete school
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || !isAdmin(session.user)) {
      return NextResponse.json({ error: "Non autorise" }, { status: 403 });
    }

    await prisma.school.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Ecole supprimee avec succes",
    });
  } catch (error) {
    console.error("Error deleting school:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de l'ecole" },
      { status: 500 }
    );
  }
}
