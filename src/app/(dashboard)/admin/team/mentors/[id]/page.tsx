"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  Edit,
  Save,
  ArrowLeft,
  Users2,
  Mail,
  Phone,
  Calendar,
  Wallet,
  UserCog,
  Clock,
  Trash2,
  X,
  GraduationCap,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface MentorData {
  id: string;
  userId: string;
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    image?: string;
    phone?: string;
    active: boolean;
    createdAt: string;
  };
  status: string;
  specialties: string[];
  bio?: string;
  hourlyRate?: number;
  paymentType: string;
  executiveChef?: {
    id: string;
    userId: string;
    user: {
      firstName?: string;
      lastName?: string;
      name?: string;
      email: string;
    };
  };
  students: Array<{
    id: string;
    userId: string;
    status: string;
    user: {
      firstName?: string;
      lastName?: string;
      name?: string;
      email: string;
    };
    packs: Array<{
      id: string;
      packName: string;
      progress: number;
      status: string;
    }>;
  }>;
  invitedAt?: string;
  activatedAt?: string;
  deactivatedAt?: string;
  createdAt: string;
}

interface Stats {
  totalStudents: number;
  activeStudents: number;
  sessionsThisMonth: number;
  completedSessionsThisMonth: number;
  totalHoursThisMonth: number;
  earningsThisMonth: number;
  totalPaymentsReceived: number;
}

interface ExecutiveChef {
  id: string;
  user: {
    firstName?: string;
    lastName?: string;
    name?: string;
  };
}

export default function MentorProfilePage() {
  const params = useParams();
  const router = useRouter();
  const mentorId = params.id as string;

  const [mentor, setMentor] = useState<MentorData | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [executiveChefs, setExecutiveChefs] = useState<ExecutiveChef[]>([]);

  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    specialties: "",
    bio: "",
    hourlyRate: "",
    paymentType: "HOURLY",
    executiveChefId: "",
    status: "ACTIVE",
  });

  const fetchMentor = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/team/mentors/${mentorId}`);
      if (response.ok) {
        const data = await response.json();
        setMentor(data.mentor);
        setStats(data.stats);
        setEditForm({
          firstName: data.mentor.user.firstName || "",
          lastName: data.mentor.user.lastName || "",
          phone: data.mentor.user.phone || "",
          specialties: data.mentor.specialties?.join(", ") || "",
          bio: data.mentor.bio || "",
          hourlyRate: data.mentor.hourlyRate ? String(data.mentor.hourlyRate / 100) : "",
          paymentType: data.mentor.paymentType || "HOURLY",
          executiveChefId: data.mentor.executiveChef?.id || "",
          status: data.mentor.status || "ACTIVE",
        });
      } else if (response.status === 404) {
        router.push("/admin/team");
      }
    } catch (error) {
      console.error("Error fetching mentor:", error);
    } finally {
      setLoading(false);
    }
  }, [mentorId, router]);

  useEffect(() => {
    fetchMentor();
  }, [fetchMentor]);

  useEffect(() => {
    async function fetchExecutiveChefs() {
      try {
        const res = await fetch("/api/admin/team/executive-chefs");
        if (res.ok) {
          const data = await res.json();
          setExecutiveChefs(data.executiveChefs || []);
        }
      } catch (error) {
        console.error("Error fetching executive chefs:", error);
      }
    }
    fetchExecutiveChefs();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/team/mentors/${mentorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: editForm.firstName,
          lastName: editForm.lastName,
          phone: editForm.phone,
          specialties: editForm.specialties.split(",").map((s) => s.trim()).filter(Boolean),
          bio: editForm.bio,
          hourlyRate: editForm.hourlyRate ? Math.round(parseFloat(editForm.hourlyRate) * 100) : null,
          paymentType: editForm.paymentType,
          executiveChefId: editForm.executiveChefId || null,
          status: editForm.status,
        }),
      });

      if (response.ok) {
        await fetchMentor();
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Error saving mentor:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/team/mentors/${mentorId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.push("/admin/team");
      }
    } catch (error) {
      console.error("Error deactivating mentor:", error);
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge variant="success">Actif</Badge>;
      case "INACTIVE":
        return <Badge variant="destructive">Inactif</Badge>;
      case "PENDING":
        return <Badge variant="warning">En attente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getUserName = (user: { firstName?: string; lastName?: string; name?: string }) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.name || "N/A";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-performup-blue" />
      </div>
    );
  }

  if (!mentor) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Users2 className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Mentor non trouve</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/admin/team">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour a l'equipe
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={isEditing ? "Modifier le mentor" : getUserName(mentor.user)}
        description={isEditing ? "Modifiez les informations du mentor" : mentor.user.email}
        breadcrumbs={[
          { label: "Admin" },
          { label: "Equipe", href: "/admin/team" },
          { label: getUserName(mentor.user) },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                >
                  <X className="mr-2 h-4 w-4" />
                  Annuler
                </Button>
                <Button onClick={handleSave} disabled={saving}>
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
                  <Link href="/admin/team">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Retour
                  </Link>
                </Button>
                {mentor.status === "ACTIVE" && (
                  <Button
                    variant="outline"
                    className="text-error hover:text-error"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Desactiver
                  </Button>
                )}
                <Button onClick={() => setIsEditing(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Modifier
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Stats Cards */}
      {stats && !isEditing && (
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-performup-blue">
                {stats.totalStudents}
              </div>
              <p className="text-sm text-muted-foreground">
                Etudiants ({stats.activeStudents} actifs)
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {stats.sessionsThisMonth}
              </div>
              <p className="text-sm text-muted-foreground">
                Sessions ce mois ({stats.completedSessionsThisMonth} terminees)
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {stats.totalHoursThisMonth}h
              </div>
              <p className="text-sm text-muted-foreground">Heures ce mois</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-success">
                {stats.earningsThisMonth.toLocaleString("fr-FR")} EUR
              </div>
              <p className="text-sm text-muted-foreground">Gains ce mois</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2">
          {isEditing ? (
            <Card>
              <CardHeader>
                <CardTitle>Informations du mentor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Prenom</Label>
                    <Input
                      id="firstName"
                      value={editForm.firstName}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, firstName: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nom</Label>
                    <Input
                      id="lastName"
                      value={editForm.lastName}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, lastName: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telephone</Label>
                  <Input
                    id="phone"
                    value={editForm.phone}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, phone: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="specialties">Specialites (separees par virgule)</Label>
                  <Input
                    id="specialties"
                    value={editForm.specialties}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, specialties: e.target.value }))
                    }
                    placeholder="GMAT, MBA, Consulting..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={editForm.bio}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, bio: e.target.value }))
                    }
                    rows={4}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="hourlyRate">Taux horaire (EUR)</Label>
                    <Input
                      id="hourlyRate"
                      type="number"
                      value={editForm.hourlyRate}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, hourlyRate: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentType">Type de paiement</Label>
                    <Select
                      value={editForm.paymentType}
                      onValueChange={(value) =>
                        setEditForm((prev) => ({ ...prev, paymentType: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HOURLY">Horaire</SelectItem>
                        <SelectItem value="FIXED">Fixe</SelectItem>
                        <SelectItem value="COMMISSION">Commission</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="executiveChef">Chef Executif</Label>
                  <Select
                    value={editForm.executiveChefId}
                    onValueChange={(value) =>
                      setEditForm((prev) => ({ ...prev, executiveChefId: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selectionner un chef executif" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Aucun</SelectItem>
                      {executiveChefs.map((chef) => (
                        <SelectItem key={chef.id} value={chef.id}>
                          {getUserName(chef.user)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                      <SelectItem value="ACTIVE">Actif</SelectItem>
                      <SelectItem value="INACTIVE">Inactif</SelectItem>
                      <SelectItem value="PENDING">En attente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="students">
              <TabsList>
                <TabsTrigger value="students">
                  Etudiants ({mentor.students.length})
                </TabsTrigger>
                <TabsTrigger value="info">Informations</TabsTrigger>
              </TabsList>

              <TabsContent value="students" className="space-y-4">
                {mentor.students.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      Aucun etudiant assigne
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {mentor.students.map((student) => (
                      <Card key={student.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <Link
                                href={`/students/${student.id}`}
                                className="font-medium hover:text-performup-blue"
                              >
                                {getUserName(student.user)}
                              </Link>
                              <p className="text-sm text-muted-foreground">
                                {student.user.email}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {student.packs.map((pack) => (
                                <Badge key={pack.id} variant="outline">
                                  {pack.packName} - {pack.progress}%
                                </Badge>
                              ))}
                              <Badge
                                variant={
                                  student.status === "EN_COURS"
                                    ? "success"
                                    : "secondary"
                                }
                              >
                                {student.status}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="info">
                <Card>
                  <CardContent className="p-6 space-y-4">
                    {mentor.bio && (
                      <div>
                        <h4 className="font-medium mb-2">Bio</h4>
                        <p className="text-muted-foreground">{mentor.bio}</p>
                      </div>
                    )}

                    {mentor.specialties.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Specialites</h4>
                        <div className="flex flex-wrap gap-2">
                          {mentor.specialties.map((s, i) => (
                            <Badge key={i} variant="outline">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <h4 className="font-medium mb-2">Taux horaire</h4>
                        <p className="text-muted-foreground">
                          {mentor.hourlyRate
                            ? `${(mentor.hourlyRate / 100).toFixed(0)} EUR/h`
                            : "Non defini"}
                        </p>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Type de paiement</h4>
                        <p className="text-muted-foreground">
                          {mentor.paymentType === "HOURLY"
                            ? "Horaire"
                            : mentor.paymentType === "FIXED"
                            ? "Fixe"
                            : "Commission"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{mentor.user.email}</p>
                </div>
              </div>

              {mentor.user.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Telephone</p>
                    <p className="text-sm text-muted-foreground">{mentor.user.phone}</p>
                  </div>
                </div>
              )}

              {mentor.executiveChef && (
                <div className="flex items-center gap-3">
                  <UserCog className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Chef Executif</p>
                    <Link
                      href={`/admin/team/executive-chefs/${mentor.executiveChef.id}`}
                      className="text-sm text-performup-blue hover:underline"
                    >
                      {getUserName(mentor.executiveChef.user)}
                    </Link>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Membre depuis</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(mentor.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {mentor.status === "ACTIVE" ? (
                  <CheckCircle className="h-4 w-4 text-success" />
                ) : (
                  <XCircle className="h-4 w-4 text-error" />
                )}
                <div>
                  <p className="text-sm font-medium">Statut</p>
                  {getStatusBadge(mentor.status)}
                </div>
              </div>
            </CardContent>
          </Card>

          {stats && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Paiements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total recu</span>
                  <span className="font-medium">
                    {stats.totalPaymentsReceived.toLocaleString("fr-FR")} EUR
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Ce mois</span>
                  <span className="font-medium text-success">
                    {stats.earningsThisMonth.toLocaleString("fr-FR")} EUR
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Deactivate confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desactiver ce mentor ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le mentor {getUserName(mentor.user)} sera desactive. Il ne pourra
              plus acceder a la plateforme mais ses donnees seront conservees.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivate}
              className="bg-error hover:bg-error/90"
              disabled={deleting}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Desactiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
