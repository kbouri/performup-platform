import { NextRequest, NextResponse } from "next/server";
import { auth, canCreateEvents } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/calendar-events - List calendar events with filters
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    const mentorId = searchParams.get("mentorId");
    const professorId = searchParams.get("professorId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const eventType = searchParams.get("eventType");

    const where: Record<string, unknown> = {};

    // Date range filter
    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) {
        (where.startTime as Record<string, unknown>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.startTime as Record<string, unknown>).lte = new Date(endDate);
      }
    }

    // Event type filter
    if (eventType && eventType !== "all") {
      where.eventType = eventType;
    }

    // Student filter
    if (studentId) {
      where.studentId = studentId;
    }

    // Mentor filter - get events for students assigned to this mentor
    if (mentorId) {
      where.student = {
        mentorId: mentorId,
      };
    }

    // Professor filter - get events where this professor is instructor
    if (professorId) {
      where.instructorId = professorId;
    }

    // Access control
    const userId = session.user.id;
    const userRole = session.user.role;

    if (userRole === "STUDENT") {
      const student = await prisma.student.findUnique({
        where: { userId },
      });
      if (student) {
        where.studentId = student.id;
      }
    } else if (userRole === "MENTOR") {
      const mentor = await prisma.mentor.findUnique({
        where: { userId },
      });
      if (mentor) {
        where.student = {
          mentorId: mentor.id,
        };
      }
    } else if (userRole === "PROFESSOR") {
      const professor = await prisma.professor.findUnique({
        where: { userId },
      });
      if (professor) {
        where.instructorId = professor.id;
      }
    }

    const events = await prisma.calendarEvent.findMany({
      where,
      orderBy: { startTime: "asc" },
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
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
        tasks: {
          select: {
            id: true,
            title: true,
            completed: true,
          },
        },
      },
    });

    const formattedEvents = events.map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      startTime: event.startTime,
      endTime: event.endTime,
      eventType: event.eventType,
      meetingUrl: event.meetingUrl,
      completed: event.completed,
      student: {
        id: event.student.id,
        userId: event.student.userId,
        name: event.student.user.name,
        email: event.student.user.email,
      },
      instructor: event.instructor
        ? {
            id: event.instructor.id,
            userId: event.instructor.userId,
            name: event.instructor.user.name,
            email: event.instructor.user.email,
            type: event.instructor.type,
          }
        : null,
      createdBy: event.createdBy,
      tasks: event.tasks,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    }));

    return NextResponse.json({ events: formattedEvents });
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des événements" },
      { status: 500 }
    );
  }
}

// POST /api/calendar-events - Create a new calendar event
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    if (!canCreateEvents(session.user)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      description,
      startTime,
      endTime,
      eventType,
      studentId,
      instructorId,
      meetingUrl,
    } = body;

    if (!title || !startTime || !endTime || !eventType || !studentId) {
      return NextResponse.json(
        { error: "Champs requis manquants" },
        { status: 400 }
      );
    }

    // Verify student exists
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return NextResponse.json(
        { error: "Étudiant non trouvé" },
        { status: 404 }
      );
    }

    // Access control for mentor
    if (session.user.role === "MENTOR") {
      const mentor = await prisma.mentor.findUnique({
        where: { userId: session.user.id },
      });
      if (mentor && student.mentorId !== mentor.id) {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
      }
    }

    const event = await prisma.calendarEvent.create({
      data: {
        title,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        eventType,
        studentId,
        instructorId: instructorId || null,
        meetingUrl,
        createdById: session.user.id,
      },
      include: {
        student: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
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

    return NextResponse.json(
      {
        event: {
          id: event.id,
          title: event.title,
          startTime: event.startTime,
          endTime: event.endTime,
          eventType: event.eventType,
          student: {
            id: event.student.id,
            name: event.student.user.name,
          },
          instructor: event.instructor
            ? {
                id: event.instructor.id,
                name: event.instructor.user.name,
              }
            : null,
        },
        message: "Événement créé avec succès",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating calendar event:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de l'événement" },
      { status: 500 }
    );
  }
}

