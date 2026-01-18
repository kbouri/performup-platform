"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  ArrowLeft,
  Building2,
  GraduationCap,
  MapPin,
  ExternalLink,
  Plus,
  Loader2,
  Edit,
  Trash2,
  Clock,
  Users,
  Calendar,
} from "lucide-react";

interface Program {
  id: string;
  name: string;
  type: string;
  duration: string | null;
  degree: string | null;
  description: string | null;
  website: string | null;
  active: boolean;
  _count: {
    applications: number;
    essays: number;
    studentSchools: number;
    deadlines?: number;
  };
}

interface School {
  id: string;
  name: string;
  country: string;
  city: string | null;
  website: string | null;
  logoUrl: string | null;
  description: string | null;
  programs: Program[];
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

export default function SchoolDetailPage() {
  const params = useParams();
  const router = useRouter();
  const schoolId = params.id as string;

  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddProgramDialog, setShowAddProgramDialog] = useState(false);
  const [showEditSchoolDialog, setShowEditSchoolDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [newProgram, setNewProgram] = useState({
    name: "",
    type: "MiM",
    duration: "",
    degree: "",
    description: "",
    website: "",
  });

  const [editSchool, setEditSchool] = useState({
    name: "",
    country: "",
    city: "",
    website: "",
    description: "",
  });

  // Fetch school details
  useEffect(() => {
    async function fetchSchool() {
      try {
        const response = await fetch(`/api/admin/schools/${schoolId}`);
        if (response.ok) {
          const data = await response.json();
          setSchool(data.school);
          setEditSchool({
            name: data.school.name || "",
            country: data.school.country || "",
            city: data.school.city || "",
            website: data.school.website || "",
            description: data.school.description || "",
          });
        } else if (response.status === 404) {
          router.push("/schools");
        }
      } catch (error) {
        console.error("Error fetching school:", error);
      } finally {
        setLoading(false);
      }
    }
    if (schoolId) {
      fetchSchool();
    }
  }, [schoolId, router]);

  // Create program
  const handleCreateProgram = async () => {
    if (!newProgram.name || !newProgram.type) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/schools/${schoolId}/programs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProgram),
      });

      if (response.ok) {
        const data = await response.json();
        setSchool((prev) =>
          prev
            ? {
                ...prev,
                programs: [
                  ...prev.programs,
                  { ...data.program, _count: { applications: 0, essays: 0, studentSchools: 0 } },
                ],
              }
            : null
        );
        setNewProgram({
          name: "",
          type: "MiM",
          duration: "",
          degree: "",
          description: "",
          website: "",
        });
        setShowAddProgramDialog(false);
      }
    } catch (error) {
      console.error("Error creating program:", error);
    } finally {
      setSubmitting(false);
    }
  };

  // Update school
  const handleUpdateSchool = async () => {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/schools/${schoolId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editSchool),
      });

      if (response.ok) {
        const data = await response.json();
        setSchool((prev) =>
          prev
            ? {
                ...prev,
                ...data.school,
              }
            : null
        );
        setShowEditSchoolDialog(false);
      }
    } catch (error) {
      console.error("Error updating school:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-performup-blue" />
      </div>
    );
  }

  if (!school) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">École non trouvée</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/schools")}>
          Retour aux écoles
        </Button>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={school.name}
        description={
          <span className="flex items-center gap-2">
            <span className="text-lg">{countryFlags[school.country] || "🌍"}</span>
            {school.city && (
              <>
                <MapPin className="h-3 w-3" />
                {school.city},
              </>
            )}
            {school.country}
            {school.website && (
              <>
                <span className="mx-1">•</span>
                <a
                  href={school.website}
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
        backLink="/schools"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowEditSchoolDialog(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Modifier
            </Button>
            <Button onClick={() => setShowAddProgramDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un programme
            </Button>
          </div>
        }
      />

      {/* Description */}
      {school.description && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <p className="text-muted-foreground">{school.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-performup-blue/10">
                <GraduationCap className="h-6 w-6 text-performup-blue" />
              </div>
              <div>
                <div className="text-2xl font-display font-semibold">
                  {school.programs.length}
                </div>
                <p className="text-sm text-muted-foreground">Programmes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-performup-gold/10">
                <Users className="h-6 w-6 text-performup-gold" />
              </div>
              <div>
                <div className="text-2xl font-display font-semibold">
                  {school.programs.reduce((acc, p) => acc + p._count.studentSchools, 0)}
                </div>
                <p className="text-sm text-muted-foreground">Étudiants ciblant</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10">
                <Calendar className="h-6 w-6 text-success" />
              </div>
              <div>
                <div className="text-2xl font-display font-semibold">
                  {school.programs.reduce((acc, p) => acc + p._count.applications, 0)}
                </div>
                <p className="text-sm text-muted-foreground">Candidatures</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Programs List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Programmes ({school.programs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {school.programs.length === 0 ? (
            <div className="text-center py-12">
              <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">Aucun programme enregistré</p>
              <Button onClick={() => setShowAddProgramDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un programme
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {school.programs.map((program) => (
                <Link
                  key={program.id}
                  href={`/admin/schools/${schoolId}/programs/${program.id}`}
                  className="block"
                >
                  <div className="flex items-center justify-between p-4 rounded-lg border hover:border-performup-blue/50 hover:bg-muted/50 transition-all">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <h4 className="font-medium">{program.name}</h4>
                        <Badge
                          variant="outline"
                          className={programTypeColors[program.type] || ""}
                        >
                          {program.type}
                        </Badge>
                        {!program.active && (
                          <Badge variant="secondary">Inactif</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        {program.degree && <span>{program.degree}</span>}
                        {program.duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {program.duration}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <div className="text-center">
                        <div className="font-semibold text-foreground">
                          {program._count.studentSchools}
                        </div>
                        <div className="text-xs">Étudiants</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-foreground">
                          {program._count.applications}
                        </div>
                        <div className="text-xs">Candidatures</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-foreground">
                          {program._count.essays}
                        </div>
                        <div className="text-xs">Essays</div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Program Dialog */}
      <Dialog open={showAddProgramDialog} onOpenChange={setShowAddProgramDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un programme</DialogTitle>
            <DialogDescription>
              Ajoutez un nouveau programme pour {school.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="program-name">Nom du programme *</Label>
              <Input
                id="program-name"
                placeholder="Ex: Master in Management"
                value={newProgram.name}
                onChange={(e) =>
                  setNewProgram((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="program-type">Type *</Label>
                <Select
                  value={newProgram.type}
                  onValueChange={(value) =>
                    setNewProgram((prev) => ({ ...prev, type: value }))
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
              <div className="space-y-2">
                <Label htmlFor="program-degree">Diplôme</Label>
                <Input
                  id="program-degree"
                  placeholder="Ex: Master's Degree"
                  value={newProgram.degree}
                  onChange={(e) =>
                    setNewProgram((prev) => ({ ...prev, degree: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="program-duration">Durée</Label>
              <Input
                id="program-duration"
                placeholder="Ex: 2 ans"
                value={newProgram.duration}
                onChange={(e) =>
                  setNewProgram((prev) => ({ ...prev, duration: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="program-website">Site web</Label>
              <Input
                id="program-website"
                placeholder="https://..."
                value={newProgram.website}
                onChange={(e) =>
                  setNewProgram((prev) => ({ ...prev, website: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="program-description">Description</Label>
              <Textarea
                id="program-description"
                placeholder="Description du programme..."
                value={newProgram.description}
                onChange={(e) =>
                  setNewProgram((prev) => ({ ...prev, description: e.target.value }))
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddProgramDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleCreateProgram}
              disabled={!newProgram.name || submitting}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer le programme
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit School Dialog */}
      <Dialog open={showEditSchoolDialog} onOpenChange={setShowEditSchoolDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l&apos;école</DialogTitle>
            <DialogDescription>
              Modifiez les informations de {school.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nom *</Label>
              <Input
                id="edit-name"
                value={editSchool.name}
                onChange={(e) =>
                  setEditSchool((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-country">Pays *</Label>
                <Select
                  value={editSchool.country || "_none"}
                  onValueChange={(value) =>
                    setEditSchool((prev) => ({
                      ...prev,
                      country: value === "_none" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Sélectionner...</SelectItem>
                    <SelectItem value="France">🇫🇷 France</SelectItem>
                    <SelectItem value="UK">🇬🇧 Royaume-Uni</SelectItem>
                    <SelectItem value="Italie">🇮🇹 Italie</SelectItem>
                    <SelectItem value="Espagne">🇪🇸 Espagne</SelectItem>
                    <SelectItem value="Suisse">🇨🇭 Suisse</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-city">Ville</Label>
                <Input
                  id="edit-city"
                  value={editSchool.city}
                  onChange={(e) =>
                    setEditSchool((prev) => ({ ...prev, city: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-website">Site web</Label>
              <Input
                id="edit-website"
                value={editSchool.website}
                onChange={(e) =>
                  setEditSchool((prev) => ({ ...prev, website: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editSchool.description}
                onChange={(e) =>
                  setEditSchool((prev) => ({ ...prev, description: e.target.value }))
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditSchoolDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleUpdateSchool} disabled={!editSchool.name || submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
