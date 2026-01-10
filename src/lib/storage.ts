import { put, del, list } from "@vercel/blob";

/**
 * Upload a file to Vercel Blob Storage
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
  const path = options?.folder ? `${options.folder}/${filename}` : filename;

  const blob = await put(path, file, {
    access: "public",
    addRandomSuffix: true,
  });

  return {
    url: blob.url,
    size: file.size,
    contentType: file.type || "application/octet-stream",
  };
}

/**
 * Delete a file from Vercel Blob Storage
 */
export async function deleteFile(url: string): Promise<void> {
  await del(url);
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
  const { blobs } = await list({ prefix });

  return blobs.map((blob) => ({
    url: blob.url,
    pathname: blob.pathname,
    size: blob.size,
    uploadedAt: blob.uploadedAt,
  }));
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

