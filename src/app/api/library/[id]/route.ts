import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// GET /api/library/[id] - Get a specific library document
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

    const document = await prisma.documentLibrary.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        packs: {
          include: {
            pack: {
              select: {
                id: true,
                name: true,
                displayName: true,
              },
            },
          },
        },
        folderDocuments: true,
        versions: {
          orderBy: { version: "desc" },
          take: 10,
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document non trouvé" },
        { status: 404 }
      );
    }

    // Check access for private documents
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (document.isPrivate && user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    return NextResponse.json({
      ...document,
      fileSize: Number(document.fileSize),
      versions: document.versions.map((v) => ({
        ...v,
        fileSize: Number(v.fileSize),
      })),
    });
  } catch (error) {
    console.error("Error fetching library document:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du document" },
      { status: 500 }
    );
  }
}

// PATCH /api/library/[id] - Update a library document
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

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const document = await prisma.documentLibrary.findUnique({
      where: { id },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document non trouvé" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      category,
      isPrivate,
      geographies,
      tags,
      packIds,
    } = body;

    // Update document
    const updatedDocument = await prisma.documentLibrary.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(category && { category }),
        ...(isPrivate !== undefined && { isPrivate }),
        ...(geographies && { geographies }),
        ...(tags && { tags }),
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        packs: {
          include: {
            pack: true,
          },
        },
      },
    });

    // Update pack associations if provided
    if (packIds !== undefined) {
      // Delete existing associations
      await prisma.documentLibraryPack.deleteMany({
        where: { documentLibraryId: id },
      });

      // Create new associations
      if (packIds.length > 0) {
        await prisma.documentLibraryPack.createMany({
          data: packIds.map((packId: string) => ({
            documentLibraryId: id,
            packId,
          })),
        });
      }
    }

    return NextResponse.json({
      ...updatedDocument,
      fileSize: Number(updatedDocument.fileSize),
    });
  } catch (error) {
    console.error("Error updating library document:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du document" },
      { status: 500 }
    );
  }
}

// DELETE /api/library/[id] - Delete a library document
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

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const document = await prisma.documentLibrary.findUnique({
      where: { id },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document non trouvé" },
        { status: 404 }
      );
    }

    // Delete document (cascade will handle related records)
    await prisma.documentLibrary.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting library document:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du document" },
      { status: 500 }
    );
  }
}

