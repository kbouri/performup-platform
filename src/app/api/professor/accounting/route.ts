import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/professor/accounting - Vue comptabilite complete pour le professeur
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    // Trouver le profil professeur
    const professor = await prisma.professor.findUnique({
      where: { userId: session.user.id },
      include: {
        user: {
          select: { name: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!professor) {
      return NextResponse.json(
        { error: "Profil professeur non trouve" },
        { status: 404 }
      );
    }

    // Recuperer les missions
    const missions = await prisma.mission.findMany({
      where: { professorId: professor.id },
      orderBy: { date: "desc" },
      include: {
        student: {
          include: {
            user: { select: { name: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    // Recuperer les paiements
    const payments = await prisma.payment.findMany({
      where: {
        professorId: professor.id,
        status: "VALIDATED",
      },
      orderBy: { paymentDate: "desc" },
      select: {
        id: true,
        amount: true,
        currency: true,
        paymentDate: true,
        notes: true,
      },
    });

    // Calculer les statistiques
    const totalEarned = payments.reduce((sum, p) => sum + p.amount, 0);
    const pendingMissions = missions.filter((m) => m.status === "PENDING");
    const validatedMissions = missions.filter((m) => m.status === "VALIDATED");
    const pendingAmount = pendingMissions.reduce((sum, m) => sum + m.amount, 0);
    const validatedAmount = validatedMissions.reduce((sum, m) => sum + m.amount, 0);

    // Revenus par mois (derniers 6 mois)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const revenueByMonth: Record<string, number> = {};
    for (const payment of payments) {
      if (new Date(payment.paymentDate) >= sixMonthsAgo) {
        const monthKey = new Date(payment.paymentDate).toISOString().slice(0, 7);
        revenueByMonth[monthKey] = (revenueByMonth[monthKey] || 0) + payment.amount;
      }
    }

    return NextResponse.json({
      professor: {
        id: professor.id,
        name:
          professor.user.firstName && professor.user.lastName
            ? `${professor.user.firstName} ${professor.user.lastName}`
            : professor.user.name,
        email: professor.user.email,
        type: professor.type,
        hourlyRate: professor.hourlyRate,
      },
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
        student: m.student
          ? {
              id: m.student.id,
              name:
                m.student.user.firstName && m.student.user.lastName
                  ? `${m.student.user.firstName} ${m.student.user.lastName}`
                  : m.student.user.name,
            }
          : null,
        createdAt: m.createdAt,
      })),
      payments: payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        paymentDate: p.paymentDate,
        notes: p.notes,
      })),
      summary: {
        totalEarned,
        pendingAmount,
        validatedAmount,
        missionCount: missions.length,
        pendingMissions: pendingMissions.length,
        validatedMissions: validatedMissions.length,
        paidMissions: missions.filter((m) => m.status === "PAID").length,
        paymentCount: payments.length,
      },
      revenueByMonth,
    });
  } catch (error) {
    console.error("Error fetching professor accounting:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation des donnees comptables" },
      { status: 500 }
    );
  }
}
