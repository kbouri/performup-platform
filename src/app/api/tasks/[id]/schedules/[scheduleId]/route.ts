import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// DELETE /api/tasks/[id]/schedules/[scheduleId] - Remove a schedule session
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; scheduleId: string }> }
) {
  try {
    const { id, scheduleId } = await params;

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

    // Access control
    const canEdit =
      isAdmin(session.user) ||
      task.createdBy === session.user.id ||
      task.student.userId === session.user.id ||
      task.student.mentor?.userId === session.user.id;

    if (!canEdit) {
      return NextResponse.json(
        { error: "Vous n'avez pas la permission de modifier cette tâche" },
        { status: 403 }
      );
    }

    // Find and delete the schedule
    const schedule = await prisma.taskSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule || schedule.taskId !== id) {
      return NextResponse.json(
        { error: "Planification non trouvée" },
        { status: 404 }
      );
    }

    await prisma.taskSchedule.delete({
      where: { id: scheduleId },
    });

    return NextResponse.json({
      message: "Planification supprimée avec succès",
    });
  } catch (error) {
    console.error("Error deleting task schedule:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la planification" },
      { status: 500 }
    );
  }
}

// PATCH /api/tasks/[id]/schedules/[scheduleId] - Mark schedule as completed
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; scheduleId: string }> }
) {
  try {
    const { id, scheduleId } = await params;

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

    // Access control
    const canEdit =
      isAdmin(session.user) ||
      task.createdBy === session.user.id ||
      task.student.userId === session.user.id ||
      task.student.mentor?.userId === session.user.id;

    if (!canEdit) {
      return NextResponse.json(
        { error: "Vous n'avez pas la permission de modifier cette tâche" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { completed } = body;

    const schedule = await prisma.taskSchedule.update({
      where: { id: scheduleId },
      data: {
        completed: completed ?? true,
        completedAt: completed ? new Date() : null,
      },
    });

    return NextResponse.json({
      schedule,
      message: "Planification mise à jour",
    });
  } catch (error) {
    console.error("Error updating task schedule:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de la planification" },
      { status: 500 }
    );
  }
}
