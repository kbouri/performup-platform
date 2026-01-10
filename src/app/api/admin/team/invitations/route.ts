import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";
import { randomBytes } from "crypto";
import { sendInvitationEmail } from "@/lib/email";

// GET /api/admin/team/invitations - Liste toutes les invitations
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
    const status = searchParams.get("status"); // PENDING, ACCEPTED, EXPIRED, CANCELLED
    const role = searchParams.get("role"); // MENTOR, PROFESSOR, EXECUTIVE_CHEF

    const whereClause: Record<string, unknown> = {};

    if (status) {
      whereClause.status = status;
    }

    if (role) {
      whereClause.role = role;
    }

    const invitations = await prisma.teamInvitation.findMany({
      where: whereClause,
      include: {
        invitedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Check and update expired invitations
    const now = new Date();
    const expiredInvitations = invitations.filter(
      (i) => i.status === "PENDING" && i.expiresAt < now
    );

    if (expiredInvitations.length > 0) {
      await prisma.teamInvitation.updateMany({
        where: {
          id: { in: expiredInvitations.map((i) => i.id) },
        },
        data: {
          status: "EXPIRED",
        },
      });
    }

    const formattedInvitations = invitations.map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role,
      professorType: i.professorType,
      status: i.status === "PENDING" && i.expiresAt < now ? "EXPIRED" : i.status,
      expiresAt: i.expiresAt,
      acceptedAt: i.acceptedAt,
      metadata: i.metadata,
      invitedBy: i.invitedBy
        ? {
            id: i.invitedBy.id,
            name:
              i.invitedBy.firstName && i.invitedBy.lastName
                ? `${i.invitedBy.firstName} ${i.invitedBy.lastName}`
                : i.invitedBy.name,
            email: i.invitedBy.email,
          }
        : null,
      createdAt: i.createdAt,
    }));

    return NextResponse.json({ invitations: formattedInvitations });
  } catch (error) {
    console.error("Error fetching invitations:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation des invitations" },
      { status: 500 }
    );
  }
}

// POST /api/admin/team/invitations - Creer une invitation
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
    const {
      email,
      role,
      professorType,
      hourlyRate,
      specialties,
      executiveChefId,
      paymentType,
    } = body;

    // Validate required fields
    if (!email || !role) {
      return NextResponse.json(
        { error: "Email et role sont requis" },
        { status: 400 }
      );
    }

    if (!["MENTOR", "PROFESSOR", "EXECUTIVE_CHEF"].includes(role)) {
      return NextResponse.json({ error: "Role invalide" }, { status: 400 });
    }

    if (role === "PROFESSOR" && !["QUANT", "VERBAL"].includes(professorType)) {
      return NextResponse.json(
        { error: "Type de professeur requis (QUANT ou VERBAL)" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Un utilisateur avec cet email existe deja" },
        { status: 400 }
      );
    }

    // Check if pending invitation already exists
    const existingInvitation = await prisma.teamInvitation.findFirst({
      where: {
        email,
        status: "PENDING",
      },
    });

    if (existingInvitation) {
      return NextResponse.json(
        { error: "Une invitation en attente existe deja pour cet email" },
        { status: 400 }
      );
    }

    // Generate token
    const token = randomBytes(32).toString("hex");

    // Set expiration (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invitation
    const invitation = await prisma.teamInvitation.create({
      data: {
        email,
        role,
        professorType: role === "PROFESSOR" ? professorType : null,
        token,
        invitedById: session.user.id,
        status: "PENDING",
        expiresAt,
        metadata: {
          hourlyRate: hourlyRate ? parseInt(hourlyRate) : null,
          specialties: specialties || [],
          executiveChefId: executiveChefId || null,
          paymentType: paymentType || "MONTHLY",
        },
      },
      include: {
        invitedBy: {
          select: {
            firstName: true,
            lastName: true,
            name: true,
          },
        },
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE_INVITATION",
        resourceType: "TeamInvitation",
        resourceId: invitation.id,
        metadata: {
          email,
          role,
          professorType,
          createdBy: session.user.email,
        },
      },
    });

    // Send invitation email
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const invitationLink = `${baseUrl}/accept-invitation?token=${token}`;

    const inviterName =
      invitation.invitedBy.firstName && invitation.invitedBy.lastName
        ? `${invitation.invitedBy.firstName} ${invitation.invitedBy.lastName}`
        : invitation.invitedBy.name || "L'equipe PerformUp";

    await sendInvitationEmail({
      to: email,
      inviterName,
      role,
      professorType,
      invitationLink,
      expiresAt,
    });

    return NextResponse.json(
      {
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          professorType: invitation.professorType,
          status: invitation.status,
          expiresAt: invitation.expiresAt,
          invitationLink,
        },
        message: "Invitation envoyee avec succes",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating invitation:", error);
    return NextResponse.json(
      { error: "Erreur lors de la creation de l'invitation" },
      { status: 500 }
    );
  }
}
