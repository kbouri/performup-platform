import { NextRequest, NextResponse } from "next/server";
import { auth, canAccessStudent, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";

// Helper to get all folder IDs under a root folder (recursive)
async function getFolderIdsUnderRoot(rootFolderId: string): Promise<string[]> {
  const allIds: string[] = [rootFolderId];

  async function collectChildren(parentId: string) {
    const children = await prisma.folder.findMany({
      where: { parentId },
      select: { id: true },
    });
    for (const child of children) {
      allIds.push(child.id);
      await collectChildren(child.id);
    }
  }

  await collectChildren(rootFolderId);
  return allIds;
}

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
    const targetUserId = searchParams.get("userId"); // Filter by specific user's documents
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};
    const folderWhere: Record<string, unknown> = {};

    // Search filter
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    // Access control
    const userId = session.user.id;

    // If viewing a specific user's documents (professor, mentor, etc.)
    if (targetUserId && isAdmin(session.user)) {
      // Admin viewing a specific user's documents
      where.ownerId = targetUserId;
      if (folderId) {
        where.folderId = folderId;
        folderWhere.parentId = folderId;
      } else {
        where.folderId = null;
        folderWhere.parentId = null;
      }
      folderWhere.createdBy = targetUserId;
    }

    // Determine the student context
    let studentRootFolderId: string | null = null;

    if (!targetUserId && studentId && canAccessStudent(session.user)) {
      // Viewing a specific student's documents
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: { rootFolderId: true },
      });
      studentRootFolderId = student?.rootFolderId || null;
    } else if (!targetUserId && !studentId) {
      // No studentId = viewing user's own documents (not student-specific)
      // For admins/mentors viewing their own space, show only documents they own
      // that are NOT in any student's root folder
    }

    // If we have a specific folder requested, use it (only if not already set by targetUserId)
    if (!targetUserId) {
      if (folderId) {
        where.folderId = folderId;
        folderWhere.parentId = folderId;
      } else if (studentRootFolderId) {
        // No folder specified but we have a student context - use student's root folder
        where.folderId = studentRootFolderId;
        folderWhere.parentId = studentRootFolderId;
      } else {
        // No folder and no student context - show root level documents owned by user
        // Exclude documents that belong to any student's folder structure
        where.folderId = null;
        where.ownerId = userId;
        folderWhere.parentId = null;

        // For non-admin, only show folders they created or have access to
        if (!isAdmin(session.user)) {
          // Get all student root folder IDs to exclude them
          const studentRootFolders = await prisma.student.findMany({
            where: { rootFolderId: { not: null } },
            select: { rootFolderId: true },
          });
          const studentRootIds = studentRootFolders
            .map(s => s.rootFolderId)
            .filter((id): id is string => id !== null);

          if (studentRootIds.length > 0) {
            folderWhere.id = { notIn: studentRootIds };
          }
        }
      }
    }

    // Additional access control for documents
    if (!isAdmin(session.user) && !studentId && !targetUserId) {
      // Non-admin viewing their own space - only their documents
      where.ownerId = userId;
    }

    // Get total count
    const total = await prisma.document.count({ where });

    // Get folders
    const folders = await prisma.folder.findMany({
      where: folderWhere,
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { documents: true },
        },
      },
    });

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
      folders,
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

