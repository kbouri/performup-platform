import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/admin/team/professors/[id] - Detail d'un professeur
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const professor = await prisma.professor.findUnique({
      where: { id },
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
            createdAt: true,
          },
        },
        studentsQuant: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
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
        },
        studentsVerbal: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
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
        },
        calendarEvents: {
          orderBy: { startTime: "desc" },
          take: 20,
          include: {
            student: {
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
          },
        },
        payments: {
          orderBy: { paymentDate: "desc" },
          take: 10,
        },
      },
    });

    if (!professor) {
      return NextResponse.json(
        { error: "Professeur non trouve" },
        { status: 404 }
      );
    }

    // Get stats for this month
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const eventsThisMonth = professor.calendarEvents.filter(
      (e) => e.startTime >= currentMonth && e.startTime < nextMonth
    );
    const completedEventsThisMonth = eventsThisMonth.filter((e) => e.completed);

    // Calculate hours and earnings
    const hoursThisMonth = completedEventsThisMonth.reduce((sum, e) => {
      const duration =
        (new Date(e.endTime).getTime() - new Date(e.startTime).getTime()) /
        (1000 * 60 * 60);
      return sum + duration;
    }, 0);

    const earningsThisMonth = professor.hourlyRate
      ? (hoursThisMonth * professor.hourlyRate) / 100
      : 0;

    // Combine students based on professor type
    const students =
      professor.type === "QUANT"
        ? professor.studentsQuant
        : professor.studentsVerbal;

    return NextResponse.json({
      professor: {
        id: professor.id,
        userId: professor.userId,
        user: professor.user,
        type: professor.type,
        status: professor.status,
        hourlyRate: professor.hourlyRate,
        availability: professor.availability,
        invitedAt: professor.invitedAt,
        activatedAt: professor.activatedAt,
        deactivatedAt: professor.deactivatedAt,
        createdAt: professor.createdAt,
      },
      students: students.map((s) => ({
        id: s.id,
        userId: s.userId,
        status: s.status,
        user: s.user,
        packs: s.packs.map((p) => ({
          id: p.id,
          packName: p.pack.displayName,
          progress: p.progressPercent,
          status: p.status,
        })),
      })),
      stats: {
        totalStudents:
          professor.studentsQuant.length + professor.studentsVerbal.length,
        activeStudents:
          professor.studentsQuant.filter((s) => s.status === "EN_COURS")
            .length +
          professor.studentsVerbal.filter((s) => s.status === "EN_COURS")
            .length,
        totalEvents: professor.calendarEvents.length,
        eventsThisMonth: eventsThisMonth.length,
        completedEventsThisMonth: completedEventsThisMonth.length,
        hoursThisMonth: Math.round(hoursThisMonth * 10) / 10,
        earningsThisMonth,
        totalPaymentsReceived:
          professor.payments.reduce((sum, p) => sum + p.amount, 0) / 100,
      },
      recentEvents: professor.calendarEvents.slice(0, 10).map((e) => ({
        id: e.id,
        title: e.title,
        eventType: e.eventType,
        startTime: e.startTime,
        endTime: e.endTime,
        completed: e.completed,
        studentName:
          e.student.user.firstName && e.student.user.lastName
            ? `${e.student.user.firstName} ${e.student.user.lastName}`
            : e.student.user.name,
      })),
      recentPayments: professor.payments.slice(0, 5).map((p) => ({
        id: p.id,
        amount: p.amount / 100,
        paymentDate: p.paymentDate,
        status: p.status,
      })),
    });
  } catch (error) {
    console.error("Error fetching professor:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation du professeur" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/team/professors/[id] - Modifier un professeur
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();

    const { firstName, lastName, phone, type, hourlyRate, availability, status } =
      body;

    const professor = await prisma.professor.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!professor) {
      return NextResponse.json(
        { error: "Professeur non trouve" },
        { status: 404 }
      );
    }

    // Update in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update user if name/phone changed
      if (firstName || lastName || phone) {
        await tx.user.update({
          where: { id: professor.userId },
          data: {
            ...(firstName && { firstName }),
            ...(lastName && { lastName }),
            ...(firstName && lastName && { name: `${firstName} ${lastName}` }),
            ...(phone && { phone }),
          },
        });
      }

      // Build professor update data
      const professorUpdateData: Record<string, unknown> = {};

      if (type !== undefined) professorUpdateData.type = type;
      if (hourlyRate !== undefined)
        professorUpdateData.hourlyRate = parseInt(hourlyRate);
      if (availability !== undefined)
        professorUpdateData.availability = availability;

      if (status !== undefined) {
        professorUpdateData.status = status;
        if (status === "INACTIVE") {
          professorUpdateData.deactivatedAt = new Date();
          professorUpdateData.deactivatedBy = session.user.id;
        } else if (status === "ACTIVE" && professor.status !== "ACTIVE") {
          professorUpdateData.activatedAt = new Date();
          professorUpdateData.deactivatedAt = null;
          professorUpdateData.deactivatedBy = null;
        }
      }

      const updatedProfessor = await tx.professor.update({
        where: { id },
        data: professorUpdateData,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              name: true,
              phone: true,
            },
          },
        },
      });

      // Log audit
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "UPDATE_PROFESSOR",
          resourceType: "Professor",
          resourceId: id,
          metadata: {
            changes: body,
            updatedBy: session.user.email,
          },
        },
      });

      return updatedProfessor;
    });

    return NextResponse.json({ professor: result });
  } catch (error) {
    console.error("Error updating professor:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise a jour du professeur" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/team/professors/[id] - Desactiver un professeur
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const professor = await prisma.professor.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            studentsQuant: true,
            studentsVerbal: true,
          },
        },
      },
    });

    if (!professor) {
      return NextResponse.json(
        { error: "Professeur non trouve" },
        { status: 404 }
      );
    }

    // Soft delete
    await prisma.$transaction(async (tx) => {
      await tx.professor.update({
        where: { id },
        data: {
          status: "INACTIVE",
          deactivatedAt: new Date(),
          deactivatedBy: session.user.id,
        },
      });

      await tx.user.update({
        where: { id: professor.userId },
        data: { active: false },
      });

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "DEACTIVATE_PROFESSOR",
          resourceType: "Professor",
          resourceId: id,
          metadata: {
            type: professor.type,
            hadStudents:
              professor._count.studentsQuant + professor._count.studentsVerbal,
            deactivatedBy: session.user.email,
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Professeur desactive avec succes",
    });
  } catch (error) {
    console.error("Error deactivating professor:", error);
    return NextResponse.json(
      { error: "Erreur lors de la desactivation du professeur" },
      { status: 500 }
    );
  }
}
