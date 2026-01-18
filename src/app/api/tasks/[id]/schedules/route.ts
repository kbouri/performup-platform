import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/tasks/[id]/schedules - Get all schedules for a task
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

    const schedules = await prisma.taskSchedule.findMany({
      where: { taskId: id },
      orderBy: { scheduledFor: "asc" },
    });

    return NextResponse.json({ schedules });
  } catch (error) {
    console.error("Error fetching task schedules:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des planifications" },
      { status: 500 }
    );
  }
}

// POST /api/tasks/[id]/schedules - Add a new schedule session
export async function POST(
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
    const { scheduledFor, durationMinutes } = body;

    if (!scheduledFor) {
      return NextResponse.json(
        { error: "Date de planification requise" },
        { status: 400 }
      );
    }

    const schedule = await prisma.taskSchedule.create({
      data: {
        taskId: id,
        scheduledFor: new Date(scheduledFor),
      },
    });

    // Also update the task's durationMinutes if provided
    if (durationMinutes) {
      await prisma.task.update({
        where: { id },
        data: { durationMinutes },
      });
    }

    return NextResponse.json(
      {
        schedule,
        message: "Planification ajoutée avec succès",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding task schedule:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'ajout de la planification" },
      { status: 500 }
    );
  }
}
