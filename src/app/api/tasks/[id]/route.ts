import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/tasks/[id] - Get a single task
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

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            mentor: {
              select: {
                userId: true,
              },
            },
          },
        },
        calendarEvent: true,
        document: true,
        participants: true,
        schedules: {
          orderBy: { scheduledFor: "asc" },
        },
      },
    });

    if (!task) {
      return NextResponse.json(
        { error: "Tâche non trouvée" },
        { status: 404 }
      );
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error("Error fetching task:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de la tâche" },
      { status: 500 }
    );
  }
}

// PATCH /api/tasks/[id] - Update a task
export async function PATCH(
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

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            user: true,
            mentor: true,
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json(
        { error: "Tâche non trouvée" },
        { status: 404 }
      );
    }

    // Access control
    const canEdit =
      isAdmin(session.user) ||
      task.createdBy === session.user.id ||
      task.student.user.id === session.user.id ||
      task.student.mentor?.userId === session.user.id;

    if (!canEdit) {
      return NextResponse.json(
        { error: "Vous n'avez pas la permission de modifier cette tâche" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      dueDate,
      category,
      completed,
    } = body;

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        title: title !== undefined ? title : undefined,
        description: description !== undefined ? description : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        category: category !== undefined ? category : undefined,
        completed: completed !== undefined ? completed : undefined,
        completedAt: completed === true ? new Date() : completed === false ? null : undefined,
      },
      include: {
        student: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      task: updatedTask,
      message: "Tâche mise à jour avec succès",
    });
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de la tâche" },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/[id] - Delete a task
export async function DELETE(
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

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            mentor: true,
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json(
        { error: "Tâche non trouvée" },
        { status: 404 }
      );
    }

    // Only admin, creator, or mentor can delete
    const canDelete =
      isAdmin(session.user) ||
      task.createdBy === session.user.id ||
      task.student.mentor?.userId === session.user.id;

    if (!canDelete) {
      return NextResponse.json(
        { error: "Vous n'avez pas la permission de supprimer cette tâche" },
        { status: 403 }
      );
    }

    await prisma.task.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Tâche supprimée avec succès",
    });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la tâche" },
      { status: 500 }
    );
  }
}

