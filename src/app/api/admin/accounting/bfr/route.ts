import { NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/admin/accounting/bfr - BFR (Besoin en Fonds de Roulement) par etudiant
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

    const today = new Date();

    // Recuperer tous les devis avec leurs echeanciers
    const quotes = await prisma.quote.findMany({
      where: {
        status: { in: ["PENDING", "ACCEPTED"] },
      },
      include: {
        student: {
          select: {
            id: true,
            user: {
              select: { firstName: true, lastName: true, email: true },
            },
          },
        },
        paymentSchedules: {
          select: {
            id: true,
            amount: true,
            paidAmount: true,
            dueDate: true,
            status: true,
            currency: true,
          },
        },
      },
    });

    // Calculer le BFR par etudiant
    const bfrByStudent: Array<{
      studentId: string;
      studentName: string;
      email: string;
      quoteId: string;
      totalQuote: number;
      currency: string;
      totalPaid: number;
      totalRemaining: number;
      overdueAmount: number;
      upcomingAmount: number;
      schedules: Array<{
        id: string;
        amount: number;
        paidAmount: number;
        remaining: number;
        dueDate: string;
        status: string;
        isOverdue: boolean;
      }>;
    }> = [];

    for (const quote of quotes) {
      if (!quote.student) continue;

      const studentName = `${quote.student.user?.firstName || ""} ${quote.student.user?.lastName || ""}`.trim() || "Sans nom";
      const currency = quote.currency || "EUR";

      let totalPaid = 0;
      let totalRemaining = 0;
      let overdueAmount = 0;
      let upcomingAmount = 0;

      const schedules = quote.paymentSchedules.map((schedule) => {
        const remaining = schedule.amount - (schedule.paidAmount || 0);
        const isOverdue = schedule.dueDate < today && remaining > 0;

        totalPaid += schedule.paidAmount || 0;
        totalRemaining += remaining;

        if (isOverdue) {
          overdueAmount += remaining;
        } else if (remaining > 0) {
          upcomingAmount += remaining;
        }

        return {
          id: schedule.id,
          amount: schedule.amount,
          paidAmount: schedule.paidAmount || 0,
          remaining,
          dueDate: schedule.dueDate.toISOString(),
          status: schedule.status,
          isOverdue,
        };
      });

      bfrByStudent.push({
        studentId: quote.student.id,
        studentName,
        email: quote.student.user?.email || "",
        quoteId: quote.id,
        totalQuote: quote.totalAmount,
        currency,
        totalPaid,
        totalRemaining,
        overdueAmount,
        upcomingAmount,
        schedules: schedules.sort((a, b) =>
          new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        ),
      });
    }

    // Trier par montant restant decroissant
    bfrByStudent.sort((a, b) => b.totalRemaining - a.totalRemaining);

    // Totaux par devise
    const totalsByCurrency: Record<string, {
      totalQuotes: number;
      totalPaid: number;
      totalRemaining: number;
      overdueAmount: number;
      upcomingAmount: number;
      studentCount: number;
    }> = {};

    for (const student of bfrByStudent) {
      if (!totalsByCurrency[student.currency]) {
        totalsByCurrency[student.currency] = {
          totalQuotes: 0,
          totalPaid: 0,
          totalRemaining: 0,
          overdueAmount: 0,
          upcomingAmount: 0,
          studentCount: 0,
        };
      }
      totalsByCurrency[student.currency].totalQuotes += student.totalQuote;
      totalsByCurrency[student.currency].totalPaid += student.totalPaid;
      totalsByCurrency[student.currency].totalRemaining += student.totalRemaining;
      totalsByCurrency[student.currency].overdueAmount += student.overdueAmount;
      totalsByCurrency[student.currency].upcomingAmount += student.upcomingAmount;
      totalsByCurrency[student.currency].studentCount += 1;
    }

    // Identifier les etudiants en retard
    const overdueStudents = bfrByStudent.filter((s) => s.overdueAmount > 0);

    // Etudiants avec paiement a venir dans les 30 jours
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const upcomingPayments = bfrByStudent
      .flatMap((student) =>
        student.schedules
          .filter((s) => {
            const dueDate = new Date(s.dueDate);
            return dueDate >= today && dueDate <= thirtyDaysFromNow && s.remaining > 0;
          })
          .map((s) => ({
            studentId: student.studentId,
            studentName: student.studentName,
            scheduleId: s.id,
            amount: s.remaining,
            currency: student.currency,
            dueDate: s.dueDate,
          }))
      )
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    return NextResponse.json({
      students: bfrByStudent,
      totalsByCurrency,
      overdueStudents: overdueStudents.map((s) => ({
        studentId: s.studentId,
        studentName: s.studentName,
        overdueAmount: s.overdueAmount,
        currency: s.currency,
      })),
      upcomingPayments,
      summary: {
        totalStudents: bfrByStudent.length,
        overdueCount: overdueStudents.length,
        upcomingPaymentsCount: upcomingPayments.length,
        currencies: Object.keys(totalsByCurrency),
      },
    });
  } catch (error) {
    console.error("Error fetching BFR:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation du BFR" },
      { status: 500 }
    );
  }
}
