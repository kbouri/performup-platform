import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin, isExecutiveChef, canManageStudents } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/task-templates - List all task template groups with templates
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const targetRole = searchParams.get("targetRole");
    const search = searchParams.get("search");

    // Build where clause for groups
    const groupWhere: Record<string, unknown> = { active: true };
    if (category) groupWhere.category = category;
    if (targetRole) {
      groupWhere.OR = [
        { targetRole: targetRole },
        { targetRole: null }, // Include templates for all roles
      ];
    }

    // Get groups with templates
    const groups = await prisma.taskTemplateGroup.findMany({
      where: groupWhere,
      orderBy: [{ order: "asc" }, { name: "asc" }],
      include: {
        templates: {
          where: {
            active: true,
            ...(search
              ? {
                  OR: [
                    { title: { contains: search, mode: "insensitive" as const } },
                    { description: { contains: search, mode: "insensitive" as const } },
                  ],
                }
              : {}),
          },
          orderBy: [{ order: "asc" }, { title: "asc" }],
        },
        _count: {
          select: { templates: true },
        },
      },
    });

    // Also get standalone templates (not in a group)
    const standaloneTemplates = await prisma.taskTemplate.findMany({
      where: {
        groupId: null,
        active: true,
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: "insensitive" as const } },
                { description: { contains: search, mode: "insensitive" as const } },
              ],
            }
          : {}),
        ...(category ? { category } : {}),
      },
      orderBy: [{ order: "asc" }, { title: "asc" }],
    });

    return NextResponse.json({
      groups,
      standaloneTemplates,
    });
  } catch (error) {
    console.error("Error fetching task templates:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des templates" },
      { status: 500 }
    );
  }
}

// POST /api/task-templates - Create a new task template
export async function POST(request: NextRequest) {
  try {
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
    } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Le titre est requis" },
        { status: 400 }
      );
    }

    const template = await prisma.taskTemplate.create({
      data: {
        groupId: groupId || null,
        title,
        description: description || null,
        category: category || "GENERAL",
        timing: timing || "STANDALONE",
        durationMinutes: durationMinutes || 60,
        daysFromStart: daysFromStart || 0,
        priority: priority || "medium",
        order: order || 0,
        isCollaborative: isCollaborative || false,
        assignToRole: assignToRole || null,
        notifyRoles: notifyRoles || [],
        createdBy: session.user.id,
      },
      include: {
        group: true,
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error("Error creating task template:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du template" },
      { status: 500 }
    );
  }
}
