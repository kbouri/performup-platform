import { NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";
import {
  getImpersonationCookie,
  clearImpersonationCookie,
} from "@/lib/impersonation";

// POST /api/admin/impersonate/end - Terminer une session d'impersonation
export async function POST() {
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

    // Get current impersonation data
    const impersonationData = await getImpersonationCookie();

    if (!impersonationData) {
      return NextResponse.json(
        { error: "Aucune session de visualisation active" },
        { status: 400 }
      );
    }

    // Verify the admin is the one who started the session
    if (impersonationData.adminId !== session.user.id) {
      return NextResponse.json(
        { error: "Session de visualisation invalide" },
        { status: 403 }
      );
    }

    // Update impersonation session in database
    await prisma.impersonationSession.update({
      where: { id: impersonationData.sessionId },
      data: {
        endedAt: new Date(),
      },
    });

    // Clear the cookie
    await clearImpersonationCookie();

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "END_IMPERSONATION",
        resourceType: "User",
        resourceId: impersonationData.targetId,
        metadata: {
          sessionId: impersonationData.sessionId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Session de visualisation terminee",
    });
  } catch (error) {
    console.error("Error ending impersonation:", error);
    return NextResponse.json(
      { error: "Erreur lors de la fin de la visualisation" },
      { status: 500 }
    );
  }
}
