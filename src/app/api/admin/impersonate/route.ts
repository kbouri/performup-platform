import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";
import {
  setImpersonationCookie,
  isValidImpersonationTarget,
} from "@/lib/impersonation";

// POST /api/admin/impersonate - Demarrer une session d'impersonation
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
    const { targetUserId } = body;

    if (!targetUserId) {
      return NextResponse.json(
        { error: "ID utilisateur cible requis" },
        { status: 400 }
      );
    }

    // Get target user
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        name: true,
        role: true,
        active: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "Utilisateur cible non trouve" },
        { status: 404 }
      );
    }

    if (!targetUser.active) {
      return NextResponse.json(
        { error: "Impossible de visualiser un utilisateur inactif" },
        { status: 400 }
      );
    }

    if (!isValidImpersonationTarget(targetUser.role)) {
      return NextResponse.json(
        { error: "Impossible de visualiser cet utilisateur" },
        { status: 400 }
      );
    }

    // Create impersonation session in database
    const impersonationSession = await prisma.impersonationSession.create({
      data: {
        adminUserId: session.user.id,
        targetUserId: targetUser.id,
        ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
        userAgent: request.headers.get("user-agent"),
      },
    });

    // Set impersonation cookie
    await setImpersonationCookie({
      adminId: session.user.id,
      targetId: targetUser.id,
      sessionId: impersonationSession.id,
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "START_IMPERSONATION",
        resourceType: "User",
        resourceId: targetUser.id,
        metadata: {
          targetEmail: targetUser.email,
          targetRole: targetUser.role,
          sessionId: impersonationSession.id,
        },
      },
    });

    return NextResponse.json({
      success: true,
      sessionId: impersonationSession.id,
      targetUser: {
        id: targetUser.id,
        email: targetUser.email,
        name:
          targetUser.firstName && targetUser.lastName
            ? `${targetUser.firstName} ${targetUser.lastName}`
            : targetUser.name,
        role: targetUser.role,
      },
      message: `Vous visualisez maintenant l'espace de ${targetUser.firstName || targetUser.name}`,
    });
  } catch (error) {
    console.error("Error starting impersonation:", error);
    return NextResponse.json(
      { error: "Erreur lors du demarrage de la visualisation" },
      { status: 500 }
    );
  }
}
