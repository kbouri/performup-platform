import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/admin/accounting/missions/[id] - Detail d'une mission
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

    const mission = await prisma.mission.findUnique({
      where: { id },
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
        transactions: {
          select: { id: true, transactionNumber: true, date: true, amount: true },
        },
      },
    });

    if (!mission) {
      return NextResponse.json(
        { error: "Mission non trouvee" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      mission: {
        id: mission.id,
        title: mission.title,
        description: mission.description,
        date: mission.date,
        hoursWorked: mission.hoursWorked,
        amount: mission.amount,
        currency: mission.currency,
        status: mission.status,
        validatedAt: mission.validatedAt,
        paidAt: mission.paidAt,
        notes: mission.notes,
        createdAt: mission.createdAt,
        updatedAt: mission.updatedAt,
        mentor: mission.mentor
          ? {
              id: mission.mentor.id,
              name:
                mission.mentor.user.firstName && mission.mentor.user.lastName
                  ? `${mission.mentor.user.firstName} ${mission.mentor.user.lastName}`
                  : mission.mentor.user.name,
              email: mission.mentor.user.email,
            }
          : null,
        professor: mission.professor
          ? {
              id: mission.professor.id,
              name:
                mission.professor.user.firstName && mission.professor.user.lastName
                  ? `${mission.professor.user.firstName} ${mission.professor.user.lastName}`
                  : mission.professor.user.name,
              email: mission.professor.user.email,
              type: mission.professor.type,
            }
          : null,
        student: mission.student
          ? {
              id: mission.student.id,
              name:
                mission.student.user.firstName && mission.student.user.lastName
                  ? `${mission.student.user.firstName} ${mission.student.user.lastName}`
                  : mission.student.user.name,
            }
          : null,
        validator: mission.validator
          ? mission.validator.firstName && mission.validator.lastName
            ? `${mission.validator.firstName} ${mission.validator.lastName}`
            : mission.validator.name
          : null,
        createdBy: mission.creator
          ? mission.creator.firstName && mission.creator.lastName
            ? `${mission.creator.firstName} ${mission.creator.lastName}`
            : mission.creator.name
          : null,
        transactions: mission.transactions,
      },
    });
  } catch (error) {
    console.error("Error fetching mission:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation de la mission" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/accounting/missions/[id] - Modifier une mission
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

    const mission = await prisma.mission.findUnique({
      where: { id },
    });

    if (!mission) {
      return NextResponse.json(
        { error: "Mission non trouvee" },
        { status: 404 }
      );
    }

    // On ne peut modifier que les missions PENDING
    if (mission.status !== "PENDING") {
      return NextResponse.json(
        { error: "Seules les missions en attente peuvent etre modifiees" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { title, description, date, hoursWorked, amount, currency, notes } = body;

    const updatedMission = await prisma.mission.update({
      where: { id },
      data: {
        title: title ?? mission.title,
        description: description !== undefined ? description : mission.description,
        date: date ? new Date(date) : mission.date,
        hoursWorked: hoursWorked !== undefined ? hoursWorked : mission.hoursWorked,
        amount: amount ?? mission.amount,
        currency: currency ?? mission.currency,
        notes: notes !== undefined ? notes : mission.notes,
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE_MISSION",
        resourceType: "Mission",
        resourceId: id,
        metadata: { changes: body },
      },
    });

    return NextResponse.json({
      mission: {
        id: updatedMission.id,
        title: updatedMission.title,
        amount: updatedMission.amount,
        status: updatedMission.status,
      },
      message: "Mission mise a jour",
    });
  } catch (error) {
    console.error("Error updating mission:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise a jour de la mission" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/accounting/missions/[id] - Annuler une mission
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

    const mission = await prisma.mission.findUnique({
      where: { id },
      include: { transactions: true },
    });

    if (!mission) {
      return NextResponse.json(
        { error: "Mission non trouvee" },
        { status: 404 }
      );
    }

    // On ne peut pas supprimer une mission payee
    if (mission.status === "PAID") {
      return NextResponse.json(
        { error: "Une mission payee ne peut pas etre annulee" },
        { status: 400 }
      );
    }

    // Si des transactions existent, on annule seulement
    if (mission.transactions.length > 0) {
      await prisma.mission.update({
        where: { id },
        data: { status: "CANCELLED" },
      });

      return NextResponse.json({
        message: "Mission annulee (conservee car des transactions existent)",
        cancelled: true,
        deleted: false,
      });
    }

    // Sinon, suppression definitive
    await prisma.mission.delete({
      where: { id },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE_MISSION",
        resourceType: "Mission",
        resourceId: id,
        metadata: { title: mission.title },
      },
    });

    return NextResponse.json({
      message: "Mission supprimee",
      cancelled: false,
      deleted: true,
    });
  } catch (error) {
    console.error("Error deleting mission:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la mission" },
      { status: 500 }
    );
  }
}
