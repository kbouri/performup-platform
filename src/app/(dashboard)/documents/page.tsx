"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { UserAvatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, formatFileSize, formatRelativeTime } from "@/lib/utils";
import {
  Search,
  FolderOpen,
  FileText,
  FileImage,
  FileSpreadsheet,
  File,
  Upload,
  MoreHorizontal,
  Download,
  Eye,
  Trash2,
  Share2,
  ChevronRight,
  LayoutGrid,
  List,
  Star,
} from "lucide-react";

// Mock folder structure
const foldersData = [
  {
    id: "root",
    name: "Documents",
    parentId: null,
  },
  {
    id: "quant",
    name: "Quant",
    parentId: "root",
  },
  {
    id: "verbal",
    name: "Verbal",
    parentId: "root",
  },
  {
    id: "essays",
    name: "Essays",
    parentId: "root",
  },
  {
    id: "cv",
    name: "CV & LM",
    parentId: "root",
  },
  {
    id: "oraux",
    name: "Oraux",
    parentId: "root",
  },
  {
    id: "quant-exercises",
    name: "Exercices",
    parentId: "quant",
  },
  {
    id: "quant-theory",
    name: "Théorie",
    parentId: "quant",
  },
];

const documentsData = [
  {
    id: "1",
    name: "Guide GMAT Quant - Chapitre 1.pdf",
    folderId: "quant-theory",
    fileSize: 2456000,
    contentType: "application/pdf",
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    owner: "Admin",
    sharedWith: ["Marie Dupont", "Thomas Bernard"],
    starred: true,
  },
  {
    id: "2",
    name: "Exercices Arithmétique.pdf",
    folderId: "quant-exercises",
    fileSize: 1234000,
    contentType: "application/pdf",
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    owner: "Prof. Martin",
    sharedWith: ["Marie Dupont"],
    starred: false,
  },
  {
    id: "3",
    name: "CV Marie Dupont v3.docx",
    folderId: "cv",
    fileSize: 456000,
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    owner: "Marie Dupont",
    sharedWith: ["Sophie Martin"],
    starred: true,
  },
  {
    id: "4",
    name: "Essay HEC - Question 1.docx",
    folderId: "essays",
    fileSize: 234000,
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    owner: "Marie Dupont",
    sharedWith: ["Sophie Martin", "Admin"],
    starred: false,
  },
  {
    id: "5",
    name: "Vocabulaire GMAT.xlsx",
    folderId: "verbal",
    fileSize: 789000,
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    owner: "Prof. Laurent",
    sharedWith: ["Marie Dupont", "Thomas Bernard", "Julie Chen"],
    starred: false,
  },
  {
    id: "6",
    name: "Simulation Oral - Notes.pdf",
    folderId: "oraux",
    fileSize: 567000,
    contentType: "application/pdf",
    updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    owner: "Sophie Martin",
    sharedWith: ["Marie Dupont"],
    starred: false,
  },
];

type ViewMode = "grid" | "list";

export default function DocumentsPage() {
  const [currentFolderId, setCurrentFolderId] = useState<string>("root");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Get current folder
  const currentFolder = foldersData.find((f) => f.id === currentFolderId);

  // Get breadcrumb path
  const getBreadcrumbs = () => {
    const breadcrumbs = [];
    let folder = currentFolder;
    while (folder) {
      breadcrumbs.unshift(folder);
      folder = foldersData.find((f) => f.id === folder?.parentId);
    }
    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  // Get subfolders
  const subfolders = foldersData.filter((f) => f.parentId === currentFolderId);

  // Get documents in current folder
  const currentDocuments = documentsData.filter(
    (d) =>
      d.folderId === currentFolderId &&
      (searchQuery === "" || d.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getFileIcon = (contentType: string) => {
    if (contentType.includes("pdf")) return File;
    if (contentType.includes("image")) return FileImage;
    if (contentType.includes("spreadsheet") || contentType.includes("excel"))
      return FileSpreadsheet;
    return FileText;
  };

  const getFileColor = (contentType: string) => {
    if (contentType.includes("pdf")) return "text-error";
    if (contentType.includes("image")) return "text-success";
    if (contentType.includes("spreadsheet") || contentType.includes("excel"))
      return "text-calendar-quant";
    return "text-performup-blue";
  };

  return (
    <>
      <PageHeader
        title="Documents"
        description="Gérez vos fichiers et dossiers"
        breadcrumbs={[{ label: "Documents" }]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline">
              <FolderOpen className="mr-2 h-4 w-4" />
              Nouveau dossier
            </Button>
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Téléverser
            </Button>
          </div>
        }
      />

      {/* Breadcrumb navigation */}
      <div className="flex items-center gap-2 mb-6">
        {breadcrumbs.map((folder, index) => (
          <div key={folder.id} className="flex items-center gap-2">
            {index > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            <Button
              variant={index === breadcrumbs.length - 1 ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setCurrentFolderId(folder.id)}
            >
              {index === 0 ? <FolderOpen className="mr-1 h-4 w-4" /> : null}
              {folder.name}
            </Button>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher un document..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Folders */}
      {subfolders.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Dossiers</h3>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {subfolders.map((folder) => (
              <Card
                key={folder.id}
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => setCurrentFolderId(folder.id)}
              >
                <CardContent className="pt-6 text-center">
                  <FolderOpen className="h-12 w-12 mx-auto text-performup-gold mb-2" />
                  <p className="font-medium text-sm truncate">{folder.name}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Documents */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          Fichiers ({currentDocuments.length})
        </h3>

        {viewMode === "grid" ? (
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {currentDocuments.map((doc) => {
              const FileIcon = getFileIcon(doc.contentType);
              const fileColor = getFileColor(doc.contentType);

              return (
                <Card key={doc.id} className="group relative overflow-hidden">
                  <CardContent className="pt-6">
                    <div className="relative">
                      <FileIcon className={cn("h-12 w-12 mx-auto mb-3", fileColor)} />
                      {doc.starred && (
                        <Star className="absolute top-0 right-0 h-4 w-4 text-performup-gold fill-current" />
                      )}
                    </div>
                    <p className="font-medium text-sm truncate text-center">{doc.name}</p>
                    <p className="text-xs text-muted-foreground text-center mt-1">
                      {formatFileSize(doc.fileSize)}
                    </p>
                    <p className="text-xs text-muted-foreground text-center">
                      {formatRelativeTime(doc.updatedAt)}
                    </p>

                    {/* Quick actions on hover */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            Aperçu
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="mr-2 h-4 w-4" />
                            Télécharger
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Share2 className="mr-2 h-4 w-4" />
                            Partager
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-error">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Shared indicator */}
                    {doc.sharedWith.length > 0 && (
                      <div className="absolute bottom-2 left-2 flex -space-x-1">
                        {doc.sharedWith.slice(0, 3).map((name, i) => (
                          <UserAvatar key={i} name={name} size="sm" className="w-5 h-5 text-[8px] border-2 border-card" />
                        ))}
                        {doc.sharedWith.length > 3 && (
                          <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[8px] border-2 border-card">
                            +{doc.sharedWith.length - 3}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">Nom</th>
                    <th className="text-left p-4 font-medium">Propriétaire</th>
                    <th className="text-left p-4 font-medium">Modifié</th>
                    <th className="text-left p-4 font-medium">Taille</th>
                    <th className="text-left p-4 font-medium">Partagé avec</th>
                    <th className="text-right p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentDocuments.map((doc) => {
                    const FileIcon = getFileIcon(doc.contentType);
                    const fileColor = getFileColor(doc.contentType);

                    return (
                      <tr key={doc.id} className="border-b hover:bg-muted/30">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <FileIcon className={cn("h-5 w-5", fileColor)} />
                            <span className="font-medium">{doc.name}</span>
                            {doc.starred && (
                              <Star className="h-4 w-4 text-performup-gold fill-current" />
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">{doc.owner}</td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {formatRelativeTime(doc.updatedAt)}
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {formatFileSize(doc.fileSize)}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center -space-x-1">
                            {doc.sharedWith.slice(0, 3).map((name, i) => (
                              <UserAvatar
                                key={i}
                                name={name}
                                size="sm"
                                className="w-6 h-6 text-[10px] border-2 border-card"
                              />
                            ))}
                            {doc.sharedWith.length > 3 && (
                              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] border-2 border-card">
                                +{doc.sharedWith.length - 3}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="mr-2 h-4 w-4" />
                                Aperçu
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Download className="mr-2 h-4 w-4" />
                                Télécharger
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Share2 className="mr-2 h-4 w-4" />
                                Partager
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-error">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {currentDocuments.length === 0 && subfolders.length === 0 && (
          <div className="text-center py-12">
            <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Ce dossier est vide</p>
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Téléverser un fichier
            </Button>
          </div>
        )}
      </div>

      {/* Storage info */}
      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Espace de stockage</p>
              <p className="text-xs text-muted-foreground">2.4 GB utilisés sur 10 GB</p>
            </div>
            <div className="w-48 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-performup-blue rounded-full"
                style={{ width: "24%" }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

