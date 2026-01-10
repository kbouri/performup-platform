import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/admin/team/executive-chefs/[id] - Detail d'un chef executif
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

    const executiveChef = await prisma.executiveChef.findUnique({
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
        mentors: {
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
            students: {
              include: {
                user: {
                  select: {
                    id: true,
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
                payments: true,
              },
            },
          },
        },
      },
    });

    if (!executiveChef) {
      return NextResponse.json(
        { error: "Chef executif non trouve" },
        { status: 404 }
      );
    }

    // Calculate total students supervised
    const totalStudents = executiveChef.mentors.reduce(
      (sum, m) => sum + m._count.students,
      0
    );

    // Get all students from all mentors
    const allStudents = executiveChef.mentors.flatMap((m) =>
      m.students.map((s) => ({
        id: s.id,
        userId: s.userId,
        status: s.status,
        user: s.user,
        mentorId: m.id,
        mentorName:
          m.user.firstName && m.user.lastName
            ? `${m.user.firstName} ${m.user.lastName}`
            : m.user.name,
      }))
    );

    return NextResponse.json({
      executiveChef: {
        id: executiveChef.id,
        userId: executiveChef.userId,
        user: executiveChef.user,
        status: executiveChef.status,
        invitedAt: executiveChef.invitedAt,
        activatedAt: executiveChef.activatedAt,
        deactivatedAt: executiveChef.deactivatedAt,
        createdAt: executiveChef.createdAt,
      },
      mentors: executiveChef.mentors.map((m) => ({
        id: m.id,
        userId: m.userId,
        user: m.user,
        status: m.status,
        specialties: m.specialties,
        studentsCount: m._count.students,
        paymentsCount: m._count.payments,
      })),
      stats: {
        totalMentors: executiveChef.mentors.length,
        activeMentors: executiveChef.mentors.filter(
          (m) => m.status === "ACTIVE"
        ).length,
        totalStudents,
        activeStudents: allStudents.filter((s) => s.status === "EN_COURS")
          .length,
      },
      students: allStudents,
    });
  } catch (error) {
    console.error("Error fetching executive chef:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation du chef executif" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/team/executive-chefs/[id] - Modifier un chef executif
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

    const { firstName, lastName, phone, status } = body;

    const executiveChef = await prisma.executiveChef.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!executiveChef) {
      return NextResponse.json(
        { error: "Chef executif non trouve" },
        { status: 404 }
      );
    }

    // Update in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update user if name/phone changed
      if (firstName || lastName || phone) {
        await tx.user.update({
          where: { id: executiveChef.userId },
          data: {
            ...(firstName && { firstName }),
            ...(lastName && { lastName }),
            ...(firstName && lastName && { name: `${firstName} ${lastName}` }),
            ...(phone && { phone }),
          },
        });
      }

      // Build update data
      const updateData: Record<string, unknown> = {};

      if (status !== undefined) {
        updateData.status = status;
        if (status === "INACTIVE") {
          updateData.deactivatedAt = new Date();
          updateData.deactivatedBy = session.user.id;
        } else if (status === "ACTIVE" && executiveChef.status !== "ACTIVE") {
          updateData.activatedAt = new Date();
          updateData.deactivatedAt = null;
          updateData.deactivatedBy = null;
        }
      }

      const updated = await tx.executiveChef.update({
        where: { id },
        data: updateData,
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
          action: "UPDATE_EXECUTIVE_CHEF",
          resourceType: "ExecutiveChef",
          resourceId: id,
          metadata: {
            changes: body,
            updatedBy: session.user.email,
          },
        },
      });

      return updated;
    });

    return NextResponse.json({ executiveChef: result });
  } catch (error) {
    console.error("Error updating executive chef:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise a jour du chef executif" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/team/executive-chefs/[id] - Desactiver un chef executif
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

    const executiveChef = await prisma.executiveChef.findUnique({
      where: { id },
      include: {
        _count: {
          select: { mentors: true },
        },
      },
    });

    if (!executiveChef) {
      return NextResponse.json(
        { error: "Chef executif non trouve" },
        { status: 404 }
      );
    }

    // Soft delete
    await prisma.$transaction(async (tx) => {
      await tx.executiveChef.update({
        where: { id },
        data: {
          status: "INACTIVE",
          deactivatedAt: new Date(),
          deactivatedBy: session.user.id,
        },
      });

      await tx.user.update({
        where: { id: executiveChef.userId },
        data: { active: false },
      });

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "DEACTIVATE_EXECUTIVE_CHEF",
          resourceType: "ExecutiveChef",
          resourceId: id,
          metadata: {
            hadMentors: executiveChef._count.mentors,
            deactivatedBy: session.user.email,
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Chef executif desactive avec succes",
    });
  } catch (error) {
    console.error("Error deactivating executive chef:", error);
    return NextResponse.json(
      { error: "Erreur lors de la desactivation du chef executif" },
      { status: 500 }
    );
  }
}
