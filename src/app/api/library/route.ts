import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// GET /api/library - Get all library documents
export async function GET(request: NextRequest) {
  try {
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

    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get("category");
    const isPrivate = searchParams.get("isPrivate");
    const search = searchParams.get("search");

    // Build where clause
    const where: Record<string, unknown> = {};

    if (category) {
      where.category = category;
    }

    if (isPrivate !== null) {
      where.isPrivate = isPrivate === "true";
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { tags: { hasSome: [search] } },
      ];
    }

    const documents = await prisma.documentLibrary.findMany({
      where,
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
        _count: {
          select: {
            versions: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform BigInt to Number for JSON serialization
    const transformedDocuments = documents.map((doc) => ({
      ...doc,
      fileSize: Number(doc.fileSize),
    }));

    // Get unique categories
    const categories = await prisma.documentLibrary.findMany({
      select: { category: true },
      distinct: ["category"],
    });

    // Get statistics
    const stats = {
      totalDocuments: documents.length,
      publicDocuments: documents.filter((d) => !d.isPrivate).length,
      privateDocuments: documents.filter((d) => d.isPrivate).length,
      categoriesCount: categories.length,
    };

    return NextResponse.json({
      documents: transformedDocuments,
      categories: categories.map((c) => c.category).filter(Boolean),
      stats,
    });
  } catch (error) {
    console.error("Error fetching library documents:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des documents" },
      { status: 500 }
    );
  }
}

// POST /api/library - Create a new library document
export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json();
    const {
      name,
      description,
      fileUrl,
      fileSize,
      contentType,
      numPages,
      category,
      isPrivate,
      tags,
      packIds,
      targetFolder,
    } = body;

    // Validate required fields
    if (!name || !fileUrl || !contentType) {
      return NextResponse.json(
        { error: "Nom, URL et type de fichier requis" },
        { status: 400 }
      );
    }

    // Create document
    const document = await prisma.documentLibrary.create({
      data: {
        name,
        description,
        fileUrl,
        fileSize: BigInt(fileSize || 0),
        contentType,
        numPages: numPages || 1,
        category: category || "Général",
        isPrivate: isPrivate || false,
        tags: tags || [],
        createdBy: session.user.id,
        // Create pack associations
        packs: packIds?.length
          ? {
              create: packIds.map((packId: string) => ({
                packId,
              })),
            }
          : undefined,
        // Create folder document association
        folderDocuments: targetFolder
          ? {
              create: {
                targetFolder,
              },
            }
          : undefined,
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
        folderDocuments: true,
      },
    });

    return NextResponse.json(
      {
        ...document,
        fileSize: Number(document.fileSize),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating library document:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du document" },
      { status: 500 }
    );
  }
}

