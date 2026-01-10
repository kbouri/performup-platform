import { NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/admin/dashboard - Get admin dashboard KPIs
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    if (!isAdmin(session.user)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // Get counts
    const [
      totalStudents,
      activeStudents,
      totalMentors,
      totalProfessors,
      totalEssays,
      pendingTasks,
      upcomingEvents,
    ] = await Promise.all([
      prisma.student.count(),
      prisma.student.count({
        where: { status: { in: ["EN_COURS", "EN_DEMARRAGE"] } },
      }),
      prisma.mentor.count(),
      prisma.professor.count(),
      prisma.essay.count(),
      prisma.task.count({ where: { completed: false } }),
      prisma.calendarEvent.count({
        where: { startTime: { gte: new Date() } },
      }),
    ]);

    // Get payment stats
    const paymentStats = await prisma.payment.aggregate({
      where: { status: "VALIDATED" },
      _sum: { amount: true },
    });

    const expectedPayments = await prisma.paymentSchedule.aggregate({
      _sum: { amount: true },
    });

    // Get recent students
    const recentStudents = await prisma.student.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        packs: {
          include: {
            pack: {
              select: {
                displayName: true,
              },
            },
          },
        },
      },
    });

    // Get upcoming events
    const nextEvents = await prisma.calendarEvent.findMany({
      where: { startTime: { gte: new Date() } },
      take: 5,
      orderBy: { startTime: "asc" },
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

    // Get status distribution
    const statusDistribution = await prisma.student.groupBy({
      by: ["status"],
      _count: true,
    });

    return NextResponse.json({
      kpis: {
        totalStudents,
        activeStudents,
        totalMentors,
        totalProfessors,
        totalEssays,
        pendingTasks,
        upcomingEvents,
        totalRevenue: paymentStats._sum.amount || 0,
        expectedRevenue: expectedPayments._sum.amount || 0,
      },
      recentStudents: recentStudents.map((s) => ({
        id: s.id,
        name: s.user.name,
        email: s.user.email,
        status: s.status,
        packs: s.packs.map((p) => p.pack.displayName),
        createdAt: s.createdAt,
      })),
      nextEvents: nextEvents.map((e) => ({
        id: e.id,
        title: e.title,
        eventType: e.eventType,
        startTime: e.startTime,
        student: e.student.user.name,
        instructor: e.instructor?.user.name,
      })),
      statusDistribution: statusDistribution.reduce(
        (acc, s) => ({
          ...acc,
          [s.status]: s._count,
        }),
        {}
      ),
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des données" },
      { status: 500 }
    );
  }
}

