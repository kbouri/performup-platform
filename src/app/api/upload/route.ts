import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  uploadFile,
  generateFilename,
  validateFileUpload,
} from "@/lib/storage";

// POST /api/upload - Simple file upload to blob storage
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

    if (!file) {
      return NextResponse.json(
        { error: "Aucun fichier fourni" },
        { status: 400 }
      );
    }

    // Validate file
    const validation = validateFileUpload(file);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Generate unique filename
    const filename = generateFilename(file.name);

    // Upload to storage (Vercel Blob or local)
    const uploadResult = await uploadFile(file, filename, {
      folder: "library",
    });

    return NextResponse.json({
      url: uploadResult.url,
      size: uploadResult.size,
      contentType: uploadResult.contentType,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: `Erreur lors de l'upload: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
