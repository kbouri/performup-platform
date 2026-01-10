"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatFileSize, formatRelativeTime } from "@/lib/utils";
import {
  Upload,
  Search,
  File,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  Presentation,
  MoreHorizontal,
  Download,
  Trash2,
  Eye,
  Share2,
  Loader2,
  FolderOpen,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface DocumentData {
  id: string;
  name: string;
  description: string | null;
  fileUrl: string;
  fileSize: number;
  contentType: string;
  numPages: number;
  version: number;
  owner: {
    id: string;
    name: string | null;
    email: string;
  };
  folder: {
    id: string;
    name: string;
    path: string;
  } | null;
  permissions: {
    canView: boolean;
    canDownload: boolean;
    canComment: boolean;
    canEdit: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  status: "uploading" | "success" | "error";
  error?: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<DocumentData | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);

      const response = await fetch(`/api/documents?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents);
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchDocuments();
    }, 300);
    return () => clearTimeout(debounce);
  }, [fetchDocuments]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newUploadingFiles: UploadingFile[] = Array.from(files).map((file) => ({
      id: `${file.name}-${Date.now()}`,
      file,
      progress: 0,
      status: "uploading",
    }));

    setUploadingFiles((prev) => [...prev, ...newUploadingFiles]);
    setUploadDialogOpen(true);

    // Upload each file
    newUploadingFiles.forEach((uploadFile) => {
      uploadDocument(uploadFile);
    });
  };

  const uploadDocument = async (uploadFile: UploadingFile) => {
    const formData = new FormData();
    formData.append("file", uploadFile.file);

    try {
      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? { ...f, progress: 100, status: "success" }
              : f
          )
        );
        fetchDocuments();
      } else {
        const data = await response.json();
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? { ...f, status: "error", error: data.error }
              : f
          )
        );
      }
    } catch {
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? { ...f, status: "error", error: "Erreur de connexion" }
            : f
        )
      );
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce document ?")) return;

    try {
      const response = await fetch(`/api/documents/${docId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchDocuments();
      }
    } catch (error) {
      console.error("Error deleting document:", error);
    }
  };

  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith("image/")) return ImageIcon;
    if (contentType.includes("pdf")) return FileText;
    if (contentType.includes("spreadsheet") || contentType.includes("excel"))
      return FileSpreadsheet;
    if (contentType.includes("presentation") || contentType.includes("powerpoint"))
      return Presentation;
    return File;
  };

  const getFileTypeLabel = (contentType: string) => {
    if (contentType.includes("pdf")) return "PDF";
    if (contentType.includes("word") || contentType.includes("document"))
      return "DOC";
    if (contentType.includes("spreadsheet") || contentType.includes("excel"))
      return "XLS";
    if (contentType.includes("presentation") || contentType.includes("powerpoint"))
      return "PPT";
    if (contentType.startsWith("image/")) return "IMG";
    return "FILE";
  };

  const clearCompletedUploads = () => {
    setUploadingFiles((prev) =>
      prev.filter((f) => f.status === "uploading")
    );
    if (uploadingFiles.every((f) => f.status !== "uploading")) {
      setUploadDialogOpen(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Documents"
        description="Gérez vos documents et dossiers"
        breadcrumbs={[{ label: "Documents" }]}
        actions={
          <>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.webp"
            />
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              Uploader
            </Button>
          </>
        }
      />

      {/* Search */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher un document..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold font-display text-performup-blue">
              {documents.length}
            </div>
            <p className="text-sm text-muted-foreground">Total documents</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold font-display">
              {formatFileSize(
                documents.reduce((acc, doc) => acc + doc.fileSize, 0)
              )}
            </div>
            <p className="text-sm text-muted-foreground">Espace utilisé</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold font-display text-success">
              {documents.filter((d) => d.contentType.includes("pdf")).length}
            </div>
            <p className="text-sm text-muted-foreground">PDFs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold font-display text-performup-gold">
              {documents.filter((d) => d.contentType.startsWith("image/")).length}
            </div>
            <p className="text-sm text-muted-foreground">Images</p>
          </CardContent>
        </Card>
      </div>

      {/* Documents list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-performup-blue" />
        </div>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Aucun document</p>
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              Uploader un document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {documents.map((doc) => {
                const FileIcon = getFileIcon(doc.contentType);
                return (
                  <div
                    key={doc.id}
                    className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <FileIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedDocument(doc);
                            setPreviewDialogOpen(true);
                          }}
                          className="font-medium truncate hover:text-performup-blue transition-colors"
                        >
                          {doc.name}
                        </button>
                        <Badge variant="outline" className="text-xs">
                          {getFileTypeLabel(doc.contentType)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(doc.fileSize)} •{" "}
                        {formatRelativeTime(new Date(doc.updatedAt))} •{" "}
                        {doc.owner.name || doc.owner.email}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedDocument(doc);
                            setPreviewDialogOpen(true);
                          }}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Aperçu
                        </DropdownMenuItem>
                        {doc.permissions.canDownload && (
                          <DropdownMenuItem asChild>
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={doc.name}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Télécharger
                            </a>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem>
                          <Share2 className="mr-2 h-4 w-4" />
                          Partager
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {doc.permissions.canEdit && (
                          <DropdownMenuItem
                            className="text-error"
                            onClick={() => handleDeleteDocument(doc.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload de documents</DialogTitle>
            <DialogDescription>
              {uploadingFiles.some((f) => f.status === "uploading")
                ? "Upload en cours..."
                : "Upload terminé"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {uploadingFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 rounded-lg border"
              >
                <File className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.file.size)}
                  </p>
                </div>
                {file.status === "uploading" && (
                  <Loader2 className="h-4 w-4 animate-spin text-performup-blue" />
                )}
                {file.status === "success" && (
                  <CheckCircle className="h-4 w-4 text-success" />
                )}
                {file.status === "error" && (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-error" />
                    <span className="text-xs text-error">{file.error}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          {uploadingFiles.every((f) => f.status !== "uploading") && (
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={clearCompletedUploads}>
                Fermer
              </Button>
              <Button onClick={() => fileInputRef.current?.click()}>
                Ajouter d&apos;autres fichiers
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedDocument?.name}</DialogTitle>
            <DialogDescription>
              {selectedDocument && formatFileSize(selectedDocument.fileSize)} •{" "}
              {selectedDocument &&
                formatRelativeTime(new Date(selectedDocument.updatedAt))}
            </DialogDescription>
          </DialogHeader>
          {selectedDocument && (
            <div className="space-y-4">
              {selectedDocument.contentType.includes("pdf") ? (
                <iframe
                  src={selectedDocument.fileUrl}
                  className="w-full h-[600px] rounded-lg border"
                  title={selectedDocument.name}
                />
              ) : selectedDocument.contentType.startsWith("image/") ? (
                <div className="flex justify-center relative w-full h-[600px]">
                  <Image
                    src={selectedDocument.fileUrl}
                    alt={selectedDocument.name}
                    fill
                    className="object-contain rounded-lg"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="text-center py-12">
                  <File className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Aperçu non disponible pour ce type de fichier
                  </p>
                  <Button asChild>
                    <a
                      href={selectedDocument.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={selectedDocument.name}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Télécharger
                    </a>
                  </Button>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
                  Fermer
                </Button>
                {selectedDocument.permissions.canDownload && (
                  <Button asChild>
                    <a
                      href={selectedDocument.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={selectedDocument.name}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Télécharger
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
