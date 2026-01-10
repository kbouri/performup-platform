import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";
import { randomBytes } from "crypto";
import { sendInvitationEmail } from "@/lib/email";

// GET /api/admin/team/invitations/[id] - Detail d'une invitation
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

    const invitation = await prisma.teamInvitation.findUnique({
      where: { id },
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
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation non trouvee" },
        { status: 404 }
      );
    }

    // Check if expired
    const now = new Date();
    const status =
      invitation.status === "PENDING" && invitation.expiresAt < now
        ? "EXPIRED"
        : invitation.status;

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        professorType: invitation.professorType,
        status,
        expiresAt: invitation.expiresAt,
        acceptedAt: invitation.acceptedAt,
        metadata: invitation.metadata,
        invitedBy: invitation.invitedBy
          ? {
              id: invitation.invitedBy.id,
              name:
                invitation.invitedBy.firstName && invitation.invitedBy.lastName
                  ? `${invitation.invitedBy.firstName} ${invitation.invitedBy.lastName}`
                  : invitation.invitedBy.name,
              email: invitation.invitedBy.email,
            }
          : null,
        createdAt: invitation.createdAt,
      },
    });
  } catch (error) {
    console.error("Error fetching invitation:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation de l'invitation" },
      { status: 500 }
    );
  }
}

// POST /api/admin/team/invitations/[id] - Renvoyer une invitation
export async function POST(
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

    const invitation = await prisma.teamInvitation.findUnique({
      where: { id },
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

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation non trouvee" },
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

    // Generate new token and extend expiration
    const newToken = randomBytes(32).toString("hex");
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    // Update invitation
    const updatedInvitation = await prisma.teamInvitation.update({
      where: { id },
      data: {
        token: newToken,
        expiresAt: newExpiresAt,
        status: "PENDING",
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "RESEND_INVITATION",
        resourceType: "TeamInvitation",
        resourceId: id,
        metadata: {
          email: invitation.email,
          resentBy: session.user.email,
        },
      },
    });

    // Send invitation email
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const invitationLink = `${baseUrl}/accept-invitation?token=${newToken}`;

    const inviterName =
      invitation.invitedBy.firstName && invitation.invitedBy.lastName
        ? `${invitation.invitedBy.firstName} ${invitation.invitedBy.lastName}`
        : invitation.invitedBy.name || "L'equipe PerformUp";

    await sendInvitationEmail({
      to: invitation.email,
      inviterName,
      role: invitation.role,
      professorType: invitation.professorType || undefined,
      invitationLink,
      expiresAt: newExpiresAt,
    });

    return NextResponse.json({
      invitation: {
        id: updatedInvitation.id,
        email: updatedInvitation.email,
        status: updatedInvitation.status,
        expiresAt: updatedInvitation.expiresAt,
      },
      message: "Invitation renvoyee avec succes",
    });
  } catch (error) {
    console.error("Error resending invitation:", error);
    return NextResponse.json(
      { error: "Erreur lors du renvoi de l'invitation" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/team/invitations/[id] - Annuler une invitation
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

    const invitation = await prisma.teamInvitation.findUnique({
      where: { id },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation non trouvee" },
        { status: 404 }
      );
    }

    if (invitation.status === "ACCEPTED") {
      return NextResponse.json(
        { error: "Impossible d'annuler une invitation acceptee" },
        { status: 400 }
      );
    }

    // Update status to cancelled
    await prisma.teamInvitation.update({
      where: { id },
      data: {
        status: "CANCELLED",
      },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CANCEL_INVITATION",
        resourceType: "TeamInvitation",
        resourceId: id,
        metadata: {
          email: invitation.email,
          cancelledBy: session.user.email,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Invitation annulee avec succes",
    });
  } catch (error) {
    console.error("Error cancelling invitation:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'annulation de l'invitation" },
      { status: 500 }
    );
  }
}
