import { NextRequest, NextResponse } from "next/server";
import { auth, canManageStudents } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// POST /api/task-templates/[id]/assign - Assign a template to a person (create tasks)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || !canManageStudents(session.user)) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const body = await request.json();
    const { studentId, startDate } = body;

    if (!studentId) {
      return NextResponse.json(
        { error: "L'ID de l'étudiant est requis" },
        { status: 400 }
      );
    }

    // Check if this is a single template or a group
    const template = await prisma.taskTemplate.findUnique({
      where: { id },
    });

    const group = await prisma.taskTemplateGroup.findUnique({
      where: { id },
      include: {
        templates: {
          where: { active: true },
          orderBy: [{ order: "asc" }],
        },
      },
    });

    // Determine which templates to apply
    let templatesToApply: typeof template[] = [];

    if (template) {
      templatesToApply = [template];
    } else if (group) {
      templatesToApply = group.templates;
    } else {
      return NextResponse.json(
        { error: "Template ou groupe non trouvé" },
        { status: 404 }
      );
    }

    if (templatesToApply.length === 0) {
      return NextResponse.json(
        { error: "Aucun template à appliquer" },
        { status: 400 }
      );
    }

    // Get student info for context
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: { select: { name: true } },
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: "Étudiant non trouvé" },
        { status: 404 }
      );
    }

    // Calculate base date
    const baseDate = startDate ? new Date(startDate) : new Date();

    // Create tasks from templates
    const createdTasks = [];

    for (const tmpl of templatesToApply) {
      if (!tmpl) continue;

      // Calculate deadline based on daysFromStart
      const deadline = new Date(baseDate);
      deadline.setDate(deadline.getDate() + (tmpl.daysFromStart || 0));

      // Create the task
      const task = await prisma.task.create({
        data: {
          studentId,
          title: tmpl.title,
          description: tmpl.description,
          type: tmpl.category?.toLowerCase() === "essay" ? "essay" : "general",
          status: "todo",
          priority: tmpl.priority as "low" | "medium" | "high" | "urgent" || "medium",
          dueDate: deadline,
          createdBy: session.user.id,
        },
      });

      createdTasks.push(task);
    }

    return NextResponse.json({
      tasks: createdTasks,
      count: createdTasks.length,
      message: `${createdTasks.length} tâche(s) créée(s) avec succès`,
    }, { status: 201 });
  } catch (error) {
    console.error("Error assigning templates:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'assignation des templates" },
      { status: 500 }
    );
  }
}
