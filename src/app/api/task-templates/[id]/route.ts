import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin, isExecutiveChef } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/task-templates/[id] - Get a single template
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const template = await prisma.taskTemplate.findUnique({
      where: { id },
      include: {
        group: true,
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template non trouvé" },
        { status: 404 }
      );
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Error fetching template:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du template" },
      { status: 500 }
    );
  }
}

// PATCH /api/task-templates/[id] - Update a template
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || (!isAdmin(session.user) && !isExecutiveChef(session.user))) {
      return NextResponse.json({ error: "Non autorisé - Accès réservé aux administrateurs" }, { status: 403 });
    }

    const body = await request.json();
    const {
      groupId,
      title,
      description,
      category,
      timing,
      durationMinutes,
      daysFromStart,
      priority,
      order,
      isCollaborative,
      assignToRole,
      notifyRoles,
      active,
    } = body;

    const template = await prisma.taskTemplate.update({
      where: { id },
      data: {
        ...(groupId !== undefined && { groupId }),
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category }),
        ...(timing !== undefined && { timing }),
        ...(durationMinutes !== undefined && { durationMinutes }),
        ...(daysFromStart !== undefined && { daysFromStart }),
        ...(priority !== undefined && { priority }),
        ...(order !== undefined && { order }),
        ...(isCollaborative !== undefined && { isCollaborative }),
        ...(assignToRole !== undefined && { assignToRole }),
        ...(notifyRoles !== undefined && { notifyRoles }),
        ...(active !== undefined && { active }),
      },
      include: {
        group: true,
      },
    });

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Error updating template:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du template" },
      { status: 500 }
    );
  }
}

// DELETE /api/task-templates/[id] - Delete a template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || (!isAdmin(session.user) && !isExecutiveChef(session.user))) {
      return NextResponse.json({ error: "Non autorisé - Accès réservé aux administrateurs" }, { status: 403 });
    }

    // Soft delete
    await prisma.taskTemplate.update({
      where: { id },
      data: { active: false },
    });

    return NextResponse.json({ message: "Template supprimé" });
  } catch (error) {
    console.error("Error deleting template:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du template" },
      { status: 500 }
    );
  }
}
