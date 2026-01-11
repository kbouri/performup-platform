"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { formatRelativeTime } from "@/lib/utils";
import {
  Loader2,
  Edit,
  Save,
  ArrowLeft,
  Building2,
  GraduationCap,
  User,
  Calendar,
  FileText,
  Trash2,
  History,
  Check,
  X,
} from "lucide-react";

interface EssayData {
  id: string;
  title: string;
  content: string;
  version: number;
  status: string;
  wordCount: number;
  characterCount: number;
  student: {
    id: string;
    user: {
      id: string;
      name: string | null;
      email: string;
    };
  };
  school: {
    id: string;
    name: string;
    country: string;
  };
  program: {
    id: string;
    name: string;
    type: string;
  } | null;
  responses: Array<{
    id: string;
    content: string | null;
    status: string;
    question: {
      questionText: string;
      wordLimit: number | null;
    };
  }>;
  createdAt: string;
  updatedAt: string;
}

export default function EssayDetailPage() {
  const params = useParams();
  const router = useRouter();
  const essayId = params.id as string;

  const [essay, setEssay] = useState<EssayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    title: "",
    content: "",
    status: "",
  });

  const fetchEssay = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/essays/${essayId}`);
      if (response.ok) {
        const data = await response.json();
        setEssay(data.essay);
        setEditForm({
          title: data.essay.title,
          content: data.essay.content,
          status: data.essay.status,
        });
      } else if (response.status === 404) {
        router.push("/essays");
      }
    } catch (error) {
      console.error("Error fetching essay:", error);
    } finally {
      setLoading(false);
    }
  }, [essayId, router]);

  useEffect(() => {
    fetchEssay();
  }, [fetchEssay]);

  const handleSave = async (createVersion = false) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/essays/${essayId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          createVersion,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setEssay(data.essay);
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Error saving essay:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/essays/${essayId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.push("/essays");
      }
    } catch (error) {
      console.error("Error deleting essay:", error);
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "finalized":
        return <Badge variant="success">Finalisé</Badge>;
      case "in_review":
        return <Badge variant="warning">En révision</Badge>;
      default:
        return <Badge variant="secondary">Brouillon</Badge>;
    }
  };

  // Calculate word count for current content
  const currentWordCount = editForm.content
    .split(/\s+/)
    .filter(Boolean).length;
  const currentCharCount = editForm.content.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-performup-blue" />
      </div>
    );
  }

  if (!essay) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Essay non trouvé</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/essays">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux essays
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={isEditing ? "Modifier l'essay" : essay.title}
        description={
          isEditing
            ? "Modifiez le contenu et le statut de l'essay"
            : `${essay.school.name} • ${essay.wordCount} mots`
        }
        breadcrumbs={[
          { label: "Essays", href: "/essays" },
          { label: essay.title },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setEditForm({
                      title: essay.title,
                      content: essay.content,
                      status: essay.status,
                    });
                  }}
                >
                  <X className="mr-2 h-4 w-4" />
                  Annuler
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleSave(true)}
                  disabled={saving}
                >
                  <History className="mr-2 h-4 w-4" />
                  Sauvegarder (nouvelle version)
                </Button>
                <Button onClick={() => handleSave(false)} disabled={saving}>
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Sauvegarder
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" asChild>
                  <Link href="/essays">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Retour
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="text-error hover:text-error"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer
                </Button>
                <Button onClick={() => setIsEditing(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Modifier
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {isEditing ? (
            <Card>
              <CardHeader>
                <CardTitle>Contenu de l'essay</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Titre</Label>
                  <Input
                    id="title"
                    value={editForm.title}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, title: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="content">Contenu</Label>
                    <span className="text-sm text-muted-foreground">
                      {currentWordCount} mots • {currentCharCount} caractères
                    </span>
                  </div>
                  <Textarea
                    id="content"
                    value={editForm.content}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        content: e.target.value,
                      }))
                    }
                    className="min-h-[400px] font-mono text-sm"
                    placeholder="Rédigez votre essay ici..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Statut</Label>
                  <Select
                    value={editForm.status}
                    onValueChange={(value) =>
                      setEditForm((prev) => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Brouillon</SelectItem>
                      <SelectItem value="in_review">En révision</SelectItem>
                      <SelectItem value="finalized">Finalisé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Contenu</CardTitle>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(essay.status)}
                    <Badge variant="outline">v{essay.version}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  {essay.content ? (
                    <div className="whitespace-pre-wrap font-serif leading-relaxed">
                      {essay.content}
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic">
                      Aucun contenu rédigé
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Essay Responses (Questions) */}
          {essay.responses && essay.responses.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Réponses aux questions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {essay.responses.map((response, index) => (
                  <div
                    key={response.id}
                    className="border rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <p className="font-medium text-sm">
                        Question {index + 1}
                      </p>
                      <Badge
                        variant={
                          response.status === "FINALIZED"
                            ? "success"
                            : response.status === "IN_REVIEW"
                            ? "warning"
                            : "secondary"
                        }
                      >
                        {response.status === "FINALIZED"
                          ? "Finalisé"
                          : response.status === "IN_REVIEW"
                          ? "En révision"
                          : response.status === "DRAFT"
                          ? "Brouillon"
                          : "Non commencé"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {response.question?.questionText}
                    </p>
                    {response.content && (
                      <p className="text-sm mt-2 whitespace-pre-wrap">
                        {response.content}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Info card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Étudiant</p>
                  <Link
                    href={`/students/${essay.student.id}`}
                    className="text-sm text-performup-blue hover:underline"
                  >
                    {essay.student.user.name || essay.student.user.email}
                  </Link>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">École</p>
                  <p className="text-sm text-muted-foreground">
                    {essay.school.name}
                  </p>
                </div>
              </div>

              {essay.program && (
                <div className="flex items-center gap-3">
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Programme</p>
                    <p className="text-sm text-muted-foreground">
                      {essay.program.name} ({essay.program.type})
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Dernière modification</p>
                  <p className="text-sm text-muted-foreground">
                    {formatRelativeTime(new Date(essay.updatedAt))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Statistiques</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Mots</span>
                <span className="font-medium">{essay.wordCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Caractères</span>
                <span className="font-medium">{essay.characterCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Version</span>
                <span className="font-medium">v{essay.version}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Statut</span>
                {getStatusBadge(essay.status)}
              </div>
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions rapides</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {essay.status !== "finalized" && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={async () => {
                    await fetch(`/api/essays/${essayId}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ status: "finalized" }),
                    });
                    fetchEssay();
                  }}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Marquer comme finalisé
                </Button>
              )}
              {essay.status === "draft" && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={async () => {
                    await fetch(`/api/essays/${essayId}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ status: "in_review" }),
                    });
                    fetchEssay();
                  }}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Envoyer en révision
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full justify-start"
                asChild
              >
                <Link href={`/students/${essay.student.id}`}>
                  <User className="mr-2 h-4 w-4" />
                  Voir le profil étudiant
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet essay ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'essay "{essay.title}" sera
              définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-error hover:bg-error/90"
              disabled={deleting}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
