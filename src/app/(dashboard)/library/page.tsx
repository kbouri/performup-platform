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
  Loader2,
  CheckCircle,
  ClipboardList,
  Play,
  Users,
  Calendar,
  Clock,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

interface TaskTemplate {
  id: string;
  groupId: string | null;
  title: string;
  description: string | null;
  category: string;
  timing: string;
  durationMinutes: number;
  daysFromStart: number;
  priority: string;
  order: number;
  isCollaborative: boolean;
  assignToRole: string | null;
  notifyRoles: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TaskTemplateGroup {
  id: string;
  name: string;
  description: string | null;
  category: string;
  targetRole: string | null;
  color: string | null;
  icon: string | null;
  order: number;
  active: boolean;
  templates: TaskTemplate[];
  _count: { templates: number };
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

  // Task Templates state
  const [activeTab, setActiveTab] = useState<"documents" | "templates">("documents");
  const [templateGroups, setTemplateGroups] = useState<TaskTemplateGroup[]>([]);
  const [standaloneTemplates, setStandaloneTemplates] = useState<TaskTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | TaskTemplateGroup | null>(null);
  const [students, setStudents] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [assigning, setAssigning] = useState(false);

  // New template form
  const [templateForm, setTemplateForm] = useState({
    title: "",
    description: "",
    category: "GENERAL",
    daysFromStart: 0,
    priority: "medium",
    groupId: "none", // Use "none" instead of empty string
  });

  // New group form
  const [groupForm, setGroupForm] = useState({
    name: "",
    description: "",
    category: "GENERAL",
    targetRole: "all", // Use "all" instead of empty string
    color: "#3B82F6",
    icon: "clipboard-list",
  });
  
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

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

  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const response = await fetch("/api/task-templates");
      if (response.ok) {
        const data = await response.json();
        setTemplateGroups(data.groups || []);
        setStandaloneTemplates(data.standaloneTemplates || []);
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  const fetchStudents = useCallback(async () => {
    try {
      const response = await fetch("/api/students?limit=100");
      if (response.ok) {
        const data = await response.json();
        setStudents(
          (data.students || [])
            .filter((s: { id: string; user?: { name: string | null; email: string } }) => s.user)
            .map((s: { id: string; user: { name: string | null; email: string } }) => ({
              id: s.id,
              name: s.user.name || s.user.email,
              email: s.user.email,
            }))
        );
      }
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
    fetchPacks();
  }, [fetchDocuments, fetchPacks]);

  useEffect(() => {
    if (activeTab === "templates") {
      fetchTemplates();
      fetchStudents();
    }
  }, [activeTab, fetchTemplates, fetchStudents]);

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

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    // Auto-fill name if empty
    if (!uploadForm.name) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      setUploadForm((prev) => ({ ...prev, name: nameWithoutExt }));
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) {
      alert("Veuillez sélectionner un fichier");
      return;
    }

    if (!uploadForm.name) {
      alert("Veuillez entrer un nom pour le document");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Step 1: Upload file to Vercel Blob
      setUploadProgress(20);
      const formData = new FormData();
      formData.append("file", selectedFile);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const error = await uploadRes.json();
        throw new Error(error.error || "Erreur lors de l'upload du fichier");
      }

      const { url } = await uploadRes.json();
      setUploadProgress(60);

      // Step 2: Create document in database
      const response = await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: uploadForm.name,
          description: uploadForm.description,
          fileUrl: url,
          fileSize: selectedFile.size,
          contentType: selectedFile.type,
          numPages: 1,
          category: uploadForm.category,
          isPrivate: uploadForm.isPrivate,
          geographies: uploadForm.geographies,
          tags: uploadForm.tags,
          packIds: uploadForm.packIds,
        }),
      });

      setUploadProgress(100);

      if (response.ok) {
        setShowUploadDialog(false);
        setSelectedFile(null);
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
      } else {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de la création du document");
      }
    } catch (error) {
      console.error("Error uploading document:", error);
      alert(error instanceof Error ? error.message : "Erreur lors de l'upload");
    } finally {
      setUploading(false);
      setUploadProgress(0);
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

  // Task template handlers
  const handleCreateGroup = async () => {
    if (!groupForm.name) {
      alert("Le nom du groupe est requis");
      return;
    }

    try {
      const payload = {
        ...groupForm,
        targetRole: groupForm.targetRole === "all" ? null : groupForm.targetRole,
      };

      const response = await fetch("/api/task-templates/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setShowGroupDialog(false);
        setGroupForm({
          name: "",
          description: "",
          category: "GENERAL",
          targetRole: "all",
          color: "#3B82F6",
          icon: "clipboard-list",
        });
        fetchTemplates();
      } else {
        alert(data.error || "Erreur lors de la création du groupe");
      }
    } catch (error) {
      console.error("Error creating group:", error);
      alert("Erreur de connexion au serveur");
    }
  };

  const handleCreateTemplate = async () => {
    if (!templateForm.title) {
      alert("Le titre est requis");
      return;
    }

    try {
      const payload = {
        ...templateForm,
        groupId: templateForm.groupId === "none" ? null : templateForm.groupId,
      };

      const response = await fetch("/api/task-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setShowTemplateDialog(false);
        setTemplateForm({
          title: "",
          description: "",
          category: "GENERAL",
          daysFromStart: 0,
          priority: "medium",
          groupId: "none",
        });
        fetchTemplates();
      } else {
        alert(data.error || "Erreur lors de la création du template");
      }
    } catch (error) {
      console.error("Error creating template:", error);
      alert("Erreur de connexion au serveur");
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce template ?")) return;

    try {
      const response = await fetch(`/api/task-templates/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchTemplates();
      }
    } catch (error) {
      console.error("Error deleting template:", error);
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce groupe ?")) return;

    try {
      const response = await fetch(`/api/task-templates/groups/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchTemplates();
      }
    } catch (error) {
      console.error("Error deleting group:", error);
    }
  };

  const handleAssignTemplate = async () => {
    if (!selectedStudentId || !selectedTemplate) {
      alert("Veuillez sélectionner un étudiant");
      return;
    }

    setAssigning(true);
    try {
      const response = await fetch(`/api/task-templates/${selectedTemplate.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudentId,
          startDate: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`${data.count} tâche(s) créée(s) avec succès !`);
        setShowAssignDialog(false);
        setSelectedStudentId("");
        setSelectedTemplate(null);
      } else {
        const error = await response.json();
        alert(error.error || "Erreur lors de l'assignation");
      }
    } catch (error) {
      console.error("Error assigning template:", error);
    } finally {
      setAssigning(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-100 text-red-700";
      case "high": return "bg-orange-100 text-orange-700";
      case "medium": return "bg-yellow-100 text-yellow-700";
      case "low": return "bg-green-100 text-green-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "ONBOARDING": return "🚀";
      case "GMAT": return "📊";
      case "ESSAY": return "✍️";
      case "ORAL": return "🎤";
      case "CV": return "📄";
      default: return "📋";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Bibliothèque
          </h1>
          <p className="text-muted-foreground mt-1">
            Documents partagés et templates de tâches
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === "documents" && (
            <Button onClick={() => setShowUploadDialog(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload document
            </Button>
          )}
          {activeTab === "templates" && (
            <>
              <Button variant="outline" onClick={() => setShowGroupDialog(true)}>
                <Folder className="h-4 w-4 mr-2" />
                Nouveau groupe
              </Button>
              <Button onClick={() => setShowTemplateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nouveau template
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "documents" | "templates")}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Templates de tâches
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="mt-6">

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
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          {/* Templates Content */}
          {loadingTemplates ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-performup-blue" />
                <p className="text-muted-foreground mt-4">Chargement des templates...</p>
              </CardContent>
            </Card>
          ) : templateGroups.length === 0 && standaloneTemplates.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium text-lg">Aucun template</h3>
                <p className="text-muted-foreground mt-1">
                  Créez des templates de tâches pour automatiser les workflows
                </p>
                <div className="flex gap-2 justify-center mt-4">
                  <Button variant="outline" onClick={() => setShowGroupDialog(true)}>
                    <Folder className="h-4 w-4 mr-2" />
                    Créer un groupe
                  </Button>
                  <Button onClick={() => setShowTemplateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Créer un template
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Template Groups */}
              {templateGroups.map((group) => (
                <Card key={group.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getCategoryIcon(group.category)}</span>
                        <div>
                          <CardTitle className="text-lg">{group.name}</CardTitle>
                          {group.description && (
                            <p className="text-sm text-muted-foreground">{group.description}</p>
                          )}
                        </div>
                        <Badge variant="outline">{group._count.templates} tâches</Badge>
                        {group.targetRole && (
                          <Badge variant="secondary">
                            <Users className="h-3 w-3 mr-1" />
                            {group.targetRole}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => {
                            setSelectedTemplate(group);
                            setShowAssignDialog(true);
                          }}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Assigner
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setTemplateForm({ ...templateForm, groupId: group.id });
                              setShowTemplateDialog(true);
                            }}>
                              <Plus className="h-4 w-4 mr-2" />
                              Ajouter un template
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteGroup(group.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer le groupe
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {group.templates.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Aucun template dans ce groupe
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {group.templates.map((template, index) => (
                          <div
                            key={template.id}
                            className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{template.title}</p>
                              {template.description && (
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {template.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={getPriorityColor(template.priority)}>
                                {template.priority}
                              </Badge>
                              {template.daysFromStart > 0 && (
                                <Badge variant="outline">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  J+{template.daysFromStart}
                                </Badge>
                              )}
                              {template.durationMinutes > 0 && (
                                <Badge variant="outline">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {template.durationMinutes}min
                                </Badge>
                              )}
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon-sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                  setSelectedTemplate(template);
                                  setShowAssignDialog(true);
                                }}>
                                  <Play className="h-4 w-4 mr-2" />
                                  Assigner
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDeleteTemplate(template.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {/* Standalone Templates */}
              {standaloneTemplates.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ClipboardList className="h-5 w-5" />
                      Templates individuels
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {standaloneTemplates.map((template) => (
                        <div
                          key={template.id}
                          className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <span className="text-xl">{getCategoryIcon(template.category)}</span>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{template.title}</p>
                            {template.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {template.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getPriorityColor(template.priority)}>
                              {template.priority}
                            </Badge>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedTemplate(template);
                              setShowAssignDialog(true);
                            }}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Assigner
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDeleteTemplate(template.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ajouter un document à la bibliothèque</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* File Drop Zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer relative ${
                dragActive
                  ? "border-performup-blue bg-performup-blue/5"
                  : selectedFile
                  ? "border-green-500 bg-green-50"
                  : "hover:border-performup-blue"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => document.getElementById("file-upload-input")?.click()}
            >
              <input
                id="file-upload-input"
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />
              {selectedFile ? (
                <>
                  <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-3" />
                  <p className="text-sm font-medium text-green-700">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Supprimer
                  </Button>
                </>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-medium">Glissez-deposez un fichier ici</p>
                  <p className="text-xs text-muted-foreground mt-1">ou cliquez pour selectionner</p>
                  <p className="text-xs text-muted-foreground mt-2">PDF, DOC, DOCX, PPT, XLS, Images - Max 50MB</p>
                </>
              )}
            </div>

            {/* Upload Progress */}
            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Upload en cours...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-performup-blue h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

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
            <Button variant="outline" onClick={() => setShowUploadDialog(false)} disabled={uploading}>
              Annuler
            </Button>
            <Button onClick={handleUploadSubmit} disabled={!uploadForm.name || !selectedFile || uploading}>
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Upload en cours...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Ajouter à la bibliothèque
                </>
              )}
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

      {/* Create Group Dialog */}
      <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un groupe de templates</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Nom du groupe</label>
              <Input
                value={groupForm.name}
                onChange={(e) => setGroupForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Onboarding Étudiant"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={groupForm.description}
                onChange={(e) => setGroupForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Description du groupe..."
                className="mt-1"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Catégorie</label>
                <Select
                  value={groupForm.category}
                  onValueChange={(v) => setGroupForm((prev) => ({ ...prev, category: v }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GENERAL">Général</SelectItem>
                    <SelectItem value="ONBOARDING">Onboarding</SelectItem>
                    <SelectItem value="GMAT">GMAT</SelectItem>
                    <SelectItem value="ESSAY">Essay</SelectItem>
                    <SelectItem value="ORAL">Oral</SelectItem>
                    <SelectItem value="CV">CV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Rôle cible</label>
                <Select
                  value={groupForm.targetRole}
                  onValueChange={(v) => setGroupForm((prev) => ({ ...prev, targetRole: v }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="STUDENT">Étudiant</SelectItem>
                    <SelectItem value="MENTOR">Mentor</SelectItem>
                    <SelectItem value="PROFESSOR">Professeur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGroupDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateGroup} disabled={!groupForm.name}>
              Créer le groupe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un template de tâche</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Titre de la tâche</label>
              <Input
                value={templateForm.title}
                onChange={(e) => setTemplateForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Préparer les documents d'inscription"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={templateForm.description}
                onChange={(e) => setTemplateForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Description de la tâche..."
                className="mt-1"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Groupe</label>
                <Select
                  value={templateForm.groupId}
                  onValueChange={(v) => setTemplateForm((prev) => ({ ...prev, groupId: v }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Sans groupe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sans groupe</SelectItem>
                    {templateGroups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Priorité</label>
                <Select
                  value={templateForm.priority}
                  onValueChange={(v) => setTemplateForm((prev) => ({ ...prev, priority: v }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Basse</SelectItem>
                    <SelectItem value="medium">Moyenne</SelectItem>
                    <SelectItem value="high">Haute</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Jours après assignation (deadline)</label>
              <Input
                type="number"
                value={templateForm.daysFromStart}
                onChange={(e) => setTemplateForm((prev) => ({ ...prev, daysFromStart: parseInt(e.target.value) || 0 }))}
                min={0}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                0 = deadline aujourd&apos;hui, 7 = dans une semaine
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateTemplate} disabled={!templateForm.title}>
              Créer le template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Template Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assigner à un étudiant</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedTemplate && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">
                  {"name" in selectedTemplate ? selectedTemplate.name : selectedTemplate.title}
                </p>
                {"templates" in selectedTemplate && (
                  <p className="text-sm text-muted-foreground">
                    {selectedTemplate.templates.length} tâche(s) seront créées
                  </p>
                )}
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Sélectionner un étudiant</label>
              <Select
                value={selectedStudentId}
                onValueChange={setSelectedStudentId}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choisir un étudiant..." />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name} ({student.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleAssignTemplate} disabled={!selectedStudentId || assigning}>
              {assigning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Assignation...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Assigner
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

