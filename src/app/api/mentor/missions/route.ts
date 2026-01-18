import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/mentor/missions - Liste des missions du mentor
export async function GET() {
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

    const missions = await prisma.mission.findMany({
      where: { mentorId: mentor.id },
      orderBy: { date: "desc" },
      include: {
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
      },
    });

    // Statistiques
    const stats = {
      total: missions.length,
      pending: missions.filter((m) => m.status === "PENDING").length,
      validated: missions.filter((m) => m.status === "VALIDATED").length,
      paid: missions.filter((m) => m.status === "PAID").length,
      totalAmount: missions
        .filter((m) => m.status !== "CANCELLED")
        .reduce((sum, m) => sum + m.amount, 0),
      pendingAmount: missions
        .filter((m) => m.status === "PENDING")
        .reduce((sum, m) => sum + m.amount, 0),
      validatedAmount: missions
        .filter((m) => m.status === "VALIDATED")
        .reduce((sum, m) => sum + m.amount, 0),
      paidAmount: missions
        .filter((m) => m.status === "PAID")
        .reduce((sum, m) => sum + m.amount, 0),
    };

    return NextResponse.json({
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
        notes: m.notes,
        createdAt: m.createdAt,
        student: m.student
          ? {
              id: m.student.id,
              name:
                m.student.user.firstName && m.student.user.lastName
                  ? `${m.student.user.firstName} ${m.student.user.lastName}`
                  : m.student.user.name,
            }
          : null,
        validator: m.validator
          ? m.validator.firstName && m.validator.lastName
            ? `${m.validator.firstName} ${m.validator.lastName}`
            : m.validator.name
          : null,
      })),
      stats,
    });
  } catch (error) {
    console.error("Error fetching mentor missions:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation des missions" },
      { status: 500 }
    );
  }
}

// POST /api/mentor/missions - Creer une mission (a valider par admin)
export async function POST(request: NextRequest) {
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
      include: {
        user: { select: { name: true, firstName: true, lastName: true } },
      },
    });

    if (!mentor) {
      return NextResponse.json(
        { error: "Profil mentor non trouve" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { studentId, title, description, date, hoursWorked, notes } = body;

    // Validations
    if (!title || !date) {
      return NextResponse.json(
        { error: "Champs requis: title, date" },
        { status: 400 }
      );
    }

    // Si un etudiant est specifie, verifier qu'il est assigne au mentor
    if (studentId) {
      const student = await prisma.student.findFirst({
        where: {
          id: studentId,
          mentorId: mentor.id,
        },
      });

      if (!student) {
        return NextResponse.json(
          { error: "Cet etudiant n'est pas assigne a ce mentor" },
          { status: 400 }
        );
      }
    }

    // Calculer le montant base sur les heures et le taux horaire
    let amount = 0;
    if (hoursWorked && mentor.hourlyRate) {
      amount = Math.round(hoursWorked * mentor.hourlyRate);
    }

    const mission = await prisma.mission.create({
      data: {
        mentorId: mentor.id,
        studentId: studentId || null,
        title,
        description: description || null,
        date: new Date(date),
        hoursWorked: hoursWorked || null,
        amount, // Le montant sera valide/modifie par l'admin
        currency: "EUR",
        status: "PENDING", // Toujours en attente de validation
        notes: notes || null,
        createdBy: session.user.id, // Le mentor cree lui-meme
      },
      include: {
        student: {
          include: {
            user: { select: { name: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE_MISSION_BY_MENTOR",
        resourceType: "Mission",
        resourceId: mission.id,
        metadata: {
          title,
          date,
          hoursWorked,
          amount,
          studentId,
        },
      },
    });

    return NextResponse.json(
      {
        mission: {
          id: mission.id,
          title: mission.title,
          description: mission.description,
          date: mission.date,
          hoursWorked: mission.hoursWorked,
          amount: mission.amount,
          currency: mission.currency,
          status: mission.status,
          student: mission.student
            ? {
                id: mission.student.id,
                name:
                  mission.student.user.firstName && mission.student.user.lastName
                    ? `${mission.student.user.firstName} ${mission.student.user.lastName}`
                    : mission.student.user.name,
              }
            : null,
          createdAt: mission.createdAt,
        },
        message:
          "Mission creee avec succes. Elle sera visible une fois validee par l'administration.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating mentor mission:", error);
    return NextResponse.json(
      { error: "Erreur lors de la creation de la mission" },
      { status: 500 }
    );
  }
}
