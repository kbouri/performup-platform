import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/password";
import { sendWelcomeEmail } from "@/lib/email";

// POST /api/team/accept-invitation - Accepter une invitation (public)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, firstName, lastName, phone, password } = body;

    // Validate required fields
    if (!token || !firstName || !lastName || !password) {
      return NextResponse.json(
        { error: "Token, prenom, nom et mot de passe sont requis" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 8 caracteres" },
        { status: 400 }
      );
    }

    // Find invitation by token
    const invitation = await prisma.teamInvitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation invalide ou introuvable" },
        { status: 404 }
      );
    }

    if (invitation.status === "ACCEPTED") {
      return NextResponse.json(
        { error: "Cette invitation a deja ete acceptee" },
        { status: 400 }
      );
    }

    if (invitation.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Cette invitation a ete annulee" },
        { status: 400 }
      );
    }

    if (invitation.expiresAt < new Date()) {
      // Update status to expired
      await prisma.teamInvitation.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json(
        { error: "Cette invitation a expire" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Un compte existe deja avec cet email" },
        { status: 400 }
      );
    }

    // Hash password using Better Auth scrypt format
    const hashedPassword = hashPassword(password);

    // Parse metadata
    const metadata = invitation.metadata as {
      hourlyRate?: number;
      specialties?: string[];
      executiveChefId?: string;
      paymentType?: string;
    } | null;

    // Create user and role profile in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email: invitation.email,
          firstName,
          lastName,
          name: `${firstName} ${lastName}`,
          phone,
          role: invitation.role,
          active: true,
          emailVerified: true, // Verified through invitation
        },
      });

      // Create account with password
      await tx.account.create({
        data: {
          userId: user.id,
          accountId: user.id,
          providerId: "credential",
          password: hashedPassword,
        },
      });

      // Create role-specific profile
      let profileId: string;

      if (invitation.role === "MENTOR") {
        const mentor = await tx.mentor.create({
          data: {
            userId: user.id,
            specialties: metadata?.specialties || [],
            hourlyRate: metadata?.hourlyRate || null,
            paymentType: metadata?.paymentType || "MONTHLY",
            executiveChefId: metadata?.executiveChefId || null,
            status: "ACTIVE",
            invitedAt: invitation.createdAt,
            activatedAt: new Date(),
          },
        });
        profileId = mentor.id;
      } else if (invitation.role === "PROFESSOR") {
        const professor = await tx.professor.create({
          data: {
            userId: user.id,
            type: invitation.professorType!,
            hourlyRate: metadata?.hourlyRate || null,
            status: "ACTIVE",
            invitedAt: invitation.createdAt,
            activatedAt: new Date(),
          },
        });
        profileId = professor.id;
      } else {
        // EXECUTIVE_CHEF
        const executiveChef = await tx.executiveChef.create({
          data: {
            userId: user.id,
            status: "ACTIVE",
            invitedAt: invitation.createdAt,
            activatedAt: new Date(),
          },
        });
        profileId = executiveChef.id;
      }

      // Update invitation status
      await tx.teamInvitation.update({
        where: { id: invitation.id },
        data: {
          status: "ACCEPTED",
          acceptedAt: new Date(),
        },
      });

      // Log audit
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "ACCEPT_INVITATION",
          resourceType: "TeamInvitation",
          resourceId: invitation.id,
          metadata: {
            email: invitation.email,
            role: invitation.role,
            profileId,
          },
        },
      });

      return { user, profileId };
    });

    // Send welcome email
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    await sendWelcomeEmail({
      to: invitation.email,
      firstName,
      role: invitation.role,
      loginLink: `${baseUrl}/login`,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Compte cree avec succes",
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error accepting invitation:", error);
    return NextResponse.json(
      { error: "Erreur lors de la creation du compte" },
      { status: 500 }
    );
  }
}

// GET /api/team/accept-invitation - Verifier validite d'une invitation
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token requis" }, { status: 400 });
    }

    const invitation = await prisma.teamInvitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      return NextResponse.json(
        { valid: false, error: "Invitation invalide ou introuvable" },
        { status: 404 }
      );
    }

    if (invitation.status === "ACCEPTED") {
      return NextResponse.json(
        { valid: false, error: "Cette invitation a deja ete acceptee" },
        { status: 400 }
      );
    }

    if (invitation.status === "CANCELLED") {
      return NextResponse.json(
        { valid: false, error: "Cette invitation a ete annulee" },
        { status: 400 }
      );
    }

    if (invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { valid: false, error: "Cette invitation a expire" },
        { status: 400 }
      );
    }

    // Format role for display
    const roleDisplay =
      invitation.role === "MENTOR"
        ? "Mentor"
        : invitation.role === "PROFESSOR"
          ? `Professeur ${invitation.professorType === "QUANT" ? "Quantitatif" : "Verbal"}`
          : "Chef Executif";

    return NextResponse.json({
      valid: true,
      invitation: {
        email: invitation.email,
        role: invitation.role,
        roleDisplay,
        professorType: invitation.professorType,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    console.error("Error validating invitation:", error);
    return NextResponse.json(
      { valid: false, error: "Erreur lors de la verification" },
      { status: 500 }
    );
  }
}
