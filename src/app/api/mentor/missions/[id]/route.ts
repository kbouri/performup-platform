import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/mentor/missions/[id] - Detail d'une mission
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

    // Trouver le profil mentor
    const mentor = await prisma.mentor.findUnique({
      where: { userId: session.user.id },
    });

    if (!mentor) {
      return NextResponse.json(
        { error: "Profil mentor non trouve" },
        { status: 404 }
      );
    }

    const { id } = await params;

    const mission = await prisma.mission.findFirst({
      where: {
        id,
        mentorId: mentor.id, // S'assurer que c'est bien une mission du mentor
      },
      include: {
        student: {
          include: {
            user: { select: { name: true, firstName: true, lastName: true, email: true } },
          },
        },
        validator: {
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
        student: mission.student
          ? {
              id: mission.student.id,
              name:
                mission.student.user.firstName && mission.student.user.lastName
                  ? `${mission.student.user.firstName} ${mission.student.user.lastName}`
                  : mission.student.user.name,
              email: mission.student.user.email,
            }
          : null,
        validator: mission.validator
          ? mission.validator.firstName && mission.validator.lastName
            ? `${mission.validator.firstName} ${mission.validator.lastName}`
            : mission.validator.name
          : null,
        transactions: mission.transactions,
      },
    });
  } catch (error) {
    console.error("Error fetching mentor mission:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation de la mission" },
      { status: 500 }
    );
  }
}

// PATCH /api/mentor/missions/[id] - Modifier une mission (seulement si PENDING)
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

    // Trouver le profil mentor
    const mentor = await prisma.mentor.findUnique({
      where: { userId: session.user.id },
    });

    if (!mentor) {
      return NextResponse.json(
        { error: "Profil mentor non trouve" },
        { status: 404 }
      );
    }

    const { id } = await params;

    const mission = await prisma.mission.findFirst({
      where: {
        id,
        mentorId: mentor.id,
      },
    });

    if (!mission) {
      return NextResponse.json(
        { error: "Mission non trouvee" },
        { status: 404 }
      );
    }

    // Seules les missions en attente peuvent etre modifiees par le mentor
    if (mission.status !== "PENDING") {
      return NextResponse.json(
        { error: "Seules les missions en attente peuvent etre modifiees" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { title, description, date, hoursWorked, notes } = body;

    const updateData: Record<string, unknown> = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (date !== undefined) updateData.date = new Date(date);
    if (hoursWorked !== undefined) {
      updateData.hoursWorked = hoursWorked;
      // Recalculer le montant si heures modifiees
      if (mentor.hourlyRate) {
        updateData.amount = Math.round(hoursWorked * mentor.hourlyRate);
      }
    }
    if (notes !== undefined) updateData.notes = notes;

    const updatedMission = await prisma.mission.update({
      where: { id },
      data: updateData,
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE_MISSION_BY_MENTOR",
        resourceType: "Mission",
        resourceId: id,
        metadata: { changes: body },
      },
    });

    return NextResponse.json({
      mission: {
        id: updatedMission.id,
        title: updatedMission.title,
        description: updatedMission.description,
        date: updatedMission.date,
        hoursWorked: updatedMission.hoursWorked,
        amount: updatedMission.amount,
        status: updatedMission.status,
      },
      message: "Mission mise a jour avec succes",
    });
  } catch (error) {
    console.error("Error updating mentor mission:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise a jour de la mission" },
      { status: 500 }
    );
  }
}

// DELETE /api/mentor/missions/[id] - Annuler une mission (seulement si PENDING)
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

    // Trouver le profil mentor
    const mentor = await prisma.mentor.findUnique({
      where: { userId: session.user.id },
    });

    if (!mentor) {
      return NextResponse.json(
        { error: "Profil mentor non trouve" },
        { status: 404 }
      );
    }

    const { id } = await params;

    const mission = await prisma.mission.findFirst({
      where: {
        id,
        mentorId: mentor.id,
      },
    });

    if (!mission) {
      return NextResponse.json(
        { error: "Mission non trouvee" },
        { status: 404 }
      );
    }

    // Seules les missions en attente peuvent etre annulees par le mentor
    if (mission.status !== "PENDING") {
      return NextResponse.json(
        { error: "Seules les missions en attente peuvent etre annulees" },
        { status: 400 }
      );
    }

    await prisma.mission.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CANCEL_MISSION_BY_MENTOR",
        resourceType: "Mission",
        resourceId: id,
        metadata: { previousStatus: mission.status },
      },
    });

    return NextResponse.json({
      message: "Mission annulee avec succes",
    });
  } catch (error) {
    console.error("Error cancelling mentor mission:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'annulation de la mission" },
      { status: 500 }
    );
  }
}
