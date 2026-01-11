import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { headers } from "next/headers";
import {
  uploadFile,
  generateFilename,
  validateFileUpload,
} from "@/lib/storage";

// POST /api/documents/upload - Upload a new document
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folderId = formData.get("folderId") as string | null;
    const studentId = formData.get("studentId") as string | null;
    const description = formData.get("description") as string | null;
    let targetFolderId = folderId;

    if (!file) {
      return NextResponse.json(
        { error: "Aucun fichier fourni" },
        { status: 400 }
      );
    }

    // If studentId provided but no folderId, use student's root folder
    if (!targetFolderId && studentId) {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: { rootFolderId: true }
      });
      if (student?.rootFolderId) {
        targetFolderId = student.rootFolderId;
      }
    }

    // Validate file
    const validation = validateFileUpload(file);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Check folder permissions if folderId is provided
    if (targetFolderId) {
      const folder = await prisma.folder.findUnique({
        where: { id: targetFolderId },
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

      // Check if user has upload permission (or is admin)
      const hasPermission =
        session.user.role === "ADMIN" ||
        folder.permissions.some((p) => p.canUpload);

      if (!hasPermission) {
        return NextResponse.json(
          { error: "Vous n'avez pas la permission d'uploader dans ce dossier" },
          { status: 403 }
        );
      }
    }

    // Generate unique filename
    const filename = generateFilename(file.name);

    // Upload to Vercel Blob
    const uploadResult = await uploadFile(file, filename, {
      folder: targetFolderId ? `documents/${targetFolderId}` : "documents",
    });

    // Create document record
    const document = await prisma.document.create({
      data: {
        name: file.name,
        description: description || null,
        fileUrl: uploadResult.url,
        fileSize: BigInt(uploadResult.size),
        contentType: uploadResult.contentType,
        folderId: targetFolderId || null,
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

    // Format response
    const response = {
      id: document.id,
      name: document.name,
      description: document.description,
      fileUrl: document.fileUrl,
      fileSize: Number(document.fileSize),
      contentType: document.contentType,
      owner: document.owner,
      folder: document.folder,
      createdAt: document.createdAt,
    };

    return NextResponse.json(
      {
        document: response,
        message: "Document uploadé avec succès",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error uploading document:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'upload du document" },
      { status: 500 }
    );
  }
}

