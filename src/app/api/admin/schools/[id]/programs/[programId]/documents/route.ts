import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/admin/schools/[id]/programs/[programId]/documents - Get all documents
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

    const documents = await prisma.programDocument.findMany({
      where: { programId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ documents });
  } catch (error) {
    console.error("Error fetching program documents:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation des documents" },
      { status: 500 }
    );
  }
}

// POST /api/admin/schools/[id]/programs/[programId]/documents - Create document
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
    const { name, type, fileUrl, description, category, year, isPublic } = body;

    if (!name || !fileUrl) {
      return NextResponse.json(
        { error: "Nom et URL du fichier sont requis" },
        { status: 400 }
      );
    }

    const newDocument = await prisma.programDocument.create({
      data: {
        programId,
        name,
        type: type || "other",
        fileUrl,
        description: description || null,
        category: category || null,
        year: year || null,
        isPublic: isPublic ?? false,
        uploadedBy: session.user.id,
      },
    });

    return NextResponse.json(
      {
        document: newDocument,
        message: "Document ajoute avec succes",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating program document:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'ajout du document" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/schools/[id]/programs/[programId]/documents - Update document
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
    const { documentId, name, type, description, category, year, isPublic } = body;

    if (!documentId) {
      return NextResponse.json(
        { error: "documentId requis" },
        { status: 400 }
      );
    }

    const updatedDocument = await prisma.programDocument.update({
      where: { id: documentId },
      data: {
        name: name !== undefined ? name : undefined,
        type: type !== undefined ? type : undefined,
        description: description !== undefined ? description : undefined,
        category: category !== undefined ? category : undefined,
        year: year !== undefined ? year : undefined,
        isPublic: isPublic !== undefined ? isPublic : undefined,
      },
    });

    return NextResponse.json({
      document: updatedDocument,
      message: "Document mis a jour avec succes",
    });
  } catch (error) {
    console.error("Error updating program document:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise a jour du document" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/schools/[id]/programs/[programId]/documents - Delete document
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
    const documentId = searchParams.get("documentId");

    if (!documentId) {
      return NextResponse.json(
        { error: "documentId requis" },
        { status: 400 }
      );
    }

    await prisma.programDocument.delete({
      where: { id: documentId },
    });

    return NextResponse.json({
      message: "Document supprime avec succes",
    });
  } catch (error) {
    console.error("Error deleting program document:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du document" },
      { status: 500 }
    );
  }
}
