import { NextRequest, NextResponse } from "next/server";
import { auth, canAccessStudent } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/tasks - List tasks with filters
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
    const category = searchParams.get("category");
    const completed = searchParams.get("completed");
    const calendarEventId = searchParams.get("calendarEventId");

    const where: Record<string, unknown> = {};

    if (studentId) {
      where.studentId = studentId;
    }

    if (category && category !== "all") {
      where.category = category;
    }

    if (completed !== null && completed !== "all") {
      where.completed = completed === "true";
    }

    if (calendarEventId) {
      where.calendarEventId = calendarEventId;
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
        // Professors see tasks for their students
        where.student = {
          OR: [
            { professorQuantId: professor.id },
            { professorVerbalId: professor.id },
          ],
        };
      }
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [{ completed: "asc" }, { dueDate: "asc" }],
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
        calendarEvent: {
          select: {
            id: true,
            title: true,
            startTime: true,
          },
        },
        document: {
          select: {
            id: true,
            name: true,
          },
        },
        schedules: {
          orderBy: { scheduledFor: "asc" },
        },
      },
    });

    const formattedTasks = tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      timing: task.timing,
      dueDate: task.dueDate,
      category: task.category,
      completed: task.completed,
      completedAt: task.completedAt,
      scheduledAt: task.scheduledAt,
      durationMinutes: task.durationMinutes,
      isRecurring: task.isRecurring,
      recurrenceRule: task.recurrenceRule,
      student: {
        id: task.student.id,
        name: task.student.user.name,
        email: task.student.user.email,
      },
      calendarEvent: task.calendarEvent,
      document: task.document,
      schedules: task.schedules.map((s) => ({
        id: s.id,
        scheduledFor: s.scheduledFor,
        completed: s.completed,
        completedAt: s.completedAt,
      })),
      scheduleCount: task.schedules.length,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    }));

    return NextResponse.json({ tasks: formattedTasks });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des tâches" },
      { status: 500 }
    );
  }
}

// POST /api/tasks - Create a new task
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    if (!canAccessStudent(session.user)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      description,
      timing,
      dueDate,
      category,
      studentId,
      calendarEventId,
      documentId,
      isRecurring,
      recurrenceRule,
    } = body;

    if (!title || !dueDate || !category || !studentId) {
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

    const task = await prisma.task.create({
      data: {
        title,
        description,
        timing: timing || "STANDALONE",
        dueDate: new Date(dueDate),
        category,
        studentId,
        calendarEventId: calendarEventId || null,
        documentId: documentId || null,
        createdBy: session.user.id,
        isRecurring: isRecurring || false,
        recurrenceRule: recurrenceRule || null,
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

    return NextResponse.json(
      {
        task: {
          id: task.id,
          title: task.title,
          dueDate: task.dueDate,
          category: task.category,
          student: {
            id: task.student.id,
            name: task.student.user.name,
          },
        },
        message: "Tâche créée avec succès",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de la tâche" },
      { status: 500 }
    );
  }
}

