import { put, del, list } from "@vercel/blob";
import { writeFile, unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

// Check if Vercel Blob is configured
const useVercelBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
// Check if running on Vercel (serverless environment with read-only filesystem)
const isVercelEnvironment = !!process.env.VERCEL;

/**
 * Upload a file to Vercel Blob Storage or local filesystem
 */
export async function uploadFile(
  file: File | Blob,
  filename: string,
  options?: {
    folder?: string;
  }
): Promise<{
  url: string;
  size: number;
  contentType: string;
}> {
  const filePath = options?.folder ? `${options.folder}/${filename}` : filename;

  // On Vercel, we MUST use Vercel Blob - filesystem is read-only
  if (isVercelEnvironment && !useVercelBlob) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN n'est pas configuré. Veuillez connecter un Blob Store dans les paramètres Vercel."
    );
  }

  if (useVercelBlob) {
    // Use Vercel Blob in production
    const blob = await put(filePath, file, {
      access: "public",
      addRandomSuffix: true,
    });

    return {
      url: blob.url,
      size: file.size,
      contentType: file.type || "application/octet-stream",
    };
  } else {
    // Use local filesystem in development only
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    const folderPath = options?.folder
      ? path.join(uploadDir, options.folder)
      : uploadDir;

    // Create directory if it doesn't exist
    if (!existsSync(folderPath)) {
      await mkdir(folderPath, { recursive: true });
    }

    // Add timestamp to filename for uniqueness
    const timestamp = Date.now();
    const uniqueFilename = `${timestamp}-${filename}`;
    const fullPath = path.join(folderPath, uniqueFilename);

    // Convert File/Blob to Buffer and write
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(fullPath, buffer);

    // Return URL relative to public folder
    const relativePath = options?.folder
      ? `/uploads/${options.folder}/${uniqueFilename}`
      : `/uploads/${uniqueFilename}`;

    return {
      url: relativePath,
      size: file.size,
      contentType: file.type || "application/octet-stream",
    };
  }
}

/**
 * Delete a file from Vercel Blob Storage or local filesystem
 */
export async function deleteFile(url: string): Promise<void> {
  if (useVercelBlob) {
    await del(url);
  } else {
    // Delete from local filesystem
    if (url.startsWith("/uploads/")) {
      const filePath = path.join(process.cwd(), "public", url);
      try {
        await unlink(filePath);
      } catch (error) {
        console.error("Error deleting local file:", error);
      }
    }
  }
}

/**
 * List files in a folder
 */
export async function listFiles(prefix?: string): Promise<
  Array<{
    url: string;
    pathname: string;
    size: number;
    uploadedAt: Date;
  }>
> {
  if (useVercelBlob) {
    const { blobs } = await list({ prefix });

    return blobs.map((blob) => ({
      url: blob.url,
      pathname: blob.pathname,
      size: blob.size,
      uploadedAt: blob.uploadedAt,
    }));
  } else {
    // Local filesystem doesn't support listing - return empty
    return [];
  }
}

/**
 * Generate a unique filename with timestamp
 */
export function generateFilename(originalName: string): string {
  const timestamp = Date.now();
  const sanitized = originalName
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, "-")
    .replace(/-+/g, "-");
  const parts = sanitized.split(".");
  const ext = parts.pop();
  const name = parts.join(".");
  return `${name}-${timestamp}.${ext}`;
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || "";
}

/**
 * Check if file type is allowed
 */
export function isAllowedFileType(
  contentType: string,
  allowedTypes: string[]
): boolean {
  return allowedTypes.some(
    (type) =>
      contentType === type ||
      (type.endsWith("/*") && contentType.startsWith(type.replace("/*", "/")))
  );
}

/**
 * Default allowed file types
 */
export const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

/**
 * Maximum file size (50MB)
 */
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Validate file upload
 */
export function validateFileUpload(
  file: File,
  options?: {
    maxSize?: number;
    allowedTypes?: string[];
  }
): { valid: boolean; error?: string } {
  const maxSize = options?.maxSize || MAX_FILE_SIZE;
  const allowedTypes = options?.allowedTypes || ALLOWED_DOCUMENT_TYPES;

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `Le fichier est trop volumineux. Taille maximale: ${Math.round(maxSize / 1024 / 1024)}MB`,
    };
  }

  if (!isAllowedFileType(file.type, allowedTypes)) {
    return {
      valid: false,
      error: "Type de fichier non autorisé",
    };
  }

  return { valid: true };
}

