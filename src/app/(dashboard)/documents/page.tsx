"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
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
  FolderPlus,
  ArrowLeft,
  ChevronRight,
  Folder,
  CheckCircle,
  AlertCircle,
  Pencil,
  Copy,
  FolderUp,
  Files
} from "lucide-react";

interface StudentInfo {
  id: string;
  name: string | null;
  email: string;
}

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

interface FolderData {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
  _count: {
    documents: number;
  };
}

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  status: "uploading" | "success" | "error";
  error?: string;
}

interface UserInfo {
  id: string;
  name: string | null;
  email: string;
  role?: string;
}

export default function DocumentsPage() {
  const searchParams = useSearchParams();
  const studentIdParam = searchParams.get("studentId");
  const userIdParam = searchParams.get("userId");

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderStack, setFolderStack] = useState<FolderData[]>([]);

  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<DocumentData | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Fetch student info
  useEffect(() => {
    async function fetchStudentInfo() {
      if (!studentIdParam) {
        setStudentInfo(null);
        return;
      }
      try {
        const response = await fetch(`/api/students/${studentIdParam}`);
        if (response.ok) {
          const data = await response.json();
          setStudentInfo({
            id: data.student.id,
            name: data.student.user.name,
            email: data.student.user.email,
          });
        }
      } catch (error) {
        console.error("Error fetching student info:", error);
      }
    }
    fetchStudentInfo();
  }, [studentIdParam]);

  // Fetch user info (for professor/mentor documents)
  useEffect(() => {
    async function fetchUserInfo() {
      if (!userIdParam) {
        setUserInfo(null);
        return;
      }
      try {
        const response = await fetch(`/api/users/${userIdParam}`);
        if (response.ok) {
          const data = await response.json();
          setUserInfo({
            id: data.user.id,
            name: data.user.name || `${data.user.firstName || ""} ${data.user.lastName || ""}`.trim(),
            email: data.user.email,
            role: data.user.role,
          });
        }
      } catch (error) {
        console.error("Error fetching user info:", error);
      }
    }
    fetchUserInfo();
  }, [userIdParam]);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (studentIdParam) params.set("studentId", studentIdParam);
      if (userIdParam) params.set("userId", userIdParam);
      if (currentFolderId) params.set("folderId", currentFolderId);

      const response = await fetch(`/api/documents?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents);
        setFolders(data.folders);
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, studentIdParam, userIdParam, currentFolderId]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchDocuments();
    }, 300);
    return () => clearTimeout(debounce);
  }, [fetchDocuments]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    try {
      const res = await fetch("/api/documents/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFolderName,
          parentId: currentFolderId,
          studentId: studentIdParam // Optional: create root for student if needed
        }),
      });

      if (res.ok) {
        setCreateFolderOpen(false);
        setNewFolderName("");
        fetchDocuments();
      } else {
        alert("Erreur lors de la création du dossier");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCreatingFolder(false);
    }
  };

  const navigateToFolder = (folder: FolderData) => {
    setFolderStack([...folderStack, folder]);
    setCurrentFolderId(folder.id);
  };

  const navigateUp = () => {
    if (folderStack.length === 0) return;
    const newStack = [...folderStack];
    newStack.pop();
    setFolderStack(newStack);
    setCurrentFolderId(newStack.length > 0 ? newStack[newStack.length - 1].id : null);
  };

  const navigateToBreadcrumb = (index: number) => {
    if (index === -1) {
      setFolderStack([]);
      setCurrentFolderId(null);
    } else {
      const newStack = folderStack.slice(0, index + 1);
      setFolderStack(newStack);
      setCurrentFolderId(newStack[newStack.length - 1].id);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newUploadingFiles: UploadingFile[] = Array.from(files).map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
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

    // Reset input
    e.target.value = "";
  };

  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Group files by their relative folder path
    const filesByFolder = new Map<string, File[]>();

    for (const file of Array.from(files)) {
      // webkitRelativePath gives us the relative path including folder name
      const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
      const pathParts = relativePath.split("/");

      // Get the folder path (everything except the filename)
      const folderPath = pathParts.length > 1 ? pathParts.slice(0, -1).join("/") : "";

      if (!filesByFolder.has(folderPath)) {
        filesByFolder.set(folderPath, []);
      }
      filesByFolder.get(folderPath)!.push(file);
    }

    // First, create the folder structure
    const folderIdMap = new Map<string, string>();
    const sortedPaths = Array.from(filesByFolder.keys()).sort();

    for (const folderPath of sortedPaths) {
      if (!folderPath) continue; // Root level files

      const pathParts = folderPath.split("/");
      let parentId = currentFolderId;
      let currentPath = "";

      for (const part of pathParts) {
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        if (!folderIdMap.has(currentPath)) {
          // Create this folder
          try {
            const res = await fetch("/api/documents/folders", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: part,
                parentId: parentId,
                studentId: studentIdParam,
              }),
            });

            if (res.ok) {
              const data = await res.json();
              folderIdMap.set(currentPath, data.folder.id);
              parentId = data.folder.id;
            }
          } catch (error) {
            console.error("Error creating folder:", error);
          }
        } else {
          parentId = folderIdMap.get(currentPath)!;
        }
      }
    }

    // Now upload files to their respective folders
    const allFiles: UploadingFile[] = [];

    for (const [folderPath, folderFiles] of filesByFolder) {
      const targetFolderId = folderPath ? folderIdMap.get(folderPath) : currentFolderId;

      for (const file of folderFiles) {
        const uploadFile: UploadingFile = {
          id: `${file.name}-${Date.now()}-${Math.random()}`,
          file,
          progress: 0,
          status: "uploading",
        };
        allFiles.push(uploadFile);

        // Upload with the target folder
        uploadDocumentToFolder(uploadFile, targetFolderId || null);
      }
    }

    setUploadingFiles((prev) => [...prev, ...allFiles]);
    setUploadDialogOpen(true);

    // Refresh after all uploads
    setTimeout(() => fetchDocuments(), 2000);

    // Reset input
    e.target.value = "";
  };

  const uploadDocumentToFolder = async (uploadFile: UploadingFile, targetFolderId: string | null) => {
    const formData = new FormData();
    formData.append("file", uploadFile.file);
    if (targetFolderId) {
      formData.append("folderId", targetFolderId);
    }
    if (studentIdParam) {
      formData.append("studentId", studentIdParam);
    }

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

  const uploadDocument = async (uploadFile: UploadingFile) => {
    const formData = new FormData();
    formData.append("file", uploadFile.file);
    if (currentFolderId) {
      formData.append("folderId", currentFolderId);
    }
    if (studentIdParam) {
      formData.append("studentId", studentIdParam);
    }
    // TODO: Add support for passing description if needed

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

  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [managingFile, setManagingFile] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<FolderData | null>(null);

  // Handlers
  const handleRename = async () => {
    if (!newName.trim()) return;
    setManagingFile(true);
    try {
      // Check if renaming document or folder
      const isFolder = !!selectedFolder;
      const id = isFolder ? selectedFolder?.id : selectedDocument?.id;
      const url = isFolder ? `/api/documents/folders/${id}` : `/api/documents/${id}`;

      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName })
      });

      if (res.ok) {
        setRenameDialogOpen(false);
        fetchDocuments();
      } else {
        alert("Erreur lors du renommage");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setManagingFile(false);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm("Êtes-vous sûr ? Le dossier doit être vide.")) return;
    try {
      const res = await fetch(`/api/documents/folders/${folderId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchDocuments();
      } else {
        const data = await res.json();
        alert(data.error || "Erreur lors de la suppression");
      }
    } catch (e) {
      console.error(e);
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

  const handleDuplicateDocument = async (docId: string) => {
    setDuplicating(docId);
    try {
      const response = await fetch(`/api/documents/${docId}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: currentFolderId }),
      });

      if (response.ok) {
        fetchDocuments();
      } else {
        const data = await response.json();
        alert(data.error || "Erreur lors de la duplication");
      }
    } catch (error) {
      console.error("Error duplicating document:", error);
    } finally {
      setDuplicating(null);
    }
  };

  const handleDuplicateFolder = async (folderId: string) => {
    setDuplicating(folderId);
    try {
      const response = await fetch(`/api/documents/folders/${folderId}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId: currentFolderId }),
      });

      if (response.ok) {
        fetchDocuments();
      } else {
        const data = await response.json();
        alert(data.error || "Erreur lors de la duplication");
      }
    } catch (error) {
      console.error("Error duplicating folder:", error);
    } finally {
      setDuplicating(null);
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

  const getPageTitle = () => {
    if (studentInfo) return `Documents de ${studentInfo.name || studentInfo.email}`;
    if (userInfo) return `Documents de ${userInfo.name || userInfo.email}`;
    return "Documents";
  };

  const getPageDescription = () => {
    if (studentInfo) return "Documents accessibles par cet étudiant";
    if (userInfo) return "Documents de ce membre de l'équipe";
    return "Gérez vos documents et dossiers";
  };

  const navBreadcrumbs = studentInfo
    ? [
      { label: "Étudiants", href: "/students" },
      { label: studentInfo.name || studentInfo.email, href: `/students/${studentInfo.id}` },
      { label: "Documents" },
    ]
    : userInfo
    ? [
      { label: "Équipe", href: "/admin/team" },
      { label: userInfo.name || userInfo.email },
      { label: "Documents" },
    ]
    : [{ label: "Documents" }];

  return (
    <>
      <PageHeader
        title={getPageTitle()}
        description={getPageDescription()}
        breadcrumbs={navBreadcrumbs}
        actions={
          <div className="flex gap-2">
            {studentInfo && (
              <Button variant="outline" asChild>
                <Link href={`/students/${studentInfo.id}`}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Retour à la fiche
                </Link>
              </Button>
            )}
            {userInfo && (
              <Button variant="outline" onClick={() => window.history.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
              </Button>
            )}
            <Button variant="outline" onClick={() => setCreateFolderOpen(true)}>
              <FolderPlus className="mr-2 h-4 w-4" />
              Nouveau dossier
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.webp"
            />
            <input
              ref={folderInputRef}
              type="file"
              // @ts-expect-error webkitdirectory is not in React types
              webkitdirectory=""
              directory=""
              multiple
              onChange={handleFolderSelect}
              className="hidden"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Upload className="mr-2 h-4 w-4" />
                  Uploader
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                  <Files className="mr-2 h-4 w-4" />
                  Uploader des fichiers
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => folderInputRef.current?.click()}>
                  <FolderUp className="mr-2 h-4 w-4" />
                  Uploader un dossier
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      {/* Folder Navigation Breadcrumbs */}
      <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground overflow-x-auto pb-2">
        <button
          onClick={() => navigateToBreadcrumb(-1)}
          className={`hover:text-foreground transition-colors ${!currentFolderId ? 'font-semibold text-foreground' : ''}`}
        >
          Racine
        </button>
        {folderStack.map((folder, index) => (
          <div key={folder.id} className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4" />
            <button
              onClick={() => navigateToBreadcrumb(index)}
              className={`hover:text-foreground transition-colors whitespace-nowrap ${index === folderStack.length - 1 ? 'font-semibold text-foreground' : ''}`}
            >
              {folder.name}
            </button>
          </div>
        ))}
      </div>

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
      {!currentFolderId && !searchQuery && (
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
      )}

      {/* Documents list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-performup-blue" />
        </div>
      ) : documents.length === 0 && folders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "Aucun résultat" : "Dossier vide"}
            </p>
            {!searchQuery && (
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={() => setCreateFolderOpen(true)}>
                  <FolderPlus className="mr-2 h-4 w-4" />
                  Nouveau dossier
                </Button>
                <Button onClick={() => fileInputRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" />
                  Uploader un document
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {/* Folders */}
              {folders.map(folder => (
                <div
                  key={folder.id}
                  className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer group"
                  onClick={() => navigateToFolder(folder)}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Folder className="h-5 w-5 fill-current" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{folder.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {folder._count.documents} fichiers
                    </p>
                  </div>
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setSelectedFolder(folder);
                          setSelectedDocument(null);
                          setNewName(folder.name);
                          setRenameDialogOpen(true);
                        }}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Renommer
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDuplicateFolder(folder.id)}
                          disabled={duplicating === folder.id}
                        >
                          {duplicating === folder.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Copy className="mr-2 h-4 w-4" />
                          )}
                          Dupliquer
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-error" onClick={() => handleDeleteFolder(folder.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}

              {/* Files */}
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
                          className="font-medium truncate hover:text-performup-blue transition-colors text-left"
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
                        <DropdownMenuItem
                          onClick={() => handleDuplicateDocument(doc.id)}
                          disabled={duplicating === doc.id}
                        >
                          {duplicating === doc.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Copy className="mr-2 h-4 w-4" />
                          )}
                          Dupliquer
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {doc.permissions.canEdit && (
                          <DropdownMenuItem onClick={() => {
                            setSelectedDocument(doc);
                            setSelectedFolder(null); // Ensure folder is null
                            setNewName(doc.name);
                            setRenameDialogOpen(true);
                          }}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Renommer
                          </DropdownMenuItem>
                        )}
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

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renommer {selectedFolder ? "le dossier" : "le document"}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>Nouveau nom</Label>
            <Input value={newName} onChange={e => setNewName(e.target.value)} className="mt-2" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleRename} disabled={managingFile}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Create Folder Dialog */}
      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau dossier</DialogTitle>
            <DialogDescription>
              Créez un nouveau dossier pour organiser vos documents.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="folderName">Nom du dossier</Label>
            <Input
              id="folderName"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Ex: Factures"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateFolderOpen(false)}>Annuler</Button>
            <Button onClick={handleCreateFolder} disabled={creatingFolder || !newFolderName}>
              {creatingFolder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer
            </Button>
          </DialogFooter>
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
