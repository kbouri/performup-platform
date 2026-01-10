import { NextRequest, NextResponse } from "next/server";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/documents/[id]/permissions - Get document permissions
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
        permissions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
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

    // Only owner or admin can view all permissions
    const canViewPermissions =
      isAdmin(session.user) || document.ownerId === session.user.id;

    if (!canViewPermissions) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    return NextResponse.json({
      permissions: document.permissions.map((p) => ({
        id: p.id,
        user: p.user,
        canView: p.canView,
        canDownload: p.canDownload,
        canComment: p.canComment,
        canEdit: p.canEdit,
        createdAt: p.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching permissions:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des permissions" },
      { status: 500 }
    );
  }
}

// POST /api/documents/[id]/permissions - Add/Update permission
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
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document non trouvé" },
        { status: 404 }
      );
    }

    // Only owner or admin can manage permissions
    const canManagePermissions =
      isAdmin(session.user) || document.ownerId === session.user.id;

    if (!canManagePermissions) {
      return NextResponse.json(
        { error: "Vous n'avez pas la permission de gérer les accès" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, canView, canDownload, canComment, canEdit } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId est requis" },
        { status: 400 }
      );
    }

    // Check if user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    // Upsert permission
    const permission = await prisma.documentPermission.upsert({
      where: {
        documentId_userId: {
          documentId: id,
          userId: userId,
        },
      },
      update: {
        canView: canView ?? true,
        canDownload: canDownload ?? false,
        canComment: canComment ?? false,
        canEdit: canEdit ?? false,
      },
      create: {
        documentId: id,
        userId: userId,
        canView: canView ?? true,
        canDownload: canDownload ?? false,
        canComment: canComment ?? false,
        canEdit: canEdit ?? false,
        createdBy: session.user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({
      permission: {
        id: permission.id,
        user: permission.user,
        canView: permission.canView,
        canDownload: permission.canDownload,
        canComment: permission.canComment,
        canEdit: permission.canEdit,
      },
      message: "Permission mise à jour avec succès",
    });
  } catch (error) {
    console.error("Error updating permission:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de la permission" },
      { status: 500 }
    );
  }
}

// DELETE /api/documents/[id]/permissions - Remove permission
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

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId est requis" },
        { status: 400 }
      );
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

    // Only owner or admin can manage permissions
    const canManagePermissions =
      isAdmin(session.user) || document.ownerId === session.user.id;

    if (!canManagePermissions) {
      return NextResponse.json(
        { error: "Vous n'avez pas la permission de gérer les accès" },
        { status: 403 }
      );
    }

    await prisma.documentPermission.delete({
      where: {
        documentId_userId: {
          documentId: id,
          userId: userId,
        },
      },
    });

    return NextResponse.json({
      message: "Permission supprimée avec succès",
    });
  } catch (error) {
    console.error("Error deleting permission:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la permission" },
      { status: 500 }
    );
  }
}

