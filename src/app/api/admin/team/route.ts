import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/admin/team - Liste tous les collaborateurs avec stats
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

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status"); // ACTIVE, INACTIVE, PENDING

    // Fetch mentors with stats
    const mentors = await prisma.mentor.findMany({
      where: status ? { status } : undefined,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            name: true,
            image: true,
            phone: true,
            active: true,
          },
        },
        executiveChef: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            students: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Fetch professors with stats
    const professors = await prisma.professor.findMany({
      where: status ? { status } : undefined,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            name: true,
            image: true,
            phone: true,
            active: true,
          },
        },
        _count: {
          select: {
            studentsQuant: true,
            studentsVerbal: true,
            calendarEvents: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Fetch executive chefs with stats
    const executiveChefs = await prisma.executiveChef.findMany({
      where: status ? { status } : undefined,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            name: true,
            image: true,
            phone: true,
            active: true,
          },
        },
        _count: {
          select: {
            mentors: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calculate summary stats
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    // Get total hours this month for professors (from calendar events)
    const professorIds = professors.map((p) => p.id);
    const totalHoursThisMonth = await prisma.calendarEvent.aggregate({
      where: {
        instructorId: { in: professorIds },
        startTime: { gte: currentMonth },
        endTime: { lt: nextMonth },
        completed: true,
      },
      _count: true,
    });

    // Calculate total payroll (mentors + professors with hourly rates)
    const mentorPayroll = mentors.reduce((sum, m) => {
      if (m.hourlyRate && m.status === "ACTIVE") {
        return sum + m.hourlyRate;
      }
      return sum;
    }, 0);

    const professorPayroll = professors.reduce((sum, p) => {
      if (p.hourlyRate && p.status === "ACTIVE") {
        return sum + p.hourlyRate;
      }
      return sum;
    }, 0);

    const summary = {
      totalMentors: mentors.filter((m) => m.status === "ACTIVE").length,
      totalProfessors: professors.filter((p) => p.status === "ACTIVE").length,
      totalExecutiveChefs: executiveChefs.filter((e) => e.status === "ACTIVE").length,
      totalCollaborators:
        mentors.filter((m) => m.status === "ACTIVE").length +
        professors.filter((p) => p.status === "ACTIVE").length +
        executiveChefs.filter((e) => e.status === "ACTIVE").length,
      hoursThisMonth: totalHoursThisMonth._count || 0,
      estimatedPayroll: mentorPayroll + professorPayroll,
      byStatus: {
        active:
          mentors.filter((m) => m.status === "ACTIVE").length +
          professors.filter((p) => p.status === "ACTIVE").length +
          executiveChefs.filter((e) => e.status === "ACTIVE").length,
        inactive:
          mentors.filter((m) => m.status === "INACTIVE").length +
          professors.filter((p) => p.status === "INACTIVE").length +
          executiveChefs.filter((e) => e.status === "INACTIVE").length,
        pending:
          mentors.filter((m) => m.status === "PENDING").length +
          professors.filter((p) => p.status === "PENDING").length +
          executiveChefs.filter((e) => e.status === "PENDING").length,
      },
    };

    // Format response
    const formattedMentors = mentors.map((m) => ({
      id: m.id,
      type: "MENTOR",
      userId: m.userId,
      user: m.user,
      status: m.status,
      specialties: m.specialties,
      bio: m.bio,
      hourlyRate: m.hourlyRate,
      paymentType: m.paymentType,
      executiveChef: m.executiveChef
        ? {
            id: m.executiveChef.id,
            name:
              m.executiveChef.user.firstName && m.executiveChef.user.lastName
                ? `${m.executiveChef.user.firstName} ${m.executiveChef.user.lastName}`
                : m.executiveChef.user.name,
          }
        : null,
      studentsCount: m._count.students,
      createdAt: m.createdAt,
    }));

    const formattedProfessors = professors.map((p) => ({
      id: p.id,
      type: "PROFESSOR",
      professorType: p.type,
      userId: p.userId,
      user: p.user,
      status: p.status,
      hourlyRate: p.hourlyRate,
      availability: p.availability,
      studentsCount: p._count.studentsQuant + p._count.studentsVerbal,
      eventsCount: p._count.calendarEvents,
      createdAt: p.createdAt,
    }));

    const formattedExecutiveChefs = executiveChefs.map((e) => ({
      id: e.id,
      type: "EXECUTIVE_CHEF",
      userId: e.userId,
      user: e.user,
      status: e.status,
      mentorsCount: e._count.mentors,
      createdAt: e.createdAt,
    }));

    return NextResponse.json({
      mentors: formattedMentors,
      professors: formattedProfessors,
      executiveChefs: formattedExecutiveChefs,
      summary,
    });
  } catch (error) {
    console.error("Error fetching team:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation de l'equipe" },
      { status: 500 }
    );
  }
}
