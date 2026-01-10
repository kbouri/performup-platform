"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { formatRelativeTime } from "@/lib/utils";
import {
  Plus,
  Search,
  Filter,
  PenTool,
  Building2,
  Loader2,
  Edit,
  Eye,
  Trash2,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface EssayData {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  version: number;
  status: string;
  student: {
    id: string;
    name: string | null;
    email: string;
  };
  school: {
    id: string;
    name: string;
  };
  program: {
    id: string;
    name: string;
    type: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface School {
  id: string;
  name: string;
  programs: Array<{ id: string; name: string; type: string }>;
}

interface Student {
  id: string;
  name: string | null;
  email: string;
}

export default function EssaysPage() {
  const [essays, setEssays] = useState<EssayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [schoolFilter, setSchoolFilter] = useState("all");

  // For new essay dialog
  const [newEssayDialogOpen, setNewEssayDialogOpen] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [newEssay, setNewEssay] = useState({
    title: "",
    studentId: "",
    schoolId: "",
    programId: "",
  });
  const [creating, setCreating] = useState(false);

  const fetchEssays = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);

      const response = await fetch(`/api/essays?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setEssays(data.essays);
      }
    } catch (error) {
      console.error("Error fetching essays:", error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchEssays();
  }, [fetchEssays]);

  // Fetch schools and students for new essay form
  useEffect(() => {
    async function fetchData() {
      try {
        const [schoolsRes, studentsRes] = await Promise.all([
          fetch("/api/schools"),
          fetch("/api/students?limit=100"),
        ]);

        if (schoolsRes.ok) {
          const data = await schoolsRes.json();
          setSchools(data.schools || []);
        }

        if (studentsRes.ok) {
          const data = await studentsRes.json();
          setStudents(
            data.students?.map((s: { id: string; name: string | null; email: string }) => ({
              id: s.id,
              name: s.name,
              email: s.email,
            })) || []
          );
        }
      } catch (error) {
        console.error("Error fetching form data:", error);
      }
    }
    fetchData();
  }, []);

  const handleCreateEssay = async () => {
    if (!newEssay.title || !newEssay.studentId || !newEssay.schoolId) {
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/essays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEssay),
      });

      if (response.ok) {
        setNewEssayDialogOpen(false);
        setNewEssay({ title: "", studentId: "", schoolId: "", programId: "" });
        fetchEssays();
      }
    } catch (error) {
      console.error("Error creating essay:", error);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteEssay = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet essay ?")) return;

    try {
      const response = await fetch(`/api/essays/${id}`, { method: "DELETE" });
      if (response.ok) {
        fetchEssays();
      }
    } catch (error) {
      console.error("Error deleting essay:", error);
    }
  };

  // Filter essays by search and school
  const filteredEssays = essays.filter((essay) => {
    const matchesSearch =
      !searchQuery ||
      essay.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      essay.student.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      essay.school.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSchool =
      schoolFilter === "all" || essay.school.id === schoolFilter;

    return matchesSearch && matchesSchool;
  });

  // Get unique schools from essays
  const essaySchools = Array.from(new Set(essays.map((e) => e.school.id))).map(
    (id) => essays.find((e) => e.school.id === id)?.school
  );

  // Calculate stats
  const stats = {
    total: essays.length,
    draft: essays.filter((e) => e.status === "draft").length,
    inReview: essays.filter((e) => e.status === "in_review").length,
    finalized: essays.filter((e) => e.status === "finalized").length,
  };

  const selectedSchool = schools.find((s) => s.id === newEssay.schoolId);

  return (
    <>
      <PageHeader
        title="Essays"
        description="Suivez et gérez les essays des étudiants"
        breadcrumbs={[{ label: "Essays" }]}
        actions={
          <Button onClick={() => setNewEssayDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvel essay
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold font-display text-performup-blue">
              {stats.total}
            </div>
            <p className="text-sm text-muted-foreground">Total essays</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold font-display text-muted-foreground">
              {stats.draft}
            </div>
            <p className="text-sm text-muted-foreground">Brouillons</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold font-display text-warning">
              {stats.inReview}
            </div>
            <p className="text-sm text-muted-foreground">En révision</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold font-display text-success">
              {stats.finalized}
            </div>
            <p className="text-sm text-muted-foreground">Finalisés</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher un essay..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="draft">Brouillon</SelectItem>
            <SelectItem value="in_review">En révision</SelectItem>
            <SelectItem value="finalized">Finalisé</SelectItem>
          </SelectContent>
        </Select>

        <Select value={schoolFilter} onValueChange={setSchoolFilter}>
          <SelectTrigger className="w-[200px]">
            <Building2 className="mr-2 h-4 w-4" />
            <SelectValue placeholder="École" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les écoles</SelectItem>
            {essaySchools.map(
              (school) =>
                school && (
                  <SelectItem key={school.id} value={school.id}>
                    {school.name}
                  </SelectItem>
                )
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Essays list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-performup-blue" />
        </div>
      ) : filteredEssays.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <PenTool className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Aucun essay trouvé</p>
            <Button onClick={() => setNewEssayDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Créer un essay
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredEssays.map((essay) => (
            <Card key={essay.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base line-clamp-1">
                      {essay.title}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {essay.student.name || essay.student.email}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/essays/${essay.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          Voir
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/essays/${essay.id}/edit`}>
                          <Edit className="mr-2 h-4 w-4" />
                          Modifier
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-error"
                        onClick={() => handleDeleteEssay(essay.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{essay.school.name}</Badge>
                    {essay.program && (
                      <Badge variant="outline">{essay.program.type}</Badge>
                    )}
                    <Badge
                      variant={
                        essay.status === "finalized"
                          ? "success"
                          : essay.status === "in_review"
                          ? "warning"
                          : "secondary"
                      }
                    >
                      {essay.status === "finalized"
                        ? "Finalisé"
                        : essay.status === "in_review"
                        ? "En révision"
                        : "Brouillon"}
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {essay.content || "Aucun contenu"}
                  </p>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {essay.wordCount} mots • v{essay.version}
                    </span>
                    <span className="text-muted-foreground">
                      {formatRelativeTime(new Date(essay.updatedAt))}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New Essay Dialog */}
      <Dialog open={newEssayDialogOpen} onOpenChange={setNewEssayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvel essay</DialogTitle>
            <DialogDescription>
              Créez un nouvel essay pour un étudiant
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titre *</Label>
              <Input
                id="title"
                value={newEssay.title}
                onChange={(e) =>
                  setNewEssay((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Ex: Why HEC Paris?"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="student">Étudiant *</Label>
              <Select
                value={newEssay.studentId}
                onValueChange={(value) =>
                  setNewEssay((prev) => ({ ...prev, studentId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un étudiant" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name || student.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="school">École *</Label>
              <Select
                value={newEssay.schoolId}
                onValueChange={(value) =>
                  setNewEssay((prev) => ({
                    ...prev,
                    schoolId: value,
                    programId: "",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une école" />
                </SelectTrigger>
                <SelectContent>
                  {schools.map((school) => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedSchool && selectedSchool.programs.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="program">Programme</Label>
                <Select
                  value={newEssay.programId}
                  onValueChange={(value) =>
                    setNewEssay((prev) => ({ ...prev, programId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un programme" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedSchool.programs.map((program) => (
                      <SelectItem key={program.id} value={program.id}>
                        {program.name} ({program.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNewEssayDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={handleCreateEssay}
              disabled={
                creating ||
                !newEssay.title ||
                !newEssay.studentId ||
                !newEssay.schoolId
              }
            >
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
