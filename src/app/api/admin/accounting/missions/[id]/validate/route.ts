import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// POST /api/admin/accounting/missions/[id]/validate - Valider une mission
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

    const mission = await prisma.mission.findUnique({
      where: { id },
      include: {
        mentor: {
          include: {
            user: { select: { name: true, firstName: true, lastName: true } },
          },
        },
        professor: {
          include: {
            user: { select: { name: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!mission) {
      return NextResponse.json(
        { error: "Mission non trouvee" },
        { status: 404 }
      );
    }

    if (mission.status !== "PENDING") {
      return NextResponse.json(
        { error: "Seules les missions en attente peuvent etre validees" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { action, notes } = body;

    if (action === "approve") {
      await prisma.mission.update({
        where: { id },
        data: {
          status: "VALIDATED",
          validatedBy: session.user.id,
          validatedAt: new Date(),
          notes: notes || mission.notes,
        },
      });

      // Log audit
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "VALIDATE_MISSION",
          resourceType: "Mission",
          resourceId: id,
          metadata: {
            title: mission.title,
            amount: mission.amount,
          },
        },
      });

      const assigneeName = mission.mentor
        ? mission.mentor.user.firstName && mission.mentor.user.lastName
          ? `${mission.mentor.user.firstName} ${mission.mentor.user.lastName}`
          : mission.mentor.user.name
        : mission.professor
        ? mission.professor.user.firstName && mission.professor.user.lastName
          ? `${mission.professor.user.firstName} ${mission.professor.user.lastName}`
          : mission.professor.user.name
        : "Inconnu";

      return NextResponse.json({
        message: `Mission validee pour ${assigneeName}`,
        status: "VALIDATED",
      });
    } else if (action === "reject") {
      await prisma.mission.update({
        where: { id },
        data: {
          status: "CANCELLED",
          notes: notes || mission.notes,
        },
      });

      // Log audit
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "REJECT_MISSION",
          resourceType: "Mission",
          resourceId: id,
          metadata: { reason: notes },
        },
      });

      return NextResponse.json({
        message: "Mission rejetee",
        status: "CANCELLED",
      });
    } else {
      return NextResponse.json(
        { error: "Action invalide. Utilisez 'approve' ou 'reject'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error validating mission:", error);
    return NextResponse.json(
      { error: "Erreur lors de la validation de la mission" },
      { status: 500 }
    );
  }
}
