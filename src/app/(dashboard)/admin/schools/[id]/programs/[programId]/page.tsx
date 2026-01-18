"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  GraduationCap,
  MapPin,
  ExternalLink,
  Plus,
  Loader2,
  Edit,
  Trash2,
  FileText,
  Calendar,
  Users,
  BarChart3,
  Clock,
  Building2,
  CheckCircle2,
  Info,
  Upload,
  Download,
  Eye,
  AlertCircle,
} from "lucide-react";

interface School {
  id: string;
  name: string;
  country: string;
  city: string | null;
  logoUrl: string | null;
}

interface Deadline {
  id: string;
  round: string;
  deadline: string;
  decisionDate: string | null;
  notes: string | null;
}

interface EssayQuestion {
  id: string;
  question: string;
  wordLimit: number | null;
  round: string;
  year: number;
  questionTips: string | null;
  isOptional: boolean;
  optionalGroup: string | null;
  order: number;
  active: boolean;
}

interface ProgramDocument {
  id: string;
  name: string;
  type: string;
  fileUrl: string;
  description: string | null;
  category: string | null;
  year: number | null;
  isPublic: boolean;
  createdAt: string;
}

interface StudentSchool {
  student: {
    id: string;
    user: {
      name: string | null;
      email: string;
    };
  };
}

interface Program {
  id: string;
  name: string;
  type: string;
  duration: string | null;
  degree: string | null;
  description: string | null;
  website: string | null;
  active: boolean;
  // Requirements
  requiresGMAT: boolean;
  requiresGRE: boolean;
  requiresTOEFL: boolean;
  requiresIELTS: boolean;
  requiresTAGEMAGE: boolean;
  minGMATScore: number | null;
  minGREScore: number | null;
  minTOEFLScore: number | null;
  minIELTSScore: number | null;
  otherRequirements: string | null;
  // Statistics
  acceptanceRate: number | null;
  avgGMATScore: number | null;
  avgGREScore: number | null;
  classSize: number | null;
  internationalPct: number | null;
  avgWorkExperience: number | null;
  avgAge: number | null;
  tuitionFees: number | null;
  tuitionCurrency: string | null;
  // Notes
  internalNotes: string | null;
  // Relations
  school: School;
  deadlines: Deadline[];
  essayQuestions: EssayQuestion[];
  documents: ProgramDocument[];
  studentSchools: StudentSchool[];
  _count: {
    applications: number;
    essays: number;
    studentSchools: number;
  };
}

const programTypeColors: Record<string, string> = {
  MiM: "bg-performup-blue/10 text-performup-blue border-performup-blue/20",
  MIF: "bg-performup-gold/10 text-performup-gold border-performup-gold/20",
  MSc: "bg-success/10 text-success border-success/20",
  MBA: "bg-warning/10 text-warning border-warning/20",
  LLM: "bg-error/10 text-error border-error/20",
};

const countryFlags: Record<string, string> = {
  France: "🇫🇷",
  UK: "🇬🇧",
  Italie: "🇮🇹",
  Espagne: "🇪🇸",
  Suisse: "🇨🇭",
};

export default function ProgramDetailPage() {
  const params = useParams();
  const router = useRouter();
  const schoolId = params.id as string;
  const programId = params.programId as string;

  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [submitting, setSubmitting] = useState(false);

  // Dialog states
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddDeadlineDialog, setShowAddDeadlineDialog] = useState(false);
  const [showAddEssayDialog, setShowAddEssayDialog] = useState(false);
  const [showAddDocumentDialog, setShowAddDocumentDialog] = useState(false);
  const [deleteDeadlineId, setDeleteDeadlineId] = useState<string | null>(null);
  const [deleteEssayId, setDeleteEssayId] = useState<string | null>(null);
  const [deleteDocumentId, setDeleteDocumentId] = useState<string | null>(null);
  const [editEssay, setEditEssay] = useState<EssayQuestion | null>(null);

  // Form states
  const [newDeadline, setNewDeadline] = useState({
    round: "R1",
    deadline: "",
    decisionDate: "",
    notes: "",
  });

  const [newEssay, setNewEssay] = useState({
    question: "",
    wordLimit: "",
    round: "R1",
    year: new Date().getFullYear(),
    questionTips: "",
    isOptional: false,
    optionalGroup: "",
  });

  const [newDocument, setNewDocument] = useState({
    name: "",
    type: "guide",
    fileUrl: "",
    description: "",
    category: "",
    year: "",
    isPublic: false,
  });

  const [editData, setEditData] = useState<Partial<Program>>({});

  // Fetch program
  const fetchProgram = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/admin/schools/${schoolId}/programs/${programId}`
      );
      if (response.ok) {
        const data = await response.json();
        setProgram(data.program);
        setEditData(data.program);
      } else if (response.status === 404) {
        router.push(`/admin/schools/${schoolId}`);
      }
    } catch (error) {
      console.error("Error fetching program:", error);
    } finally {
      setLoading(false);
    }
  }, [schoolId, programId, router]);

  useEffect(() => {
    if (schoolId && programId) {
      fetchProgram();
    }
  }, [schoolId, programId, fetchProgram]);

  // Update program
  const handleUpdateProgram = async () => {
    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/admin/schools/${schoolId}/programs/${programId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editData),
        }
      );
      if (response.ok) {
        await fetchProgram();
        setShowEditDialog(false);
      }
    } catch (error) {
      console.error("Error updating program:", error);
    } finally {
      setSubmitting(false);
    }
  };

  // Add deadline
  const handleAddDeadline = async () => {
    if (!newDeadline.deadline) return;
    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/admin/schools/${schoolId}/programs/${programId}/deadlines`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newDeadline),
        }
      );
      if (response.ok) {
        await fetchProgram();
        setNewDeadline({ round: "R1", deadline: "", decisionDate: "", notes: "" });
        setShowAddDeadlineDialog(false);
      }
    } catch (error) {
      console.error("Error adding deadline:", error);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete deadline
  const handleDeleteDeadline = async () => {
    if (!deleteDeadlineId) return;
    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/admin/schools/${schoolId}/programs/${programId}/deadlines?deadlineId=${deleteDeadlineId}`,
        { method: "DELETE" }
      );
      if (response.ok) {
        await fetchProgram();
        setDeleteDeadlineId(null);
      }
    } catch (error) {
      console.error("Error deleting deadline:", error);
    } finally {
      setSubmitting(false);
    }
  };

  // Add essay question
  const handleAddEssay = async () => {
    if (!newEssay.question) return;
    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/admin/schools/${schoolId}/programs/${programId}/essay-questions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...newEssay,
            wordLimit: newEssay.wordLimit ? parseInt(newEssay.wordLimit) : null,
          }),
        }
      );
      if (response.ok) {
        await fetchProgram();
        setNewEssay({
          question: "",
          wordLimit: "",
          round: "R1",
          year: new Date().getFullYear(),
          questionTips: "",
          isOptional: false,
          optionalGroup: "",
        });
        setShowAddEssayDialog(false);
      }
    } catch (error) {
      console.error("Error adding essay:", error);
    } finally {
      setSubmitting(false);
    }
  };

  // Update essay question
  const handleUpdateEssay = async () => {
    if (!editEssay) return;
    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/admin/schools/${schoolId}/programs/${programId}/essay-questions`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionId: editEssay.id,
            question: editEssay.question,
            wordLimit: editEssay.wordLimit,
            round: editEssay.round,
            year: editEssay.year,
            questionTips: editEssay.questionTips,
            isOptional: editEssay.isOptional,
            optionalGroup: editEssay.optionalGroup,
            active: editEssay.active,
          }),
        }
      );
      if (response.ok) {
        await fetchProgram();
        setEditEssay(null);
      }
    } catch (error) {
      console.error("Error updating essay:", error);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete essay
  const handleDeleteEssay = async () => {
    if (!deleteEssayId) return;
    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/admin/schools/${schoolId}/programs/${programId}/essay-questions?questionId=${deleteEssayId}`,
        { method: "DELETE" }
      );
      if (response.ok) {
        await fetchProgram();
        setDeleteEssayId(null);
      }
    } catch (error) {
      console.error("Error deleting essay:", error);
    } finally {
      setSubmitting(false);
    }
  };

  // Add document
  const handleAddDocument = async () => {
    if (!newDocument.name || !newDocument.fileUrl) return;
    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/admin/schools/${schoolId}/programs/${programId}/documents`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...newDocument,
            year: newDocument.year ? parseInt(newDocument.year) : null,
          }),
        }
      );
      if (response.ok) {
        await fetchProgram();
        setNewDocument({
          name: "",
          type: "guide",
          fileUrl: "",
          description: "",
          category: "",
          year: "",
          isPublic: false,
        });
        setShowAddDocumentDialog(false);
      }
    } catch (error) {
      console.error("Error adding document:", error);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete document
  const handleDeleteDocument = async () => {
    if (!deleteDocumentId) return;
    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/admin/schools/${schoolId}/programs/${programId}/documents?documentId=${deleteDocumentId}`,
        { method: "DELETE" }
      );
      if (response.ok) {
        await fetchProgram();
        setDeleteDocumentId(null);
      }
    } catch (error) {
      console.error("Error deleting document:", error);
    } finally {
      setSubmitting(false);
    }
  };

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setNewDocument((prev) => ({
          ...prev,
          fileUrl: data.url,
          name: prev.name || file.name.replace(/\.[^/.]+$/, ""),
        }));
      }
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-performup-blue" />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Programme non trouvé</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push(`/admin/schools/${schoolId}`)}
        >
          Retour à l&apos;école
        </Button>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={program.name}
        description={
          <span className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            {program.school.name}
            <span className="mx-1">•</span>
            <span className="text-lg">{countryFlags[program.school.country] || "🌍"}</span>
            {program.school.city && (
              <>
                <MapPin className="h-3 w-3" />
                {program.school.city}
              </>
            )}
            {program.website && (
              <>
                <span className="mx-1">•</span>
                <a
                  href={program.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-performup-blue hover:underline flex items-center gap-1"
                >
                  Site web <ExternalLink className="h-3 w-3" />
                </a>
              </>
            )}
          </span>
        }
        backLink={`/admin/schools/${schoolId}`}
        actions={
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={programTypeColors[program.type] || ""}
            >
              {program.type}
            </Badge>
            {!program.active && <Badge variant="secondary">Inactif</Badge>}
            <Button variant="outline" onClick={() => setShowEditDialog(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Modifier
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-performup-blue/10">
                <Users className="h-5 w-5 text-performup-blue" />
              </div>
              <div>
                <div className="text-xl font-display font-semibold">
                  {program._count.studentSchools}
                </div>
                <p className="text-xs text-muted-foreground">Étudiants</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-performup-gold/10">
                <Calendar className="h-5 w-5 text-performup-gold" />
              </div>
              <div>
                <div className="text-xl font-display font-semibold">
                  {program._count.applications}
                </div>
                <p className="text-xs text-muted-foreground">Candidatures</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                <FileText className="h-5 w-5 text-success" />
              </div>
              <div>
                <div className="text-xl font-display font-semibold">
                  {program.essayQuestions.length}
                </div>
                <p className="text-xs text-muted-foreground">Questions Essay</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-error/10">
                <Clock className="h-5 w-5 text-error" />
              </div>
              <div>
                <div className="text-xl font-display font-semibold">
                  {program.deadlines.length}
                </div>
                <p className="text-xs text-muted-foreground">Deadlines</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Aperçu</TabsTrigger>
          <TabsTrigger value="essays">Essays</TabsTrigger>
          <TabsTrigger value="deadlines">Deadlines</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="stats">Statistiques</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Program Info */}
            <Card>
              <CardHeader>
                <CardTitle>Informations générales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {program.description && (
                  <div>
                    <Label className="text-muted-foreground">Description</Label>
                    <p className="mt-1">{program.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Diplôme</Label>
                    <p className="mt-1 font-medium">{program.degree || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Durée</Label>
                    <p className="mt-1 font-medium">{program.duration || "-"}</p>
                  </div>
                </div>
                {program.tuitionFees && (
                  <div>
                    <Label className="text-muted-foreground">Frais de scolarité</Label>
                    <p className="mt-1 font-medium">
                      {program.tuitionFees.toLocaleString()} {program.tuitionCurrency || "€"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Requirements */}
            <Card>
              <CardHeader>
                <CardTitle>Prérequis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {program.requiresGMAT && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-success" />
                      GMAT {program.minGMATScore && `(min: ${program.minGMATScore})`}
                    </Badge>
                  )}
                  {program.requiresGRE && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-success" />
                      GRE {program.minGREScore && `(min: ${program.minGREScore})`}
                    </Badge>
                  )}
                  {program.requiresTOEFL && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-success" />
                      TOEFL {program.minTOEFLScore && `(min: ${program.minTOEFLScore})`}
                    </Badge>
                  )}
                  {program.requiresIELTS && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-success" />
                      IELTS {program.minIELTSScore && `(min: ${program.minIELTSScore})`}
                    </Badge>
                  )}
                  {program.requiresTAGEMAGE && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-success" />
                      TAGE MAGE
                    </Badge>
                  )}
                </div>
                {!program.requiresGMAT &&
                  !program.requiresGRE &&
                  !program.requiresTOEFL &&
                  !program.requiresIELTS &&
                  !program.requiresTAGEMAGE && (
                    <p className="text-muted-foreground text-sm">
                      Aucun prérequis de test renseigné
                    </p>
                  )}
                {program.otherRequirements && (
                  <div>
                    <Label className="text-muted-foreground">Autres prérequis</Label>
                    <p className="mt-1 text-sm">{program.otherRequirements}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Internal Notes */}
            {program.internalNotes && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Notes internes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{program.internalNotes}</p>
                </CardContent>
              </Card>
            )}

            {/* Students targeting this program */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Étudiants ciblant ce programme ({program.studentSchools.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {program.studentSchools.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    Aucun étudiant ne cible ce programme pour le moment
                  </p>
                ) : (
                  <div className="space-y-2">
                    {program.studentSchools.map(({ student }) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div>
                          <p className="font-medium">
                            {student.user.name || student.user.email}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {student.user.email}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Essays Tab */}
        <TabsContent value="essays">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Questions d&apos;Essay</CardTitle>
                <CardDescription>
                  Questions pour les candidatures {new Date().getFullYear()}
                </CardDescription>
              </div>
              <Button onClick={() => setShowAddEssayDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter une question
              </Button>
            </CardHeader>
            <CardContent>
              {program.essayQuestions.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Aucune question d&apos;essay enregistrée
                  </p>
                  <Button onClick={() => setShowAddEssayDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter une question
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {program.essayQuestions.map((essay, index) => (
                    <div
                      key={essay.id}
                      className="p-4 rounded-lg border hover:border-performup-blue/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">{essay.round}</Badge>
                            <Badge variant="secondary">{essay.year}</Badge>
                            {essay.isOptional && (
                              <Badge variant="outline" className="text-warning border-warning/20">
                                Optionnel
                              </Badge>
                            )}
                            {essay.wordLimit && (
                              <span className="text-xs text-muted-foreground">
                                {essay.wordLimit} mots max
                              </span>
                            )}
                            {!essay.active && (
                              <Badge variant="secondary">Inactif</Badge>
                            )}
                          </div>
                          <p className="font-medium mb-2">
                            {index + 1}. {essay.question}
                          </p>
                          {essay.questionTips && (
                            <div className="mt-2 p-3 bg-muted/50 rounded-lg">
                              <p className="text-sm text-muted-foreground">
                                <strong>Conseils :</strong> {essay.questionTips}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditEssay(essay)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-error hover:text-error"
                            onClick={() => setDeleteEssayId(essay.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deadlines Tab */}
        <TabsContent value="deadlines">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Deadlines</CardTitle>
                <CardDescription>
                  Dates limites de candidature par round
                </CardDescription>
              </div>
              <Button onClick={() => setShowAddDeadlineDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter une deadline
              </Button>
            </CardHeader>
            <CardContent>
              {program.deadlines.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Aucune deadline enregistrée
                  </p>
                  <Button onClick={() => setShowAddDeadlineDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter une deadline
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {program.deadlines.map((deadline) => {
                    const deadlineDate = new Date(deadline.deadline);
                    const isPast = deadlineDate < new Date();
                    return (
                      <div
                        key={deadline.id}
                        className={`flex items-center justify-between p-4 rounded-lg border ${
                          isPast ? "bg-muted/50 opacity-60" : ""
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                              isPast ? "bg-muted" : "bg-error/10"
                            }`}
                          >
                            <Calendar
                              className={`h-5 w-5 ${isPast ? "text-muted-foreground" : "text-error"}`}
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{deadline.round}</Badge>
                              {isPast && (
                                <Badge variant="secondary">Passé</Badge>
                              )}
                            </div>
                            <p className="font-medium mt-1">
                              {deadlineDate.toLocaleDateString("fr-FR", {
                                weekday: "long",
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })}
                            </p>
                            {deadline.decisionDate && (
                              <p className="text-sm text-muted-foreground">
                                Décision :{" "}
                                {new Date(deadline.decisionDate).toLocaleDateString(
                                  "fr-FR",
                                  { day: "numeric", month: "long", year: "numeric" }
                                )}
                              </p>
                            )}
                            {deadline.notes && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {deadline.notes}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-error hover:text-error"
                          onClick={() => setDeleteDeadlineId(deadline.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Documents</CardTitle>
                <CardDescription>
                  Guides, exemples d&apos;essays et ressources
                </CardDescription>
              </div>
              <Button onClick={() => setShowAddDocumentDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un document
              </Button>
            </CardHeader>
            <CardContent>
              {program.documents.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    Aucun document enregistré
                  </p>
                  <Button onClick={() => setShowAddDocumentDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter un document
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {program.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:border-performup-blue/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-performup-blue/10">
                          <FileText className="h-5 w-5 text-performup-blue" />
                        </div>
                        <div>
                          <p className="font-medium">{doc.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {doc.type}
                            </Badge>
                            {doc.category && (
                              <Badge variant="secondary" className="text-xs">
                                {doc.category}
                              </Badge>
                            )}
                            {doc.year && (
                              <span className="text-xs text-muted-foreground">
                                {doc.year}
                              </span>
                            )}
                            {doc.isPublic && (
                              <Badge variant="outline" className="text-xs text-success border-success/20">
                                Public
                              </Badge>
                            )}
                          </div>
                          {doc.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {doc.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </a>
                        <a href={doc.fileUrl} download>
                          <Button variant="ghost" size="icon">
                            <Download className="h-4 w-4" />
                          </Button>
                        </a>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-error hover:text-error"
                          onClick={() => setDeleteDocumentId(doc.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stats Tab */}
        <TabsContent value="stats">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Statistiques d&apos;admission
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <Label className="text-muted-foreground text-xs">
                      Taux d&apos;acceptation
                    </Label>
                    <p className="text-2xl font-display font-semibold mt-1">
                      {program.acceptanceRate
                        ? `${program.acceptanceRate}%`
                        : "-"}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <Label className="text-muted-foreground text-xs">
                      Taille de la classe
                    </Label>
                    <p className="text-2xl font-display font-semibold mt-1">
                      {program.classSize || "-"}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <Label className="text-muted-foreground text-xs">
                      % International
                    </Label>
                    <p className="text-2xl font-display font-semibold mt-1">
                      {program.internationalPct
                        ? `${program.internationalPct}%`
                        : "-"}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <Label className="text-muted-foreground text-xs">
                      Âge moyen
                    </Label>
                    <p className="text-2xl font-display font-semibold mt-1">
                      {program.avgAge ? `${program.avgAge} ans` : "-"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Profil des admis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <Label className="text-muted-foreground text-xs">
                      GMAT moyen
                    </Label>
                    <p className="text-2xl font-display font-semibold mt-1">
                      {program.avgGMATScore || "-"}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <Label className="text-muted-foreground text-xs">
                      GRE moyen
                    </Label>
                    <p className="text-2xl font-display font-semibold mt-1">
                      {program.avgGREScore || "-"}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 col-span-2">
                    <Label className="text-muted-foreground text-xs">
                      Expérience professionnelle moyenne
                    </Label>
                    <p className="text-2xl font-display font-semibold mt-1">
                      {program.avgWorkExperience
                        ? `${program.avgWorkExperience} ans`
                        : "-"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Program Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le programme</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* General Info */}
            <div className="space-y-4">
              <h4 className="font-medium">Informations générales</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nom *</Label>
                  <Input
                    value={editData.name || ""}
                    onChange={(e) =>
                      setEditData((prev) => ({ ...prev, name: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={editData.type || "MiM"}
                    onValueChange={(value) =>
                      setEditData((prev) => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MiM">MiM</SelectItem>
                      <SelectItem value="MIF">MIF</SelectItem>
                      <SelectItem value="MSc">MSc</SelectItem>
                      <SelectItem value="MBA">MBA</SelectItem>
                      <SelectItem value="LLM">LLM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Diplôme</Label>
                  <Input
                    value={editData.degree || ""}
                    onChange={(e) =>
                      setEditData((prev) => ({ ...prev, degree: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Durée</Label>
                  <Input
                    value={editData.duration || ""}
                    onChange={(e) =>
                      setEditData((prev) => ({ ...prev, duration: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editData.description || ""}
                  onChange={(e) =>
                    setEditData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Site web</Label>
                  <Input
                    value={editData.website || ""}
                    onChange={(e) =>
                      setEditData((prev) => ({ ...prev, website: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Frais de scolarité</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={editData.tuitionFees || ""}
                      onChange={(e) =>
                        setEditData((prev) => ({
                          ...prev,
                          tuitionFees: e.target.value ? parseInt(e.target.value) : null,
                        }))
                      }
                      className="flex-1"
                    />
                    <Select
                      value={editData.tuitionCurrency || "EUR"}
                      onValueChange={(value) =>
                        setEditData((prev) => ({ ...prev, tuitionCurrency: value }))
                      }
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="CHF">CHF</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={editData.active ?? true}
                  onCheckedChange={(checked) =>
                    setEditData((prev) => ({ ...prev, active: checked }))
                  }
                />
                <Label>Programme actif</Label>
              </div>
            </div>

            {/* Requirements */}
            <div className="space-y-4">
              <h4 className="font-medium">Prérequis de tests</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <Label>GMAT requis</Label>
                  <Switch
                    checked={editData.requiresGMAT ?? false}
                    onCheckedChange={(checked) =>
                      setEditData((prev) => ({ ...prev, requiresGMAT: checked }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Score minimum GMAT</Label>
                  <Input
                    type="number"
                    value={editData.minGMATScore || ""}
                    onChange={(e) =>
                      setEditData((prev) => ({
                        ...prev,
                        minGMATScore: e.target.value ? parseInt(e.target.value) : null,
                      }))
                    }
                    disabled={!editData.requiresGMAT}
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <Label>GRE requis</Label>
                  <Switch
                    checked={editData.requiresGRE ?? false}
                    onCheckedChange={(checked) =>
                      setEditData((prev) => ({ ...prev, requiresGRE: checked }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Score minimum GRE</Label>
                  <Input
                    type="number"
                    value={editData.minGREScore || ""}
                    onChange={(e) =>
                      setEditData((prev) => ({
                        ...prev,
                        minGREScore: e.target.value ? parseInt(e.target.value) : null,
                      }))
                    }
                    disabled={!editData.requiresGRE}
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <Label>TOEFL requis</Label>
                  <Switch
                    checked={editData.requiresTOEFL ?? false}
                    onCheckedChange={(checked) =>
                      setEditData((prev) => ({ ...prev, requiresTOEFL: checked }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Score minimum TOEFL</Label>
                  <Input
                    type="number"
                    value={editData.minTOEFLScore || ""}
                    onChange={(e) =>
                      setEditData((prev) => ({
                        ...prev,
                        minTOEFLScore: e.target.value ? parseInt(e.target.value) : null,
                      }))
                    }
                    disabled={!editData.requiresTOEFL}
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <Label>IELTS requis</Label>
                  <Switch
                    checked={editData.requiresIELTS ?? false}
                    onCheckedChange={(checked) =>
                      setEditData((prev) => ({ ...prev, requiresIELTS: checked }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Score minimum IELTS</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={editData.minIELTSScore || ""}
                    onChange={(e) =>
                      setEditData((prev) => ({
                        ...prev,
                        minIELTSScore: e.target.value ? parseFloat(e.target.value) : null,
                      }))
                    }
                    disabled={!editData.requiresIELTS}
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg col-span-2">
                  <Label>TAGE MAGE requis</Label>
                  <Switch
                    checked={editData.requiresTAGEMAGE ?? false}
                    onCheckedChange={(checked) =>
                      setEditData((prev) => ({ ...prev, requiresTAGEMAGE: checked }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Autres prérequis</Label>
                <Textarea
                  value={editData.otherRequirements || ""}
                  onChange={(e) =>
                    setEditData((prev) => ({ ...prev, otherRequirements: e.target.value }))
                  }
                  rows={2}
                />
              </div>
            </div>

            {/* Statistics */}
            <div className="space-y-4">
              <h4 className="font-medium">Statistiques</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Taux d&apos;acceptation (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={editData.acceptanceRate || ""}
                    onChange={(e) =>
                      setEditData((prev) => ({
                        ...prev,
                        acceptanceRate: e.target.value ? parseFloat(e.target.value) : null,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Taille de la classe</Label>
                  <Input
                    type="number"
                    value={editData.classSize || ""}
                    onChange={(e) =>
                      setEditData((prev) => ({
                        ...prev,
                        classSize: e.target.value ? parseInt(e.target.value) : null,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>% International</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={editData.internationalPct || ""}
                    onChange={(e) =>
                      setEditData((prev) => ({
                        ...prev,
                        internationalPct: e.target.value ? parseFloat(e.target.value) : null,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Âge moyen</Label>
                  <Input
                    type="number"
                    value={editData.avgAge || ""}
                    onChange={(e) =>
                      setEditData((prev) => ({
                        ...prev,
                        avgAge: e.target.value ? parseInt(e.target.value) : null,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>GMAT moyen</Label>
                  <Input
                    type="number"
                    value={editData.avgGMATScore || ""}
                    onChange={(e) =>
                      setEditData((prev) => ({
                        ...prev,
                        avgGMATScore: e.target.value ? parseInt(e.target.value) : null,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>GRE moyen</Label>
                  <Input
                    type="number"
                    value={editData.avgGREScore || ""}
                    onChange={(e) =>
                      setEditData((prev) => ({
                        ...prev,
                        avgGREScore: e.target.value ? parseInt(e.target.value) : null,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Expérience professionnelle moyenne (années)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={editData.avgWorkExperience || ""}
                    onChange={(e) =>
                      setEditData((prev) => ({
                        ...prev,
                        avgWorkExperience: e.target.value ? parseFloat(e.target.value) : null,
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            {/* Internal Notes */}
            <div className="space-y-4">
              <h4 className="font-medium">Notes internes</h4>
              <Textarea
                value={editData.internalNotes || ""}
                onChange={(e) =>
                  setEditData((prev) => ({ ...prev, internalNotes: e.target.value }))
                }
                rows={4}
                placeholder="Notes visibles uniquement par les administrateurs..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleUpdateProgram} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Deadline Dialog */}
      <Dialog open={showAddDeadlineDialog} onOpenChange={setShowAddDeadlineDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une deadline</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Round *</Label>
              <Select
                value={newDeadline.round}
                onValueChange={(value) =>
                  setNewDeadline((prev) => ({ ...prev, round: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="R1">Round 1</SelectItem>
                  <SelectItem value="R2">Round 2</SelectItem>
                  <SelectItem value="R3">Round 3</SelectItem>
                  <SelectItem value="R4">Round 4</SelectItem>
                  <SelectItem value="Rolling">Rolling</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date limite *</Label>
              <Input
                type="date"
                value={newDeadline.deadline}
                onChange={(e) =>
                  setNewDeadline((prev) => ({ ...prev, deadline: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Date de décision</Label>
              <Input
                type="date"
                value={newDeadline.decisionDate}
                onChange={(e) =>
                  setNewDeadline((prev) => ({ ...prev, decisionDate: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={newDeadline.notes}
                onChange={(e) =>
                  setNewDeadline((prev) => ({ ...prev, notes: e.target.value }))
                }
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDeadlineDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddDeadline} disabled={!newDeadline.deadline || submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Essay Dialog */}
      <Dialog open={showAddEssayDialog} onOpenChange={setShowAddEssayDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une question d&apos;essay</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Question *</Label>
              <Textarea
                value={newEssay.question}
                onChange={(e) =>
                  setNewEssay((prev) => ({ ...prev, question: e.target.value }))
                }
                rows={3}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Round</Label>
                <Select
                  value={newEssay.round}
                  onValueChange={(value) =>
                    setNewEssay((prev) => ({ ...prev, round: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="R1">Round 1</SelectItem>
                    <SelectItem value="R2">Round 2</SelectItem>
                    <SelectItem value="R3">Round 3</SelectItem>
                    <SelectItem value="All">Tous</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Année</Label>
                <Input
                  type="number"
                  value={newEssay.year}
                  onChange={(e) =>
                    setNewEssay((prev) => ({
                      ...prev,
                      year: parseInt(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Limite de mots</Label>
                <Input
                  type="number"
                  value={newEssay.wordLimit}
                  onChange={(e) =>
                    setNewEssay((prev) => ({ ...prev, wordLimit: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={newEssay.isOptional}
                  onCheckedChange={(checked) =>
                    setNewEssay((prev) => ({ ...prev, isOptional: checked }))
                  }
                />
                <Label>Question optionnelle</Label>
              </div>
              {newEssay.isOptional && (
                <div className="flex-1 space-y-2">
                  <Label>Groupe optionnel</Label>
                  <Input
                    value={newEssay.optionalGroup}
                    onChange={(e) =>
                      setNewEssay((prev) => ({ ...prev, optionalGroup: e.target.value }))
                    }
                    placeholder="Ex: A, B, C..."
                  />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Conseils / Tips</Label>
              <Textarea
                value={newEssay.questionTips}
                onChange={(e) =>
                  setNewEssay((prev) => ({ ...prev, questionTips: e.target.value }))
                }
                rows={2}
                placeholder="Conseils pour répondre à cette question..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddEssayDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddEssay} disabled={!newEssay.question || submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Essay Dialog */}
      <Dialog open={!!editEssay} onOpenChange={(open) => !open && setEditEssay(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la question</DialogTitle>
          </DialogHeader>
          {editEssay && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Question *</Label>
                <Textarea
                  value={editEssay.question}
                  onChange={(e) =>
                    setEditEssay((prev) =>
                      prev ? { ...prev, question: e.target.value } : null
                    )
                  }
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Round</Label>
                  <Select
                    value={editEssay.round}
                    onValueChange={(value) =>
                      setEditEssay((prev) =>
                        prev ? { ...prev, round: value } : null
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="R1">Round 1</SelectItem>
                      <SelectItem value="R2">Round 2</SelectItem>
                      <SelectItem value="R3">Round 3</SelectItem>
                      <SelectItem value="All">Tous</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Année</Label>
                  <Input
                    type="number"
                    value={editEssay.year}
                    onChange={(e) =>
                      setEditEssay((prev) =>
                        prev ? { ...prev, year: parseInt(e.target.value) } : null
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Limite de mots</Label>
                  <Input
                    type="number"
                    value={editEssay.wordLimit || ""}
                    onChange={(e) =>
                      setEditEssay((prev) =>
                        prev
                          ? {
                              ...prev,
                              wordLimit: e.target.value
                                ? parseInt(e.target.value)
                                : null,
                            }
                          : null
                      )
                    }
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editEssay.isOptional}
                    onCheckedChange={(checked) =>
                      setEditEssay((prev) =>
                        prev ? { ...prev, isOptional: checked } : null
                      )
                    }
                  />
                  <Label>Question optionnelle</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editEssay.active}
                    onCheckedChange={(checked) =>
                      setEditEssay((prev) =>
                        prev ? { ...prev, active: checked } : null
                      )
                    }
                  />
                  <Label>Active</Label>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Conseils / Tips</Label>
                <Textarea
                  value={editEssay.questionTips || ""}
                  onChange={(e) =>
                    setEditEssay((prev) =>
                      prev ? { ...prev, questionTips: e.target.value } : null
                    )
                  }
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditEssay(null)}>
              Annuler
            </Button>
            <Button onClick={handleUpdateEssay} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Document Dialog */}
      <Dialog open={showAddDocumentDialog} onOpenChange={setShowAddDocumentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Fichier *</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  onChange={handleFileUpload}
                  className="flex-1"
                />
              </div>
              {newDocument.fileUrl && (
                <p className="text-sm text-success flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Fichier téléchargé
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Nom *</Label>
              <Input
                value={newDocument.name}
                onChange={(e) =>
                  setNewDocument((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={newDocument.type}
                  onValueChange={(value) =>
                    setNewDocument((prev) => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="guide">Guide</SelectItem>
                    <SelectItem value="example">Exemple essay</SelectItem>
                    <SelectItem value="brochure">Brochure</SelectItem>
                    <SelectItem value="checklist">Checklist</SelectItem>
                    <SelectItem value="other">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Année</Label>
                <Input
                  type="number"
                  value={newDocument.year}
                  onChange={(e) =>
                    setNewDocument((prev) => ({ ...prev, year: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Input
                value={newDocument.category}
                onChange={(e) =>
                  setNewDocument((prev) => ({ ...prev, category: e.target.value }))
                }
                placeholder="Ex: Admission, Essay, Interview..."
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newDocument.description}
                onChange={(e) =>
                  setNewDocument((prev) => ({ ...prev, description: e.target.value }))
                }
                rows={2}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={newDocument.isPublic}
                onCheckedChange={(checked) =>
                  setNewDocument((prev) => ({ ...prev, isPublic: checked }))
                }
              />
              <Label>Visible par les étudiants</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDocumentDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleAddDocument}
              disabled={!newDocument.name || !newDocument.fileUrl || submitting}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Deadline Confirmation */}
      <AlertDialog
        open={!!deleteDeadlineId}
        onOpenChange={(open) => !open && setDeleteDeadlineId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette deadline ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDeadline}
              className="bg-error hover:bg-error/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Essay Confirmation */}
      <AlertDialog
        open={!!deleteEssayId}
        onOpenChange={(open) => !open && setDeleteEssayId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette question ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEssay}
              className="bg-error hover:bg-error/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Document Confirmation */}
      <AlertDialog
        open={!!deleteDocumentId}
        onOpenChange={(open) => !open && setDeleteDocumentId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDocument}
              className="bg-error hover:bg-error/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
