import { NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/admin/stats - Statistiques globales pour l'admin
export async function GET() {
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

    // Dates pour les calculs
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // 1. Statistiques des étudiants
    const [totalStudents, activeStudents, newStudentsThisMonth, newStudentsLastMonth] = await Promise.all([
      prisma.student.count(),
      prisma.student.count({ where: { status: "EN_COURS" } }),
      prisma.student.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.student.count({
        where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
      }),
    ]);

    // Répartition par statut et programme
    const [studentsByStatus, studentsByProgram] = await Promise.all([
      prisma.student.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
      prisma.student.groupBy({
        by: ["programType"],
        _count: { id: true },
      }),
    ]);

    // 2. Statistiques de l'équipe
    const [totalMentors, activeMentors, totalProfessors, activeProfessors, totalExecutiveChefs] = await Promise.all([
      prisma.mentor.count(),
      prisma.mentor.count({ where: { status: "ACTIVE" } }),
      prisma.professor.count(),
      prisma.professor.count({ where: { status: "ACTIVE" } }),
      prisma.executiveChef.count(),
    ]);

    // 3. Statistiques financières (paiements étudiants uniquement)
    const [paymentsThisMonth, paymentsLastMonth, paymentsThisYear, pendingPayments] = await Promise.all([
      prisma.payment.aggregate({
        where: { paymentDate: { gte: startOfMonth }, status: "VALIDATED", studentId: { not: null } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.payment.aggregate({
        where: { paymentDate: { gte: startOfLastMonth, lte: endOfLastMonth }, status: "VALIDATED", studentId: { not: null } },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { paymentDate: { gte: startOfYear }, status: "VALIDATED", studentId: { not: null } },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { status: "PENDING_VALIDATION", studentId: { not: null } },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    // 4. Statistiques des essays et écoles
    const [totalEssays, essaysByStatus, totalSchools, applicationsByStatus] = await Promise.all([
      prisma.essay.count(),
      prisma.essay.groupBy({ by: ["status"], _count: { id: true } }),
      prisma.school.count(),
      prisma.studentSchool.groupBy({ by: ["status"], _count: { id: true } }),
    ]);

    // 5. Évolution mensuelle (optimisé avec moins de requêtes)
    const monthlyEnrollments: { month: string; count: number }[] = [];
    const monthlyRevenue: { month: string; amount: number }[] = [];

    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthLabel = monthStart.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });

      const [enrollmentCount, revenueSum] = await Promise.all([
        prisma.student.count({
          where: { createdAt: { gte: monthStart, lte: monthEnd } },
        }),
        prisma.payment.aggregate({
          where: { paymentDate: { gte: monthStart, lte: monthEnd }, status: "VALIDATED", studentId: { not: null } },
          _sum: { amount: true },
        }),
      ]);

      monthlyEnrollments.push({ month: monthLabel, count: enrollmentCount });
      monthlyRevenue.push({ month: monthLabel, amount: (revenueSum._sum.amount || 0) / 100 });
    }

    // 6. Top packs vendus
    const topPacks = await prisma.studentPack.groupBy({
      by: ["packId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    });

    const packsWithNames = await Promise.all(
      topPacks.map(async (p) => {
        const pack = await prisma.pack.findUnique({
          where: { id: p.packId },
          select: { displayName: true },
        });
        return { name: pack?.displayName || "Pack inconnu", count: p._count.id };
      })
    );

    // 7. Charge de travail des mentors
    const mentorsWithStudentCount = await prisma.mentor.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        user: { select: { firstName: true, lastName: true, name: true } },
        _count: { select: { students: true } },
      },
      orderBy: { students: { _count: "desc" } },
      take: 10,
    });

    const mentorWorkload = mentorsWithStudentCount.map((m) => ({
      name: m.user.firstName && m.user.lastName
        ? `${m.user.firstName} ${m.user.lastName}`
        : m.user.name || "Mentor",
      students: m._count.students,
    }));

    // Calculs dérivés
    const conversionRate = totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0;
    const avgStudentsPerMentor = activeMentors > 0 ? Math.round((activeStudents / activeMentors) * 10) / 10 : 0;
    const revenueGrowth = (paymentsLastMonth._sum.amount || 0) > 0
      ? Math.round((((paymentsThisMonth._sum.amount || 0) - (paymentsLastMonth._sum.amount || 0)) / (paymentsLastMonth._sum.amount || 1)) * 100)
      : (paymentsThisMonth._sum.amount || 0) > 0 ? 100 : 0;
    const studentGrowth = newStudentsLastMonth > 0
      ? Math.round(((newStudentsThisMonth - newStudentsLastMonth) / newStudentsLastMonth) * 100)
      : newStudentsThisMonth > 0 ? 100 : 0;

    return NextResponse.json({
      students: {
        total: totalStudents,
        active: activeStudents,
        newThisMonth: newStudentsThisMonth,
        newLastMonth: newStudentsLastMonth,
        growthRate: studentGrowth,
        byStatus: studentsByStatus.map((s) => ({ status: s.status, count: s._count.id })),
        byProgram: studentsByProgram.map((s) => ({ program: s.programType, count: s._count.id })),
      },
      team: {
        totalMentors,
        activeMentors,
        totalProfessors,
        activeProfessors,
        totalExecutiveChefs,
        avgStudentsPerMentor,
      },
      financial: {
        revenueThisMonth: (paymentsThisMonth._sum.amount || 0) / 100,
        revenueLastMonth: (paymentsLastMonth._sum.amount || 0) / 100,
        revenueThisYear: (paymentsThisYear._sum.amount || 0) / 100,
        paymentsCountThisMonth: paymentsThisMonth._count,
        pendingAmount: (pendingPayments._sum.amount || 0) / 100,
        pendingCount: pendingPayments._count,
        revenueGrowth,
      },
      essays: {
        total: totalEssays,
        byStatus: essaysByStatus.map((e) => ({ status: e.status, count: e._count.id })),
      },
      schools: {
        total: totalSchools,
        applicationsByStatus: applicationsByStatus.map((a) => ({ status: a.status, count: a._count.id })),
      },
      charts: {
        monthlyEnrollments,
        monthlyRevenue,
        topPacks: packsWithNames,
        mentorWorkload,
      },
      kpis: {
        conversionRate,
        avgStudentsPerMentor,
        totalRevenue: (paymentsThisYear._sum.amount || 0) / 100,
      },
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la recuperation des statistiques",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
