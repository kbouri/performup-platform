import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// POST /api/admin/team/payments/calculate - Calculer les montants dus
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
    const { period, collaboratorId, collaboratorType } = body;

    // Parse period (YYYY-MM format) or use current month
    let startDate: Date;
    let endDate: Date;

    if (period) {
      const [year, month] = period.split("-").map(Number);
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59, 999);
    } else {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    const calculations: Array<{
      collaboratorId: string;
      collaboratorType: string;
      collaboratorName: string;
      email: string;
      hourlyRate: number;
      hoursWorked: number;
      eventsCount: number;
      completedEventsCount: number;
      amountDue: number;
      alreadyPaid: number;
      remaining: number;
    }> = [];

    // Calculate for mentors
    if (!collaboratorType || collaboratorType === "MENTOR") {
      const mentorWhere: Record<string, unknown> = { status: "ACTIVE" };
      if (collaboratorId && collaboratorType === "MENTOR") {
        mentorWhere.id = collaboratorId;
      }

      const mentors = await prisma.mentor.findMany({
        where: mentorWhere,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              name: true,
              email: true,
            },
          },
          students: {
            select: { id: true },
          },
        },
      });

      for (const mentor of mentors) {
        if (!mentor.hourlyRate) continue;

        // Get student IDs for this mentor
        const studentIds = mentor.students.map((s) => s.id);

        // Count mentor sessions (SESSION_MENTOR) for mentor's students
        const events = await prisma.calendarEvent.findMany({
          where: {
            eventType: "SESSION_MENTOR",
            studentId: { in: studentIds },
            startTime: { gte: startDate, lte: endDate },
          },
        });

        const completedEvents = events.filter((e) => e.completed);

        // Calculate hours (difference between start and end time)
        const hoursWorked = completedEvents.reduce((sum, e) => {
          const duration =
            (new Date(e.endTime).getTime() - new Date(e.startTime).getTime()) /
            (1000 * 60 * 60);
          return sum + duration;
        }, 0);

        const amountDue = (hoursWorked * mentor.hourlyRate) / 100;

        // Get already paid amount for this period
        const paidPayments = await prisma.payment.aggregate({
          where: {
            mentorId: mentor.id,
            paymentDate: { gte: startDate, lte: endDate },
            status: "VALIDATED",
          },
          _sum: { amount: true },
        });

        const alreadyPaid = (paidPayments._sum.amount || 0) / 100;

        calculations.push({
          collaboratorId: mentor.id,
          collaboratorType: "MENTOR",
          collaboratorName:
            mentor.user.firstName && mentor.user.lastName
              ? `${mentor.user.firstName} ${mentor.user.lastName}`
              : mentor.user.name || "N/A",
          email: mentor.user.email,
          hourlyRate: mentor.hourlyRate / 100,
          hoursWorked: Math.round(hoursWorked * 10) / 10,
          eventsCount: events.length,
          completedEventsCount: completedEvents.length,
          amountDue: Math.round(amountDue * 100) / 100,
          alreadyPaid,
          remaining: Math.round((amountDue - alreadyPaid) * 100) / 100,
        });
      }
    }

    // Calculate for professors
    if (!collaboratorType || collaboratorType === "PROFESSOR") {
      const professorWhere: Record<string, unknown> = { status: "ACTIVE" };
      if (collaboratorId && collaboratorType === "PROFESSOR") {
        professorWhere.id = collaboratorId;
      }

      const professors = await prisma.professor.findMany({
        where: professorWhere,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              name: true,
              email: true,
            },
          },
        },
      });

      for (const professor of professors) {
        if (!professor.hourlyRate) continue;

        // Get events where this professor is the instructor
        const events = await prisma.calendarEvent.findMany({
          where: {
            instructorId: professor.id,
            startTime: { gte: startDate, lte: endDate },
          },
        });

        const completedEvents = events.filter((e) => e.completed);

        // Calculate hours
        const hoursWorked = completedEvents.reduce((sum, e) => {
          const duration =
            (new Date(e.endTime).getTime() - new Date(e.startTime).getTime()) /
            (1000 * 60 * 60);
          return sum + duration;
        }, 0);

        const amountDue = (hoursWorked * professor.hourlyRate) / 100;

        // Get already paid amount
        const paidPayments = await prisma.payment.aggregate({
          where: {
            professorId: professor.id,
            paymentDate: { gte: startDate, lte: endDate },
            status: "VALIDATED",
          },
          _sum: { amount: true },
        });

        const alreadyPaid = (paidPayments._sum.amount || 0) / 100;

        calculations.push({
          collaboratorId: professor.id,
          collaboratorType: "PROFESSOR",
          collaboratorName:
            professor.user.firstName && professor.user.lastName
              ? `${professor.user.firstName} ${professor.user.lastName}`
              : professor.user.name || "N/A",
          email: professor.user.email,
          hourlyRate: professor.hourlyRate / 100,
          hoursWorked: Math.round(hoursWorked * 10) / 10,
          eventsCount: events.length,
          completedEventsCount: completedEvents.length,
          amountDue: Math.round(amountDue * 100) / 100,
          alreadyPaid,
          remaining: Math.round((amountDue - alreadyPaid) * 100) / 100,
        });
      }
    }

    // Calculate summary
    const summary = {
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        label: `${startDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`,
      },
      totalCollaborators: calculations.length,
      totalHoursWorked: calculations.reduce((sum, c) => sum + c.hoursWorked, 0),
      totalEventsCompleted: calculations.reduce(
        (sum, c) => sum + c.completedEventsCount,
        0
      ),
      totalAmountDue: calculations.reduce((sum, c) => sum + c.amountDue, 0),
      totalAlreadyPaid: calculations.reduce((sum, c) => sum + c.alreadyPaid, 0),
      totalRemaining: calculations.reduce((sum, c) => sum + c.remaining, 0),
      byType: {
        mentors: {
          count: calculations.filter((c) => c.collaboratorType === "MENTOR")
            .length,
          totalDue: calculations
            .filter((c) => c.collaboratorType === "MENTOR")
            .reduce((sum, c) => sum + c.amountDue, 0),
        },
        professors: {
          count: calculations.filter((c) => c.collaboratorType === "PROFESSOR")
            .length,
          totalDue: calculations
            .filter((c) => c.collaboratorType === "PROFESSOR")
            .reduce((sum, c) => sum + c.amountDue, 0),
        },
      },
    };

    return NextResponse.json({
      calculations: calculations.sort((a, b) => b.amountDue - a.amountDue),
      summary,
    });
  } catch (error) {
    console.error("Error calculating team payments:", error);
    return NextResponse.json(
      { error: "Erreur lors du calcul des paiements" },
      { status: 500 }
    );
  }
}
