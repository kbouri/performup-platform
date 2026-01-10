import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/admin/team/payments - Liste des paiements de l'equipe
export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type"); // MENTOR, PROFESSOR
    const status = searchParams.get("status"); // PENDING_VALIDATION, VALIDATED, REJECTED
    const period = searchParams.get("period"); // YYYY-MM format

    // Build where clause for payments
    const whereClause: Record<string, unknown> = {
      OR: [{ mentorId: { not: null } }, { professorId: { not: null } }],
    };

    if (type === "MENTOR") {
      whereClause.OR = undefined;
      whereClause.mentorId = { not: null };
    } else if (type === "PROFESSOR") {
      whereClause.OR = undefined;
      whereClause.professorId = { not: null };
    }

    if (status) {
      whereClause.status = status;
    }

    if (period) {
      const [year, month] = period.split("-").map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);
      whereClause.paymentDate = {
        gte: startDate,
        lte: endDate,
      };
    }

    // Fetch payments
    const payments = await prisma.payment.findMany({
      where: whereClause,
      include: {
        mentor: {
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
        professor: {
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
        receivedByUser: {
          select: {
            firstName: true,
            lastName: true,
            name: true,
          },
        },
      },
      orderBy: {
        paymentDate: "desc",
      },
    });

    // Format payments
    const formattedPayments = payments.map((p) => {
      const collaboratorUser = p.mentor?.user || p.professor?.user;

      return {
        id: p.id,
        type: p.mentor ? "MENTOR" : "PROFESSOR",
        professorType: p.professor?.type || null,
        collaboratorId: p.mentor?.id || p.professor?.id,
        collaborator: collaboratorUser
          ? {
              id: collaboratorUser.id,
              name:
                collaboratorUser.firstName && collaboratorUser.lastName
                  ? `${collaboratorUser.firstName} ${collaboratorUser.lastName}`
                  : collaboratorUser.name,
              email: collaboratorUser.email,
            }
          : null,
        amount: p.amount / 100, // Convert from cents
        paymentDate: p.paymentDate,
        status: p.status,
        notes: p.notes,
        receivedBy: p.receivedByUser
          ? p.receivedByUser.firstName && p.receivedByUser.lastName
            ? `${p.receivedByUser.firstName} ${p.receivedByUser.lastName}`
            : p.receivedByUser.name
          : null,
        validatedAt: p.validatedAt,
        createdAt: p.createdAt,
      };
    });

    // Calculate summary
    const summary = {
      totalPayments: formattedPayments.length,
      totalAmount:
        formattedPayments.reduce((sum, p) => sum + p.amount, 0),
      pendingCount: formattedPayments.filter(
        (p) => p.status === "PENDING_VALIDATION"
      ).length,
      validatedCount: formattedPayments.filter((p) => p.status === "VALIDATED")
        .length,
      byType: {
        mentor: formattedPayments
          .filter((p) => p.type === "MENTOR")
          .reduce((sum, p) => sum + p.amount, 0),
        professor: formattedPayments
          .filter((p) => p.type === "PROFESSOR")
          .reduce((sum, p) => sum + p.amount, 0),
      },
    };

    return NextResponse.json({
      payments: formattedPayments,
      summary,
    });
  } catch (error) {
    console.error("Error fetching team payments:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation des paiements" },
      { status: 500 }
    );
  }
}

// POST /api/admin/team/payments - Enregistrer un paiement
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
    const { collaboratorId, collaboratorType, amount, paymentDate, notes } = body;

    // Validate required fields
    if (!collaboratorId || !collaboratorType || !amount || !paymentDate) {
      return NextResponse.json(
        { error: "ID collaborateur, type, montant et date sont requis" },
        { status: 400 }
      );
    }

    if (!["MENTOR", "PROFESSOR"].includes(collaboratorType)) {
      return NextResponse.json(
        { error: "Type de collaborateur invalide" },
        { status: 400 }
      );
    }

    // Verify collaborator exists
    if (collaboratorType === "MENTOR") {
      const mentor = await prisma.mentor.findUnique({
        where: { id: collaboratorId },
      });
      if (!mentor) {
        return NextResponse.json(
          { error: "Mentor non trouve" },
          { status: 404 }
        );
      }
    } else {
      const professor = await prisma.professor.findUnique({
        where: { id: collaboratorId },
      });
      if (!professor) {
        return NextResponse.json(
          { error: "Professeur non trouve" },
          { status: 404 }
        );
      }
    }

    // Create payment
    const payment = await prisma.payment.create({
      data: {
        mentorId: collaboratorType === "MENTOR" ? collaboratorId : null,
        professorId: collaboratorType === "PROFESSOR" ? collaboratorId : null,
        amount: Math.round(amount * 100), // Convert to cents
        paymentDate: new Date(paymentDate),
        receivedBy: session.user.id,
        status: "VALIDATED",
        validatedBy: session.user.id,
        validatedAt: new Date(),
        notes,
      },
      include: {
        mentor: {
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
        professor: {
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
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "RECORD_TEAM_PAYMENT",
        resourceType: "Payment",
        resourceId: payment.id,
        metadata: {
          collaboratorId,
          collaboratorType,
          amount,
          recordedBy: session.user.email,
        },
      },
    });

    const collaboratorUser = payment.mentor?.user || payment.professor?.user;

    return NextResponse.json(
      {
        payment: {
          id: payment.id,
          type: collaboratorType,
          collaborator: collaboratorUser
            ? {
                name:
                  collaboratorUser.firstName && collaboratorUser.lastName
                    ? `${collaboratorUser.firstName} ${collaboratorUser.lastName}`
                    : collaboratorUser.name,
              }
            : null,
          amount: payment.amount / 100,
          paymentDate: payment.paymentDate,
          status: payment.status,
        },
        message: "Paiement enregistre avec succes",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error recording team payment:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement du paiement" },
      { status: 500 }
    );
  }
}
