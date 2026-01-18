import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin, isExecutiveChef } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/task-templates/groups/[id] - Get a single group with templates
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

    const group = await prisma.taskTemplateGroup.findUnique({
      where: { id },
      include: {
        templates: {
          where: { active: true },
          orderBy: [{ order: "asc" }, { title: "asc" }],
        },
        _count: {
          select: { templates: { where: { active: true } } },
        },
      },
    });

    if (!group) {
      return NextResponse.json(
        { error: "Groupe non trouvé" },
        { status: 404 }
      );
    }

    return NextResponse.json({ group });
  } catch (error) {
    console.error("Error fetching template group:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du groupe" },
      { status: 500 }
    );
  }
}

// PATCH /api/task-templates/groups/[id] - Update a group
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
    const { name, description, category, targetRole, color, icon, order, active } = body;

    const group = await prisma.taskTemplateGroup.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category }),
        ...(targetRole !== undefined && { targetRole }),
        ...(color !== undefined && { color }),
        ...(icon !== undefined && { icon }),
        ...(order !== undefined && { order }),
        ...(active !== undefined && { active }),
      },
      include: {
        _count: {
          select: { templates: { where: { active: true } } },
        },
      },
    });

    return NextResponse.json({ group });
  } catch (error) {
    console.error("Error updating template group:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du groupe" },
      { status: 500 }
    );
  }
}

// DELETE /api/task-templates/groups/[id] - Delete a group
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

    // Soft delete - just deactivate
    await prisma.taskTemplateGroup.update({
      where: { id },
      data: { active: false },
    });

    return NextResponse.json({ message: "Groupe supprimé" });
  } catch (error) {
    console.error("Error deleting template group:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du groupe" },
      { status: 500 }
    );
  }
}
