"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout";
import { AccountingNav } from "@/components/accounting/accounting-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Briefcase,
  Loader2,
  Plus,
  Users,
  CheckCircle,
  Clock,
  Calendar,
  GraduationCap,
  BookOpen,
} from "lucide-react";

interface Mission {
  id: string;
  title: string;
  description: string | null;
  date: string;
  hoursWorked: number | null;
  amount: number;
  currency: string;
  status: string;
  validatedAt: string | null;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
  mentor: {
    id: string;
    name: string;
    email: string;
  } | null;
  professor: {
    id: string;
    name: string;
    email: string;
    type: string;
  } | null;
  student: {
    id: string;
    name: string;
  } | null;
  validator: string | null;
  createdBy: string | null;
}

interface Stats {
  total: number;
  pending: number;
  validated: number;
  paid: number;
  cancelled: number;
  totalAmount: number;
  pendingAmount: number;
  validatedAmount: number;
}

interface Mentor {
  id: string;
  name: string;
  email: string;
}

interface Professor {
  id: string;
  name: string;
  email: string;
  type: string;
}

interface Student {
  id: string;
  name: string;
}

export default function MissionsPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0, pending: 0, validated: 0, paid: 0, cancelled: 0,
    totalAmount: 0, pendingAmount: 0, validatedAmount: 0,
  });
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [createForm, setCreateForm] = useState({
    assigneeType: "mentor" as "mentor" | "professor",
    mentorId: "",
    professorId: "",
    studentId: "",
    title: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    hoursWorked: "",
    amount: "",
    currency: "EUR",
    notes: "",
    autoValidate: true,
  });

  const fetchMissions = useCallback(async () => {
    setLoading(true);
    try {
      let url = "/api/admin/accounting/missions?";
      if (statusFilter !== "all") url += `status=${statusFilter}&`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setMissions(data.missions);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching missions:", error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const fetchTeam = async () => {
    try {
      const [mentorsRes, professorsRes, studentsRes] = await Promise.all([
        fetch("/api/mentors"),
        fetch("/api/professors"),
        fetch("/api/students?limit=100"),
      ]);

      if (mentorsRes.ok) {
        const data = await mentorsRes.json();
        setMentors(data.mentors.map((m: { id: string; name: string; email: string }) => ({
          id: m.id,
          name: m.name,
          email: m.email,
        })));
      }

      if (professorsRes.ok) {
        const data = await professorsRes.json();
        setProfessors(data.professors.map((p: { id: string; name: string; email: string; type: string }) => ({
          id: p.id,
          name: p.name,
          email: p.email,
          type: p.type,
        })));
      }

      if (studentsRes.ok) {
        const data = await studentsRes.json();
        setStudents(data.students.map((s: { id: string; name: string }) => ({
          id: s.id,
          name: s.name,
        })));
      }
    } catch (error) {
      console.error("Error fetching team:", error);
    }
  };

  useEffect(() => {
    fetchMissions();
    fetchTeam();
  }, [fetchMissions]);

  async function handleCreateMission(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/accounting/missions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mentorId: createForm.assigneeType === "mentor" ? createForm.mentorId : undefined,
          professorId: createForm.assigneeType === "professor" ? createForm.professorId : undefined,
          studentId: createForm.studentId || undefined,
          title: createForm.title,
          description: createForm.description || undefined,
          date: createForm.date,
          hoursWorked: createForm.hoursWorked ? parseFloat(createForm.hoursWorked) : undefined,
          amount: Math.round(parseFloat(createForm.amount) * 100),
          currency: createForm.currency,
          notes: createForm.notes || undefined,
          autoValidate: createForm.autoValidate,
        }),
      });

      if (res.ok) {
        setIsCreateDialogOpen(false);
        setCreateForm({
          assigneeType: "mentor",
          mentorId: "",
          professorId: "",
          studentId: "",
          title: "",
          description: "",
          date: new Date().toISOString().split("T")[0],
          hoursWorked: "",
          amount: "",
          currency: "EUR",
          notes: "",
          autoValidate: true,
        });
        fetchMissions();
      } else {
        const error = await res.json();
        alert(error.error || "Erreur lors de la creation");
      }
    } catch (error) {
      console.error("Error creating mission:", error);
    } finally {
      setSubmitting(false);
    }
  }

  async function validateMission(missionId: string) {
    try {
      const res = await fetch(`/api/admin/accounting/missions/${missionId}/validate`, {
        method: "POST",
      });
      if (res.ok) {
        fetchMissions();
      } else {
        const error = await res.json();
        alert(error.error || "Erreur");
      }
    } catch (error) {
      console.error("Error validating mission:", error);
    }
  }

  const formatAmount = (amount: number, currency: string) => {
    return (amount / 100).toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " " + currency;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="warning">En attente</Badge>;
      case "VALIDATED":
        return <Badge variant="success">Validee</Badge>;
      case "PAID":
        return <Badge variant="default">Payee</Badge>;
      case "CANCELLED":
        return <Badge variant="secondary">Annulee</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Missions"
        description="Gestion des missions mentors et professeurs"
        breadcrumbs={[
          { label: "Admin" },
          { label: "Comptabilite", href: "/admin/accounting" },
          { label: "Missions" },
        ]}
        actions={
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle mission
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Creer une mission</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateMission} className="space-y-4">
                <div>
                  <Label>Type d&apos;intervenant</Label>
                  <Select
                    value={createForm.assigneeType}
                    onValueChange={(v: "mentor" | "professor") =>
                      setCreateForm({ ...createForm, assigneeType: v, mentorId: "", professorId: "" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mentor">Mentor</SelectItem>
                      <SelectItem value="professor">Professeur</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{createForm.assigneeType === "mentor" ? "Mentor" : "Professeur"}</Label>
                  {createForm.assigneeType === "mentor" ? (
                    mentors.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">
                        Aucun mentor disponible. Creez d&apos;abord un mentor dans Equipe &gt; Mentors.
                      </p>
                    ) : (
                      <Select
                        value={createForm.mentorId}
                        onValueChange={(v) => setCreateForm({ ...createForm, mentorId: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selectionner un mentor" />
                        </SelectTrigger>
                        <SelectContent>
                          {mentors.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.name} ({m.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )
                  ) : (
                    professors.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">
                        Aucun professeur disponible. Creez d&apos;abord un professeur dans Equipe &gt; Professeurs.
                      </p>
                    ) : (
                      <Select
                        value={createForm.professorId}
                        onValueChange={(v) => setCreateForm({ ...createForm, professorId: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selectionner un professeur" />
                        </SelectTrigger>
                        <SelectContent>
                          {professors.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} ({p.type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )
                  )}
                </div>
                <div>
                  <Label>Etudiant (optionnel)</Label>
                  <Select
                    value={createForm.studentId}
                    onValueChange={(v) => setCreateForm({ ...createForm, studentId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Aucun etudiant specifique" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Aucun</SelectItem>
                      {students.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Titre de la mission</Label>
                  <Input
                    value={createForm.title}
                    onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                    placeholder="Ex: Session mentorat, Cours GMAT..."
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={createForm.date}
                      onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Heures (optionnel)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      value={createForm.hoursWorked}
                      onChange={(e) => setCreateForm({ ...createForm, hoursWorked: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Montant</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={createForm.amount}
                      onChange={(e) => setCreateForm({ ...createForm, amount: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                    <Label>Devise</Label>
                    <Select
                      value={createForm.currency}
                      onValueChange={(v) => setCreateForm({ ...createForm, currency: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="MAD">MAD</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Description (optionnel)</Label>
                  <Textarea
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    placeholder="Details de la mission..."
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="autoValidate"
                    checked={createForm.autoValidate}
                    onCheckedChange={(checked) =>
                      setCreateForm({ ...createForm, autoValidate: checked === true })
                    }
                  />
                  <Label htmlFor="autoValidate" className="text-sm font-normal">
                    Valider automatiquement la mission
                  </Label>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    submitting ||
                    !createForm.title ||
                    (createForm.assigneeType === "mentor" && !createForm.mentorId) ||
                    (createForm.assigneeType === "professor" && !createForm.professorId)
                  }
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Creer la mission"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <AccountingNav />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
            <p className="text-sm text-muted-foreground">Total missions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              <span className="text-2xl font-bold">{stats.pending}</span>
            </div>
            <p className="text-sm text-muted-foreground">En attente</p>
            {stats.pendingAmount > 0 && (
              <p className="text-xs text-warning mt-1">
                {formatAmount(stats.pendingAmount, "EUR")}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              <span className="text-2xl font-bold">{stats.validated}</span>
            </div>
            <p className="text-sm text-muted-foreground">Validees</p>
            {stats.validatedAmount > 0 && (
              <p className="text-xs text-success mt-1">
                {formatAmount(stats.validatedAmount, "EUR")}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{stats.paid}</span>
            </div>
            <p className="text-sm text-muted-foreground">Payees</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-xl font-bold">{formatAmount(stats.totalAmount, "EUR")}</div>
            <p className="text-sm text-muted-foreground">Total (hors annulees)</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4 mb-4">
        <span className="text-sm text-muted-foreground">Statut:</span>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="PENDING">En attente</SelectItem>
            <SelectItem value="VALIDATED">Validees</SelectItem>
            <SelectItem value="PAID">Payees</SelectItem>
            <SelectItem value="CANCELLED">Annulees</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Missions List */}
      {missions.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Liste des missions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {missions.map((mission) => (
                <div key={mission.id} className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    {mission.mentor ? (
                      <GraduationCap className="h-5 w-5 text-primary" />
                    ) : (
                      <BookOpen className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{mission.title}</span>
                      {getStatusBadge(mission.status)}
                      <Badge variant="outline">{mission.currency}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {mission.mentor?.name || mission.professor?.name}
                        {mission.professor?.type && (
                          <Badge variant="secondary" className="text-xs ml-1">
                            {mission.professor.type}
                          </Badge>
                        )}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(mission.date)}
                      </span>
                      {mission.hoursWorked && (
                        <span>{mission.hoursWorked}h</span>
                      )}
                      {mission.student && (
                        <span className="text-xs">Pour: {mission.student.name}</span>
                      )}
                    </div>
                    {mission.description && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {mission.description}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex items-center gap-4">
                    <div>
                      <div className="font-semibold">
                        {formatAmount(mission.amount, mission.currency)}
                      </div>
                      {mission.validatedAt && (
                        <div className="text-xs text-muted-foreground">
                          Validee {formatDate(mission.validatedAt)}
                        </div>
                      )}
                    </div>
                    {mission.status === "PENDING" && (
                      <Button size="sm" onClick={() => validateMission(mission.id)}>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Valider
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Briefcase className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">Aucune mission trouvee</p>
            <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Creer une mission
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
}
