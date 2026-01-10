import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/admin/team/mentors/[id] - Detail d'un mentor
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

    const mentor = await prisma.mentor.findUnique({
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
        executiveChef: {
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
          },
        },
        students: {
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
        payments: {
          orderBy: { paymentDate: "desc" },
          take: 10,
        },
        paymentSchedules: {
          orderBy: { dueDate: "desc" },
          take: 10,
        },
      },
    });

    if (!mentor) {
      return NextResponse.json({ error: "Mentor non trouve" }, { status: 404 });
    }

    // Get calendar events for this mentor's students
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const studentIds = mentor.students.map((s) => s.id);

    const sessionsThisMonth = await prisma.calendarEvent.findMany({
      where: {
        eventType: "SESSION_MENTOR",
        studentId: { in: studentIds },
        startTime: { gte: currentMonth },
        endTime: { lt: nextMonth },
      },
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
      orderBy: { startTime: "asc" },
    });

    // Calculate total hours worked and earnings
    const completedSessions = sessionsThisMonth.filter((s) => s.completed);
    const totalHoursThisMonth = completedSessions.length * 1.5; // Assuming 1.5h per session
    const earningsThisMonth = mentor.hourlyRate
      ? (totalHoursThisMonth * mentor.hourlyRate) / 100
      : 0;

    // Get total payments received
    const totalPaymentsReceived = mentor.payments.reduce(
      (sum, p) => sum + p.amount,
      0
    );

    return NextResponse.json({
      mentor: {
        id: mentor.id,
        userId: mentor.userId,
        user: mentor.user,
        status: mentor.status,
        specialties: mentor.specialties,
        bio: mentor.bio,
        hourlyRate: mentor.hourlyRate,
        paymentType: mentor.paymentType,
        executiveChef: mentor.executiveChef
          ? {
              id: mentor.executiveChef.id,
              userId: mentor.executiveChef.userId,
              user: mentor.executiveChef.user,
            }
          : null,
        students: mentor.students.map((s) => ({
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
        invitedAt: mentor.invitedAt,
        activatedAt: mentor.activatedAt,
        deactivatedAt: mentor.deactivatedAt,
        createdAt: mentor.createdAt,
      },
      stats: {
        totalStudents: mentor.students.length,
        activeStudents: mentor.students.filter((s) => s.status === "EN_COURS")
          .length,
        sessionsThisMonth: sessionsThisMonth.length,
        completedSessionsThisMonth: completedSessions.length,
        totalHoursThisMonth,
        earningsThisMonth,
        totalPaymentsReceived: totalPaymentsReceived / 100,
      },
      recentSessions: sessionsThisMonth.slice(0, 5).map((s) => ({
        id: s.id,
        title: s.title,
        startTime: s.startTime,
        endTime: s.endTime,
        completed: s.completed,
        studentName:
          s.student.user.firstName && s.student.user.lastName
            ? `${s.student.user.firstName} ${s.student.user.lastName}`
            : s.student.user.name,
      })),
      recentPayments: mentor.payments.slice(0, 5).map((p) => ({
        id: p.id,
        amount: p.amount / 100,
        paymentDate: p.paymentDate,
        status: p.status,
      })),
    });
  } catch (error) {
    console.error("Error fetching mentor:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation du mentor" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/team/mentors/[id] - Modifier un mentor
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

    const {
      firstName,
      lastName,
      phone,
      specialties,
      bio,
      hourlyRate,
      paymentType,
      executiveChefId,
      status,
    } = body;

    const mentor = await prisma.mentor.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!mentor) {
      return NextResponse.json({ error: "Mentor non trouve" }, { status: 404 });
    }

    // Update in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update user if name/phone changed
      if (firstName || lastName || phone) {
        await tx.user.update({
          where: { id: mentor.userId },
          data: {
            ...(firstName && { firstName }),
            ...(lastName && { lastName }),
            ...(firstName && lastName && { name: `${firstName} ${lastName}` }),
            ...(phone && { phone }),
          },
        });
      }

      // Build mentor update data
      const mentorUpdateData: Record<string, unknown> = {};

      if (specialties !== undefined) mentorUpdateData.specialties = specialties;
      if (bio !== undefined) mentorUpdateData.bio = bio;
      if (hourlyRate !== undefined)
        mentorUpdateData.hourlyRate = parseInt(hourlyRate);
      if (paymentType !== undefined) mentorUpdateData.paymentType = paymentType;
      if (executiveChefId !== undefined)
        mentorUpdateData.executiveChefId = executiveChefId || null;

      if (status !== undefined) {
        mentorUpdateData.status = status;
        if (status === "INACTIVE") {
          mentorUpdateData.deactivatedAt = new Date();
          mentorUpdateData.deactivatedBy = session.user.id;
        } else if (status === "ACTIVE" && mentor.status !== "ACTIVE") {
          mentorUpdateData.activatedAt = new Date();
          mentorUpdateData.deactivatedAt = null;
          mentorUpdateData.deactivatedBy = null;
        }
      }

      const updatedMentor = await tx.mentor.update({
        where: { id },
        data: mentorUpdateData,
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
        },
      });

      // Log audit
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "UPDATE_MENTOR",
          resourceType: "Mentor",
          resourceId: id,
          metadata: {
            changes: body,
            updatedBy: session.user.email,
          },
        },
      });

      return updatedMentor;
    });

    return NextResponse.json({ mentor: result });
  } catch (error) {
    console.error("Error updating mentor:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise a jour du mentor" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/team/mentors/[id] - Desactiver un mentor (soft delete)
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

    const mentor = await prisma.mentor.findUnique({
      where: { id },
      include: {
        _count: {
          select: { students: true },
        },
      },
    });

    if (!mentor) {
      return NextResponse.json({ error: "Mentor non trouve" }, { status: 404 });
    }

    // Soft delete - set status to INACTIVE
    await prisma.$transaction(async (tx) => {
      await tx.mentor.update({
        where: { id },
        data: {
          status: "INACTIVE",
          deactivatedAt: new Date(),
          deactivatedBy: session.user.id,
        },
      });

      // Also deactivate user
      await tx.user.update({
        where: { id: mentor.userId },
        data: { active: false },
      });

      // Log audit
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "DEACTIVATE_MENTOR",
          resourceType: "Mentor",
          resourceId: id,
          metadata: {
            hadStudents: mentor._count.students,
            deactivatedBy: session.user.email,
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Mentor desactive avec succes",
    });
  } catch (error) {
    console.error("Error deactivating mentor:", error);
    return NextResponse.json(
      { error: "Erreur lors de la desactivation du mentor" },
      { status: 500 }
    );
  }
}
