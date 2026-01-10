import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";
import { Prisma } from "@prisma/client";

// GET /api/calendar-events/[id] - Get a single event
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

    const event = await prisma.calendarEvent.findUnique({
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
        instructor: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        tasks: true,
        invitations: {
          include: {
            notification: true,
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Événement non trouvé" },
        { status: 404 }
      );
    }

    return NextResponse.json({ event });
  } catch (error) {
    console.error("Error fetching event:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de l'événement" },
      { status: 500 }
    );
  }
}

// PATCH /api/calendar-events/[id] - Update an event
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

    const event = await prisma.calendarEvent.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            mentor: true,
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Événement non trouvé" },
        { status: 404 }
      );
    }

    // Access control
    const canEdit =
      isAdmin(session.user) ||
      event.createdById === session.user.id ||
      event.student.mentor?.userId === session.user.id ||
      event.instructorId ===
        (
          await prisma.professor.findUnique({
            where: { userId: session.user.id },
          })
        )?.id;

    if (!canEdit) {
      return NextResponse.json(
        { error: "Vous n'avez pas la permission de modifier cet événement" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      startTime,
      endTime,
      eventType,
      meetingUrl,
      completed,
      instructorId,
    } = body;

    // Store history of changes
    const changes: Record<string, { from: string; to: string }> = {};
    if (startTime && new Date(startTime).getTime() !== event.startTime.getTime()) {
      changes.startTime = { from: event.startTime.toISOString(), to: new Date(startTime).toISOString() };
    }
    if (endTime && new Date(endTime).getTime() !== event.endTime.getTime()) {
      changes.endTime = { from: event.endTime.toISOString(), to: new Date(endTime).toISOString() };
    }

    // Prepare history update
    let historyUpdate: Prisma.InputJsonValue | undefined = undefined;
    if (Object.keys(changes).length > 0) {
      const existingHistory = (event.history as Record<string, unknown>) || {};
      historyUpdate = {
        ...existingHistory,
        [new Date().toISOString()]: {
          changes,
          changedBy: session.user.id,
        },
      } as Prisma.InputJsonValue;
    }

    const updatedEvent = await prisma.calendarEvent.update({
      where: { id },
      data: {
        title: title !== undefined ? title : undefined,
        description: description !== undefined ? description : undefined,
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
        eventType: eventType !== undefined ? eventType : undefined,
        meetingUrl: meetingUrl !== undefined ? meetingUrl : undefined,
        completed: completed !== undefined ? completed : undefined,
        instructorId: instructorId !== undefined ? instructorId : undefined,
        history: historyUpdate,
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
        instructor: {
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
      event: updatedEvent,
      message: "Événement mis à jour avec succès",
    });
  } catch (error) {
    console.error("Error updating event:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de l'événement" },
      { status: 500 }
    );
  }
}

// DELETE /api/calendar-events/[id] - Delete an event
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

    const event = await prisma.calendarEvent.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            mentor: true,
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Événement non trouvé" },
        { status: 404 }
      );
    }

    // Only admin, creator, or mentor can delete
    const canDelete =
      isAdmin(session.user) ||
      event.createdById === session.user.id ||
      event.student.mentor?.userId === session.user.id;

    if (!canDelete) {
      return NextResponse.json(
        { error: "Vous n'avez pas la permission de supprimer cet événement" },
        { status: 403 }
      );
    }

    await prisma.calendarEvent.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Événement supprimé avec succès",
    });
  } catch (error) {
    console.error("Error deleting event:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de l'événement" },
      { status: 500 }
    );
  }
}

