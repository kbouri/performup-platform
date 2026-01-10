import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/essays/[id] - Get a single essay
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const essay = await prisma.essay.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            mentor: {
              select: {
                userId: true,
              },
            },
          },
        },
        school: true,
        program: true,
        responses: true,
      },
    });

    if (!essay) {
      return NextResponse.json(
        { error: "Essay non trouvé" },
        { status: 404 }
      );
    }

    // Access control
    const userId = session.user.id;
    const hasAccess =
      isAdmin(session.user) ||
      essay.student.user.id === userId ||
      essay.student.mentor?.userId === userId ||
      essay.createdBy === userId;

    if (!hasAccess) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    return NextResponse.json({
      essay: {
        ...essay,
        wordCount: essay.content.split(/\s+/).filter(Boolean).length,
        characterCount: essay.content.length,
      },
    });
  } catch (error) {
    console.error("Error fetching essay:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de l'essay" },
      { status: 500 }
    );
  }
}

// PATCH /api/essays/[id] - Update an essay
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const essay = await prisma.essay.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            user: true,
            mentor: true,
          },
        },
      },
    });

    if (!essay) {
      return NextResponse.json(
        { error: "Essay non trouvé" },
        { status: 404 }
      );
    }

    // Access control
    const userId = session.user.id;
    const canEdit =
      isAdmin(session.user) ||
      essay.student.user.id === userId ||
      essay.student.mentor?.userId === userId;

    if (!canEdit) {
      return NextResponse.json(
        { error: "Vous n'avez pas la permission de modifier cet essay" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, content, status, createVersion } = body;

    // If content changed and createVersion is true, increment version
    let newVersion = essay.version;
    if (createVersion && content && content !== essay.content) {
      newVersion = essay.version + 1;
    }

    const updatedEssay = await prisma.essay.update({
      where: { id },
      data: {
        title: title !== undefined ? title : undefined,
        content: content !== undefined ? content : undefined,
        status: status !== undefined ? status : undefined,
        version: newVersion,
      },
      include: {
        school: true,
        program: true,
        student: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      essay: {
        ...updatedEssay,
        wordCount: updatedEssay.content.split(/\s+/).filter(Boolean).length,
        characterCount: updatedEssay.content.length,
      },
      message: "Essay mis à jour avec succès",
    });
  } catch (error) {
    console.error("Error updating essay:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de l'essay" },
      { status: 500 }
    );
  }
}

// DELETE /api/essays/[id] - Delete an essay
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const essay = await prisma.essay.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            mentor: true,
          },
        },
      },
    });

    if (!essay) {
      return NextResponse.json(
        { error: "Essay non trouvé" },
        { status: 404 }
      );
    }

    // Only admin or mentor can delete
    const canDelete =
      isAdmin(session.user) ||
      essay.student.mentor?.userId === session.user.id;

    if (!canDelete) {
      return NextResponse.json(
        { error: "Vous n'avez pas la permission de supprimer cet essay" },
        { status: 403 }
      );
    }

    await prisma.essay.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Essay supprimé avec succès",
    });
  } catch (error) {
    console.error("Error deleting essay:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de l'essay" },
      { status: 500 }
    );
  }
}

