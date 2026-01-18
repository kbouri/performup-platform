import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// Helper function to recursively duplicate a folder and its contents
async function duplicateFolderRecursive(
  sourceFolderId: string,
  targetParentId: string | null,
  userId: string,
  newName?: string
): Promise<string> {
  // Get the source folder
  const sourceFolder = await prisma.folder.findUnique({
    where: { id: sourceFolderId },
    include: {
      documents: true,
      children: true,
    },
  });

  if (!sourceFolder) {
    throw new Error("Dossier source non trouvé");
  }

  // Create the duplicated folder
  const duplicatedFolder = await prisma.folder.create({
    data: {
      name: newName || `${sourceFolder.name} (copie)`,
      path: sourceFolder.path ? `${sourceFolder.path}-copy` : null,
      parentId: targetParentId,
      createdBy: userId,
    },
  });

  // Duplicate all documents in this folder
  for (const doc of sourceFolder.documents) {
    await prisma.document.create({
      data: {
        name: doc.name,
        description: doc.description,
        fileUrl: doc.fileUrl, // Same file URL
        fileSize: doc.fileSize,
        contentType: doc.contentType,
        numPages: doc.numPages,
        thumbnailUrl: doc.thumbnailUrl,
        folderId: duplicatedFolder.id,
        ownerId: userId,
        version: 1,
      },
    });
  }

  // Recursively duplicate all child folders
  for (const childFolder of sourceFolder.children) {
    await duplicateFolderRecursive(
      childFolder.id,
      duplicatedFolder.id,
      userId,
      childFolder.name // Keep original name for children
    );
  }

  return duplicatedFolder.id;
}

// POST /api/documents/folders/[id]/duplicate - Duplicate a folder with all contents
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

    const folder = await prisma.folder.findUnique({
      where: { id },
      include: {
        permissions: {
          where: { userId: session.user.id },
        },
      },
    });

    if (!folder) {
      return NextResponse.json(
        { error: "Dossier non trouvé" },
        { status: 404 }
      );
    }

    // Check access - admin or has permission
    const hasAccess =
      isAdmin(session.user) ||
      folder.createdBy === session.user.id ||
      folder.permissions.some((p) => p.canView);

    if (!hasAccess) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { parentId } = body;

    // Duplicate the folder and all contents
    const duplicatedFolderId = await duplicateFolderRecursive(
      id,
      parentId !== undefined ? parentId : folder.parentId,
      session.user.id
    );

    // Fetch the duplicated folder
    const duplicatedFolder = await prisma.folder.findUnique({
      where: { id: duplicatedFolderId },
      include: {
        _count: {
          select: { documents: true, children: true },
        },
      },
    });

    return NextResponse.json({
      folder: duplicatedFolder,
      message: "Dossier dupliqué avec succès",
    }, { status: 201 });
  } catch (error) {
    console.error("Error duplicating folder:", error);
    return NextResponse.json(
      { error: "Erreur lors de la duplication du dossier" },
      { status: 500 }
    );
  }
}
