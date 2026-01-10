"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Upload,
  Folder,
  File,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  Archive,
  MoreVertical,
  Download,
  Trash2,
  Edit,
  Eye,
  Lock,
  Globe,
  Tag,
  ChevronRight,
  ChevronDown,
  Plus,
  X,
  Filter,
  Grid,
  List,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { formatFileSize, formatDate } from "@/lib/utils";

interface LibraryDocument {
  id: string;
  name: string;
  description: string | null;
  fileUrl: string;
  fileSize: number;
  contentType: string;
  numPages: number;
  category: string;
  isPrivate: boolean;
  geographies: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  creator: {
    id: string;
    name: string | null;
    email: string;
  };
  packs: {
    pack: {
      id: string;
      name: string;
      displayName: string;
    };
  }[];
  _count: {
    versions: number;
  };
}

interface Pack {
  id: string;
  name: string;
  displayName: string;
}

interface Stats {
  totalDocuments: number;
  publicDocuments: number;
  privateDocuments: number;
  categoriesCount: number;
}

// Categories for the folder structure
const FOLDER_CATEGORIES = [
  { id: "test-prep", name: "Ressources Test", icon: "📚", subcategories: ["GRE", "GMAT", "Tage Mage"] },
  { id: "dossier", name: "Ressources Dossier", icon: "📁", subcategories: ["CV Templates", "Essay Guides", "Strategy Docs"] },
  { id: "schools", name: "Ressources Écoles", icon: "🏫", subcategories: ["HEC Paris", "ESSEC", "ESCP", "LBS", "Imperial", "LSE"] },
  { id: "oraux", name: "Ressources Oraux", icon: "🎤", subcategories: ["Banque Questions", "Guides Comportement"] },
  { id: "internal", name: "Documents Internes", icon: "🔒", subcategories: [], isPrivate: true },
];

export default function LibraryPage() {
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showPrivate, setShowPrivate] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [expandedFolders, setExpandedFolders] = useState<string[]>(["test-prep", "dossier"]);
  const [selectedDocument, setSelectedDocument] = useState<LibraryDocument | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  
  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    name: "",
    description: "",
    category: "Général",
    isPrivate: false,
    geographies: [] as string[],
    tags: [] as string[],
    packIds: [] as string[],
    newTag: "",
  });

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (selectedCategory !== "all") params.set("category", selectedCategory);
      if (showPrivate !== "all") params.set("isPrivate", showPrivate);

      const response = await fetch(`/api/library?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
        setCategories(data.categories || []);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory, showPrivate]);

  const fetchPacks = useCallback(async () => {
    try {
      const response = await fetch("/api/packs");
      if (response.ok) {
        const data = await response.json();
        setPacks(data.packs || []);
      }
    } catch (error) {
      console.error("Error fetching packs:", error);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
    fetchPacks();
  }, [fetchDocuments, fetchPacks]);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) =>
      prev.includes(folderId)
        ? prev.filter((id) => id !== folderId)
        : [...prev, folderId]
    );
  };

  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith("image/")) return ImageIcon;
    if (contentType.startsWith("video/")) return Film;
    if (contentType.startsWith("audio/")) return Music;
    if (contentType.includes("pdf")) return FileText;
    if (contentType.includes("zip") || contentType.includes("rar")) return Archive;
    return File;
  };

  const getDocumentsByCategory = (category: string) => {
    return documents.filter((doc) => {
      const matchesCategory = doc.category.toLowerCase().includes(category.toLowerCase()) ||
        doc.tags.some((tag) => tag.toLowerCase().includes(category.toLowerCase()));
      return matchesCategory;
    });
  };

  const handleDeleteDocument = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce document ?")) return;
    
    try {
      const response = await fetch(`/api/library/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setDocuments((prev) => prev.filter((doc) => doc.id !== id));
        if (selectedDocument?.id === id) {
          setSelectedDocument(null);
          setShowDetailDialog(false);
        }
      }
    } catch (error) {
      console.error("Error deleting document:", error);
    }
  };

  const handleUploadSubmit = async () => {
    // In a real implementation, this would handle file upload to Vercel Blob
    // For now, we'll just create a placeholder document
    try {
      const response = await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: uploadForm.name,
          description: uploadForm.description,
          fileUrl: "https://example.com/placeholder.pdf", // Would come from blob upload
          fileSize: 1024000,
          contentType: "application/pdf",
          numPages: 1,
          category: uploadForm.category,
          isPrivate: uploadForm.isPrivate,
          geographies: uploadForm.geographies,
          tags: uploadForm.tags,
          packIds: uploadForm.packIds,
        }),
      });

      if (response.ok) {
        setShowUploadDialog(false);
        setUploadForm({
          name: "",
          description: "",
          category: "Général",
          isPrivate: false,
          geographies: [],
          tags: [],
          packIds: [],
          newTag: "",
        });
        fetchDocuments();
      }
    } catch (error) {
      console.error("Error uploading document:", error);
    }
  };

  const addTag = () => {
    if (uploadForm.newTag && !uploadForm.tags.includes(uploadForm.newTag)) {
      setUploadForm((prev) => ({
        ...prev,
        tags: [...prev.tags, prev.newTag],
        newTag: "",
      }));
    }
  };

  const removeTag = (tag: string) => {
    setUploadForm((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  };

  const togglePackSelection = (packId: string) => {
    setUploadForm((prev) => ({
      ...prev,
      packIds: prev.packIds.includes(packId)
        ? prev.packIds.filter((id) => id !== packId)
        : [...prev.packIds, packId],
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Bibliothèque de Documents
          </h1>
          <p className="text-muted-foreground mt-1">
            Gérez les ressources partagées avec les étudiants
          </p>
        </div>
        <Button onClick={() => setShowUploadDialog(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Upload document
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-performup-blue/10 rounded-lg">
                  <FileText className="h-5 w-5 text-performup-blue" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalDocuments}</p>
                  <p className="text-xs text-muted-foreground">Documents totaux</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Globe className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.publicDocuments}</p>
                  <p className="text-xs text-muted-foreground">Documents publics</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <Lock className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.privateDocuments}</p>
                  <p className="text-xs text-muted-foreground">Documents privés</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Folder className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.categoriesCount}</p>
                  <p className="text-xs text-muted-foreground">Catégories</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un document..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les catégories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={showPrivate} onValueChange={setShowPrivate}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Accès" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="false">Publics</SelectItem>
                  <SelectItem value="true">Privés</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("grid")}
                  className="rounded-r-none"
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("list")}
                  className="rounded-l-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Folder Tree */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Arborescence</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div className="space-y-1">
              {FOLDER_CATEGORIES.map((folder) => (
                <div key={folder.id}>
                  <button
                    onClick={() => toggleFolder(folder.id)}
                    className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-muted/50 transition-colors text-left"
                  >
                    {expandedFolders.includes(folder.id) ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span>{folder.icon}</span>
                    <span className="text-sm font-medium flex-1">{folder.name}</span>
                    {folder.isPrivate && (
                      <Lock className="h-3 w-3 text-orange-500" />
                    )}
                    <Badge variant="secondary" className="text-xs">
                      {getDocumentsByCategory(folder.name).length}
                    </Badge>
                  </button>
                  <AnimatePresence>
                    {expandedFolders.includes(folder.id) && folder.subcategories.length > 0 && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="ml-6 space-y-1 overflow-hidden"
                      >
                        {folder.subcategories.map((sub) => (
                          <button
                            key={sub}
                            onClick={() => setSelectedCategory(sub)}
                            className={`flex items-center gap-2 w-full p-2 rounded-md hover:bg-muted/50 transition-colors text-left text-sm ${
                              selectedCategory === sub ? "bg-performup-blue/10 text-performup-blue" : ""
                            }`}
                          >
                            <Folder className="h-4 w-4 text-muted-foreground" />
                            <span className="flex-1">{sub}</span>
                            <Badge variant="outline" className="text-xs">
                              {getDocumentsByCategory(sub).length}
                            </Badge>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Document List */}
        <div className="lg:col-span-3">
          {loading ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="animate-spin h-8 w-8 border-2 border-performup-blue border-t-transparent rounded-full mx-auto" />
                <p className="text-muted-foreground mt-4">Chargement...</p>
              </CardContent>
            </Card>
          ) : documents.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium text-lg">Aucun document</h3>
                <p className="text-muted-foreground mt-1">
                  Commencez par uploader des documents dans la bibliothèque
                </p>
                <Button onClick={() => setShowUploadDialog(true)} className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un document
                </Button>
              </CardContent>
            </Card>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              <AnimatePresence>
                {documents.map((doc, index) => {
                  const FileIcon = getFileIcon(doc.contentType);
                  return (
                    <motion.div
                      key={doc.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card
                        className="cursor-pointer hover:shadow-md transition-shadow group"
                        onClick={() => {
                          setSelectedDocument(doc);
                          setShowDetailDialog(true);
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="p-3 bg-muted rounded-lg">
                              <FileIcon className="h-6 w-6 text-performup-blue" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-sm truncate flex-1">
                                  {doc.name}
                                </h4>
                                {doc.isPrivate ? (
                                  <Lock className="h-3 w-3 text-orange-500" />
                                ) : (
                                  <Globe className="h-3 w-3 text-green-500" />
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {doc.description || "Aucune description"}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-xs">
                                  {doc.category}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatFileSize(doc.fileSize)}
                                </span>
                              </div>
                              {doc.packs.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {doc.packs.slice(0, 2).map((p) => (
                                    <Badge key={p.pack.id} variant="secondary" className="text-xs">
                                      {p.pack.displayName}
                                    </Badge>
                                  ))}
                                  {doc.packs.length > 2 && (
                                    <Badge variant="secondary" className="text-xs">
                                      +{doc.packs.length - 2}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Voir
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Download className="h-4 w-4 mr-2" />
                                  Télécharger
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Modifier
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteDocument(doc.id);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {documents.map((doc) => {
                    const FileIcon = getFileIcon(doc.contentType);
                    return (
                      <div
                        key={doc.id}
                        className="flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors group"
                        onClick={() => {
                          setSelectedDocument(doc);
                          setShowDetailDialog(true);
                        }}
                      >
                        <div className="p-2 bg-muted rounded-lg">
                          <FileIcon className="h-5 w-5 text-performup-blue" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm truncate">{doc.name}</h4>
                            {doc.isPrivate ? (
                              <Lock className="h-3 w-3 text-orange-500" />
                            ) : (
                              <Globe className="h-3 w-3 text-green-500" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {doc.category} - {formatFileSize(doc.fileSize)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {doc.packs.slice(0, 2).map((p) => (
                            <Badge key={p.pack.id} variant="secondary" className="text-xs">
                              {p.pack.displayName}
                            </Badge>
                          ))}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(new Date(doc.createdAt))}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              Voir
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="h-4 w-4 mr-2" />
                              Télécharger
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteDocument(doc.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ajouter un document à la bibliothèque</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* File Drop Zone */}
            <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-performup-blue transition-colors cursor-pointer">
              <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium">Glissez-déposez un fichier ici</p>
              <p className="text-xs text-muted-foreground mt-1">ou cliquez pour sélectionner</p>
              <p className="text-xs text-muted-foreground mt-2">PDF, DOC, DOCX, PPT, XLS, Images - Max 50MB</p>
            </div>

            {/* Document Name */}
            <div>
              <label className="text-sm font-medium">Nom du document</label>
              <Input
                value={uploadForm.name}
                onChange={(e) => setUploadForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Guide de préparation GRE"
                className="mt-1"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={uploadForm.description}
                onChange={(e) => setUploadForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Décrivez le contenu du document..."
                className="mt-1"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Category */}
              <div>
                <label className="text-sm font-medium">Catégorie</label>
                <Select
                  value={uploadForm.category}
                  onValueChange={(value) => setUploadForm((prev) => ({ ...prev, category: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Général">Général</SelectItem>
                    <SelectItem value="GRE">GRE</SelectItem>
                    <SelectItem value="GMAT">GMAT</SelectItem>
                    <SelectItem value="Tage Mage">Tage Mage</SelectItem>
                    <SelectItem value="CV Templates">CV Templates</SelectItem>
                    <SelectItem value="Essay Guides">Essay Guides</SelectItem>
                    <SelectItem value="Strategy Docs">Strategy Docs</SelectItem>
                    <SelectItem value="Banque Questions">Banque Questions</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Privacy */}
              <div>
                <label className="text-sm font-medium">Accès</label>
                <div className="flex items-center gap-4 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={!uploadForm.isPrivate}
                      onCheckedChange={() => setUploadForm((prev) => ({ ...prev, isPrivate: false }))}
                    />
                    <Globe className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Public</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={uploadForm.isPrivate}
                      onCheckedChange={() => setUploadForm((prev) => ({ ...prev, isPrivate: true }))}
                    />
                    <Lock className="h-4 w-4 text-orange-500" />
                    <span className="text-sm">Privé (admin)</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Pack Association */}
            <div>
              <label className="text-sm font-medium">Partager avec les packs</label>
              <p className="text-xs text-muted-foreground mb-2">
                Les étudiants avec ces packs auront accès au document
              </p>
              <div className="flex flex-wrap gap-2">
                {packs.map((pack) => (
                  <Badge
                    key={pack.id}
                    variant={uploadForm.packIds.includes(pack.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => togglePackSelection(pack.id)}
                  >
                    {pack.displayName}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="text-sm font-medium">Tags</label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={uploadForm.newTag}
                  onChange={(e) => setUploadForm((prev) => ({ ...prev, newTag: e.target.value }))}
                  placeholder="Ajouter un tag..."
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                />
                <Button type="button" variant="outline" onClick={addTag}>
                  <Tag className="h-4 w-4" />
                </Button>
              </div>
              {uploadForm.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {uploadForm.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => removeTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleUploadSubmit} disabled={!uploadForm.name}>
              <Upload className="h-4 w-4 mr-2" />
              Ajouter à la bibliothèque
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          {selectedDocument && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedDocument.isPrivate ? (
                    <Lock className="h-4 w-4 text-orange-500" />
                  ) : (
                    <Globe className="h-4 w-4 text-green-500" />
                  )}
                  {selectedDocument.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Type</p>
                    <p className="text-sm">{selectedDocument.contentType}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Taille</p>
                    <p className="text-sm">{formatFileSize(selectedDocument.fileSize)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Catégorie</p>
                    <Badge variant="outline">{selectedDocument.category}</Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pages</p>
                    <p className="text-sm">{selectedDocument.numPages}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Créé par</p>
                    <p className="text-sm">{selectedDocument.creator.name || selectedDocument.creator.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Date</p>
                    <p className="text-sm">{formatDate(new Date(selectedDocument.createdAt))}</p>
                  </div>
                </div>

                {selectedDocument.description && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Description</p>
                    <p className="text-sm">{selectedDocument.description}</p>
                  </div>
                )}

                {selectedDocument.packs.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Packs avec accès</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedDocument.packs.map((p) => (
                        <Badge key={p.pack.id} variant="secondary">
                          {p.pack.displayName}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedDocument.tags.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedDocument.tags.map((tag) => (
                        <Badge key={tag} variant="outline">
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedDocument.geographies.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Géographies</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedDocument.geographies.map((geo) => (
                        <Badge key={geo} variant="outline">
                          {geo}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
                  Fermer
                </Button>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger
                </Button>
                <Button>
                  <Eye className="h-4 w-4 mr-2" />
                  Ouvrir
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

