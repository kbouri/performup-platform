import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// POST /api/documents/[id]/duplicate - Duplicate a document
export async function POST(
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

    // Check access - need view permission to duplicate
    const hasAccess =
      isAdmin(session.user) ||
      document.ownerId === session.user.id ||
      document.permissions.some((p) => p.canView);

    if (!hasAccess) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { folderId } = body;

    // Create duplicate document record (links to same file URL)
    const duplicatedDocument = await prisma.document.create({
      data: {
        name: `${document.name} (copie)`,
        description: document.description,
        fileUrl: document.fileUrl, // Same file URL - no need to duplicate storage
        fileSize: document.fileSize,
        contentType: document.contentType,
        numPages: document.numPages,
        thumbnailUrl: document.thumbnailUrl,
        folderId: folderId !== undefined ? folderId : document.folderId,
        ownerId: session.user.id,
        version: 1,
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
        ...duplicatedDocument,
        fileSize: Number(duplicatedDocument.fileSize),
      },
      message: "Document dupliqué avec succès",
    }, { status: 201 });
  } catch (error) {
    console.error("Error duplicating document:", error);
    return NextResponse.json(
      { error: "Erreur lors de la duplication du document" },
      { status: 500 }
    );
  }
}
