import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/admin/schools/[id]/programs/[programId]/deadlines - Get all deadlines
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; programId: string }> }
) {
  try {
    const { programId } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || !isAdmin(session.user)) {
      return NextResponse.json({ error: "Non autorise" }, { status: 403 });
    }

    const deadlines = await prisma.programDeadline.findMany({
      where: { programId },
      orderBy: { deadline: "asc" },
    });

    return NextResponse.json({ deadlines });
  } catch (error) {
    console.error("Error fetching deadlines:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation des deadlines" },
      { status: 500 }
    );
  }
}

// POST /api/admin/schools/[id]/programs/[programId]/deadlines - Create deadline
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; programId: string }> }
) {
  try {
    const { programId } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || !isAdmin(session.user)) {
      return NextResponse.json({ error: "Non autorise" }, { status: 403 });
    }

    const body = await request.json();
    const { round, deadline, decisionDate, notes } = body;

    if (!round || !deadline) {
      return NextResponse.json(
        { error: "Round et deadline sont requis" },
        { status: 400 }
      );
    }

    const newDeadline = await prisma.programDeadline.create({
      data: {
        programId,
        round,
        deadline: new Date(deadline),
        decisionDate: decisionDate ? new Date(decisionDate) : null,
        notes,
      },
    });

    return NextResponse.json(
      {
        deadline: newDeadline,
        message: "Deadline creee avec succes",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating deadline:", error);
    return NextResponse.json(
      { error: "Erreur lors de la creation de la deadline" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/schools/[id]/programs/[programId]/deadlines - Delete deadline
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; programId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || !isAdmin(session.user)) {
      return NextResponse.json({ error: "Non autorise" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const deadlineId = searchParams.get("deadlineId");

    if (!deadlineId) {
      return NextResponse.json(
        { error: "deadlineId requis" },
        { status: 400 }
      );
    }

    await prisma.programDeadline.delete({
      where: { id: deadlineId },
    });

    return NextResponse.json({
      message: "Deadline supprimee avec succes",
    });
  } catch (error) {
    console.error("Error deleting deadline:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la deadline" },
      { status: 500 }
    );
  }
}
