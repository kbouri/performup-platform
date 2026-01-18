import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/admin/schools/[id]/programs/[programId]/essay-questions - Get all essay questions
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

    const essayQuestions = await prisma.essayQuestion.findMany({
      where: { programId },
      orderBy: [{ round: "asc" }, { order: "asc" }],
    });

    return NextResponse.json({ essayQuestions });
  } catch (error) {
    console.error("Error fetching essay questions:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation des questions" },
      { status: 500 }
    );
  }
}

// POST /api/admin/schools/[id]/programs/[programId]/essay-questions - Create essay question
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
    const {
      question,
      wordLimit,
      round,
      year,
      questionTips,
      isOptional,
      optionalGroup,
      order,
      active,
    } = body;

    if (!question) {
      return NextResponse.json(
        { error: "La question est requise" },
        { status: 400 }
      );
    }

    // Get max order for this program
    const maxOrder = await prisma.essayQuestion.findFirst({
      where: { programId },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const newQuestion = await prisma.essayQuestion.create({
      data: {
        programId,
        question,
        wordLimit: wordLimit || null,
        round: round || "R1",
        year: year || new Date().getFullYear(),
        questionTips: questionTips || null,
        isOptional: isOptional || false,
        optionalGroup: optionalGroup || null,
        order: order ?? (maxOrder?.order ?? 0) + 1,
        active: active ?? true,
      },
    });

    return NextResponse.json(
      {
        essayQuestion: newQuestion,
        message: "Question creee avec succes",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating essay question:", error);
    return NextResponse.json(
      { error: "Erreur lors de la creation de la question" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/schools/[id]/programs/[programId]/essay-questions - Update essay question
export async function PATCH(
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

    const body = await request.json();
    const {
      questionId,
      question,
      wordLimit,
      round,
      year,
      questionTips,
      isOptional,
      optionalGroup,
      order,
      active,
    } = body;

    if (!questionId) {
      return NextResponse.json(
        { error: "questionId requis" },
        { status: 400 }
      );
    }

    const updatedQuestion = await prisma.essayQuestion.update({
      where: { id: questionId },
      data: {
        question: question !== undefined ? question : undefined,
        wordLimit: wordLimit !== undefined ? wordLimit : undefined,
        round: round !== undefined ? round : undefined,
        year: year !== undefined ? year : undefined,
        questionTips: questionTips !== undefined ? questionTips : undefined,
        isOptional: isOptional !== undefined ? isOptional : undefined,
        optionalGroup: optionalGroup !== undefined ? optionalGroup : undefined,
        order: order !== undefined ? order : undefined,
        active: active !== undefined ? active : undefined,
      },
    });

    return NextResponse.json({
      essayQuestion: updatedQuestion,
      message: "Question mise a jour avec succes",
    });
  } catch (error) {
    console.error("Error updating essay question:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise a jour de la question" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/schools/[id]/programs/[programId]/essay-questions - Delete essay question
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
    const questionId = searchParams.get("questionId");

    if (!questionId) {
      return NextResponse.json(
        { error: "questionId requis" },
        { status: 400 }
      );
    }

    await prisma.essayQuestion.delete({
      where: { id: questionId },
    });

    return NextResponse.json({
      message: "Question supprimee avec succes",
    });
  } catch (error) {
    console.error("Error deleting essay question:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la question" },
      { status: 500 }
    );
  }
}
