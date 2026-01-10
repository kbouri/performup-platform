import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/admin/accounting/missions - Liste des missions
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    if (!isAdmin(session.user)) {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const mentorId = searchParams.get("mentorId");
    const professorId = searchParams.get("professorId");
    const studentId = searchParams.get("studentId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: Record<string, unknown> = {};

    if (status && status !== "all") {
      where.status = status;
    }

    if (mentorId) {
      where.mentorId = mentorId;
    }

    if (professorId) {
      where.professorId = professorId;
    }

    if (studentId) {
      where.studentId = studentId;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        (where.date as Record<string, unknown>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.date as Record<string, unknown>).lte = new Date(endDate);
      }
    }

    const missions = await prisma.mission.findMany({
      where,
      orderBy: { date: "desc" },
      include: {
        mentor: {
          include: {
            user: {
              select: { name: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        professor: {
          include: {
            user: {
              select: { name: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        student: {
          include: {
            user: {
              select: { name: true, firstName: true, lastName: true },
            },
          },
        },
        validator: {
          select: { name: true, firstName: true, lastName: true },
        },
        creator: {
          select: { name: true, firstName: true, lastName: true },
        },
      },
    });

    // Statistiques
    const stats = {
      total: missions.length,
      pending: missions.filter((m) => m.status === "PENDING").length,
      validated: missions.filter((m) => m.status === "VALIDATED").length,
      paid: missions.filter((m) => m.status === "PAID").length,
      cancelled: missions.filter((m) => m.status === "CANCELLED").length,
      totalAmount: missions
        .filter((m) => m.status !== "CANCELLED")
        .reduce((sum, m) => sum + m.amount, 0),
      pendingAmount: missions
        .filter((m) => m.status === "PENDING")
        .reduce((sum, m) => sum + m.amount, 0),
      validatedAmount: missions
        .filter((m) => m.status === "VALIDATED")
        .reduce((sum, m) => sum + m.amount, 0),
    };

    return NextResponse.json({
      missions: missions.map((m) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        date: m.date,
        hoursWorked: m.hoursWorked,
        amount: m.amount,
        currency: m.currency,
        status: m.status,
        validatedAt: m.validatedAt,
        paidAt: m.paidAt,
        notes: m.notes,
        createdAt: m.createdAt,
        mentor: m.mentor
          ? {
              id: m.mentor.id,
              name:
                m.mentor.user.firstName && m.mentor.user.lastName
                  ? `${m.mentor.user.firstName} ${m.mentor.user.lastName}`
                  : m.mentor.user.name,
              email: m.mentor.user.email,
            }
          : null,
        professor: m.professor
          ? {
              id: m.professor.id,
              name:
                m.professor.user.firstName && m.professor.user.lastName
                  ? `${m.professor.user.firstName} ${m.professor.user.lastName}`
                  : m.professor.user.name,
              email: m.professor.user.email,
              type: m.professor.type,
            }
          : null,
        student: m.student
          ? {
              id: m.student.id,
              name:
                m.student.user.firstName && m.student.user.lastName
                  ? `${m.student.user.firstName} ${m.student.user.lastName}`
                  : m.student.user.name,
            }
          : null,
        validator: m.validator
          ? m.validator.firstName && m.validator.lastName
            ? `${m.validator.firstName} ${m.validator.lastName}`
            : m.validator.name
          : null,
        createdBy: m.creator
          ? m.creator.firstName && m.creator.lastName
            ? `${m.creator.firstName} ${m.creator.lastName}`
            : m.creator.name
          : null,
      })),
      stats,
    });
  } catch (error) {
    console.error("Error fetching missions:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation des missions" },
      { status: 500 }
    );
  }
}

// POST /api/admin/accounting/missions - Creer une mission
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    if (!isAdmin(session.user)) {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const body = await request.json();
    const {
      mentorId,
      professorId,
      studentId,
      title,
      description,
      date,
      hoursWorked,
      amount,
      currency,
      notes,
      autoValidate,
    } = body;

    // Validations
    if (!title || !date || !amount) {
      return NextResponse.json(
        { error: "Champs requis: title, date, amount" },
        { status: 400 }
      );
    }

    if (!mentorId && !professorId) {
      return NextResponse.json(
        { error: "Un mentor ou professeur doit etre specifie" },
        { status: 400 }
      );
    }

    // Verifier que le mentor/professeur existe
    if (mentorId) {
      const mentor = await prisma.mentor.findUnique({
        where: { id: mentorId },
      });
      if (!mentor) {
        return NextResponse.json(
          { error: "Mentor non trouve" },
          { status: 404 }
        );
      }
    }

    if (professorId) {
      const professor = await prisma.professor.findUnique({
        where: { id: professorId },
      });
      if (!professor) {
        return NextResponse.json(
          { error: "Professeur non trouve" },
          { status: 404 }
        );
      }
    }

    const mission = await prisma.mission.create({
      data: {
        mentorId: mentorId || null,
        professorId: professorId || null,
        studentId: studentId || null,
        title,
        description: description || null,
        date: new Date(date),
        hoursWorked: hoursWorked || null,
        amount,
        currency: currency || "EUR",
        status: autoValidate ? "VALIDATED" : "PENDING",
        validatedBy: autoValidate ? session.user.id : null,
        validatedAt: autoValidate ? new Date() : null,
        notes: notes || null,
        createdBy: session.user.id,
      },
      include: {
        mentor: {
          include: {
            user: { select: { name: true, firstName: true, lastName: true } },
          },
        },
        professor: {
          include: {
            user: { select: { name: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE_MISSION",
        resourceType: "Mission",
        resourceId: mission.id,
        metadata: {
          title,
          amount,
          mentorId,
          professorId,
          autoValidate,
        },
      },
    });

    return NextResponse.json(
      {
        mission: {
          id: mission.id,
          title: mission.title,
          date: mission.date,
          amount: mission.amount,
          currency: mission.currency,
          status: mission.status,
          assignee: mission.mentor
            ? {
                type: "mentor",
                name:
                  mission.mentor.user.firstName && mission.mentor.user.lastName
                    ? `${mission.mentor.user.firstName} ${mission.mentor.user.lastName}`
                    : mission.mentor.user.name,
              }
            : mission.professor
            ? {
                type: "professor",
                name:
                  mission.professor.user.firstName && mission.professor.user.lastName
                    ? `${mission.professor.user.firstName} ${mission.professor.user.lastName}`
                    : mission.professor.user.name,
              }
            : null,
        },
        message: autoValidate
          ? "Mission creee et validee"
          : "Mission creee (en attente de validation)",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating mission:", error);
    return NextResponse.json(
      { error: "Erreur lors de la creation de la mission" },
      { status: 500 }
    );
  }
}
