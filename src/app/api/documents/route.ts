import { NextRequest, NextResponse } from "next/server";
import { auth, canAccessStudent, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// GET /api/documents - List documents with filters
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const folderId = searchParams.get("folderId");
    const studentId = searchParams.get("studentId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};

    // Search filter
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    // Folder filter
    if (folderId) {
      where.folderId = folderId;
    }

    // Access control
    const userId = session.user.id;

    // Admin sees everything
    if (!isAdmin(session.user)) {
      // Non-admin users see their own documents or documents they have permission for
      where.OR = [
        { ownerId: userId },
        {
          permissions: {
            some: {
              userId: userId,
              canView: true,
            },
          },
        },
      ];
    }

    // If filtering by studentId, check access
    if (studentId && canAccessStudent(session.user)) {
      // Get student's root folder and filter documents in that folder
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: { rootFolderId: true },
      });

      if (student?.rootFolderId) {
        where.folderId = student.rootFolderId;
      }
    }

    // Get total count
    const total = await prisma.document.count({ where });

    // Get documents
    const documents = await prisma.document.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: "desc" },
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
          where: { userId },
          select: {
            canView: true,
            canDownload: true,
            canComment: true,
            canEdit: true,
          },
        },
      },
    });

    // Format response
    const formattedDocuments = documents.map((doc) => ({
      id: doc.id,
      name: doc.name,
      description: doc.description,
      fileUrl: doc.fileUrl,
      fileSize: Number(doc.fileSize),
      contentType: doc.contentType,
      numPages: doc.numPages,
      thumbnailUrl: doc.thumbnailUrl,
      version: doc.version,
      owner: doc.owner,
      folder: doc.folder,
      permissions: doc.permissions[0] || {
        canView: doc.ownerId === userId || isAdmin(session.user),
        canDownload: doc.ownerId === userId || isAdmin(session.user),
        canComment: doc.ownerId === userId || isAdmin(session.user),
        canEdit: doc.ownerId === userId || isAdmin(session.user),
      },
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));

    return NextResponse.json({
      documents: formattedDocuments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des documents" },
      { status: 500 }
    );
  }
}

