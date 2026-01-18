import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin, isExecutiveChef } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/task-templates/groups - List all template groups
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const groups = await prisma.taskTemplateGroup.findMany({
      where: { active: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      include: {
        _count: {
          select: { templates: { where: { active: true } } },
        },
      },
    });

    return NextResponse.json({ groups });
  } catch (error) {
    console.error("Error fetching template groups:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des groupes" },
      { status: 500 }
    );
  }
}

// POST /api/task-templates/groups - Create a new template group
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || (!isAdmin(session.user) && !isExecutiveChef(session.user))) {
      return NextResponse.json({ error: "Non autorisé - Accès réservé aux administrateurs" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, category, targetRole, color, icon, order } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Le nom est requis" },
        { status: 400 }
      );
    }

    const group = await prisma.taskTemplateGroup.create({
      data: {
        name,
        description: description || null,
        category: category || "GENERAL",
        targetRole: targetRole || null,
        color: color || null,
        icon: icon || null,
        order: order || 0,
        createdBy: session.user.id,
      },
      include: {
        _count: {
          select: { templates: true },
        },
      },
    });

    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    console.error("Error creating template group:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du groupe" },
      { status: 500 }
    );
  }
}
