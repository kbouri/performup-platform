import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";
import { deleteFile } from "@/lib/storage";

// GET /api/documents/[id] - Get a single document
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

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        folder: {
          select: {
            id: true,
            name: true,
            path: true,
          },
        },
        permissions: {
          where: { userId: session.user.id },
          select: {
            canView: true,
            canDownload: true,
            canComment: true,
            canEdit: true,
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document non trouvé" },
        { status: 404 }
      );
    }

    // Check access
    const hasAccess =
      isAdmin(session.user) ||
      document.ownerId === session.user.id ||
      document.permissions.some((p) => p.canView);

    if (!hasAccess) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // Format response
    const response = {
      id: document.id,
      name: document.name,
      description: document.description,
      fileUrl: document.fileUrl,
      fileSize: Number(document.fileSize),
      contentType: document.contentType,
      numPages: document.numPages,
      thumbnailUrl: document.thumbnailUrl,
      version: document.version,
      owner: document.owner,
      folder: document.folder,
      permissions: document.permissions[0] || {
        canView: true,
        canDownload: document.ownerId === session.user.id || isAdmin(session.user),
        canComment: document.ownerId === session.user.id || isAdmin(session.user),
        canEdit: document.ownerId === session.user.id || isAdmin(session.user),
      },
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };

    return NextResponse.json({ document: response });
  } catch (error) {
    console.error("Error fetching document:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du document" },
      { status: 500 }
    );
  }
}

// PATCH /api/documents/[id] - Update document metadata
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

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        permissions: {
          where: { userId: session.user.id },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document non trouvé" },
        { status: 404 }
      );
    }

    // Check edit permission
    const canEdit =
      isAdmin(session.user) ||
      document.ownerId === session.user.id ||
      document.permissions.some((p) => p.canEdit);

    if (!canEdit) {
      return NextResponse.json(
        { error: "Vous n'avez pas la permission de modifier ce document" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, folderId } = body;

    const updatedDocument = await prisma.document.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        description: description !== undefined ? description : undefined,
        folderId: folderId !== undefined ? folderId : undefined,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        folder: {
          select: {
            id: true,
            name: true,
            path: true,
          },
        },
      },
    });

    return NextResponse.json({
      document: {
        ...updatedDocument,
        fileSize: Number(updatedDocument.fileSize),
      },
      message: "Document mis à jour avec succès",
    });
  } catch (error) {
    console.error("Error updating document:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du document" },
      { status: 500 }
    );
  }
}

// DELETE /api/documents/[id] - Delete a document
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

    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document non trouvé" },
        { status: 404 }
      );
    }

    // Only owner or admin can delete
    const canDelete =
      isAdmin(session.user) || document.ownerId === session.user.id;

    if (!canDelete) {
      return NextResponse.json(
        { error: "Vous n'avez pas la permission de supprimer ce document" },
        { status: 403 }
      );
    }

    // Delete from Vercel Blob
    try {
      await deleteFile(document.fileUrl);
    } catch (blobError) {
      console.error("Error deleting from blob storage:", blobError);
      // Continue with database deletion even if blob deletion fails
    }

    // Delete from database
    await prisma.document.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Document supprimé avec succès",
    });
  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du document" },
      { status: 500 }
    );
  }
}

