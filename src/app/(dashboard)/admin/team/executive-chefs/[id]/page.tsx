"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Users,
  Edit,
  Save,
  X,
  AlertTriangle,
  CheckCircle,
  User,
  GraduationCap,
  Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface ExecutiveChef {
  id: string;
  userId: string;
  status: string;
  invitedAt: string | null;
  activatedAt: string | null;
  deactivatedAt: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    name: string | null;
    image: string | null;
    phone: string | null;
    active: boolean;
    createdAt: string;
  };
}

interface Mentor {
  id: string;
  userId: string;
  status: string;
  specialties: string[];
  studentsCount: number;
  paymentsCount: number;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    name: string | null;
    email: string;
  };
}

interface Student {
  id: string;
  userId: string;
  status: string;
  mentorId: string;
  mentorName: string;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    name: string | null;
  };
}

interface Stats {
  totalMentors: number;
  activeMentors: number;
  totalStudents: number;
  activeStudents: number;
}

export default function ExecutiveChefProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [executiveChef, setExecutiveChef] = useState<ExecutiveChef | null>(
    null
  );
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    status: "",
  });

  useEffect(() => {
    fetchExecutiveChef();
  }, [id]);

  const fetchExecutiveChef = async () => {
    try {
      const response = await fetch(`/api/admin/team/executive-chefs/${id}`);
      if (!response.ok) {
        throw new Error("Chef executif non trouve");
      }
      const data = await response.json();
      setExecutiveChef(data.executiveChef);
      setMentors(data.mentors || []);
      setStudents(data.students || []);
      setStats(data.stats);

      setEditForm({
        firstName: data.executiveChef.user.firstName || "",
        lastName: data.executiveChef.user.lastName || "",
        phone: data.executiveChef.user.phone || "",
        status: data.executiveChef.status || "ACTIVE",
      });
    } catch (error) {
      console.error("Error fetching executive chef:", error);
      toast.error("Erreur lors du chargement du chef executif");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/team/executive-chefs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: editForm.firstName,
          lastName: editForm.lastName,
          phone: editForm.phone,
          status: editForm.status,
        }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la mise a jour");
      }

      toast.success("Chef executif mis a jour avec succes");
      setIsEditing(false);
      fetchExecutiveChef();
    } catch (error) {
      console.error("Error updating executive chef:", error);
      toast.error("Erreur lors de la mise a jour");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    try {
      const response = await fetch(`/api/admin/team/executive-chefs/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la desactivation");
      }

      toast.success("Chef executif desactive avec succes");
      router.push("/admin/team");
    } catch (error) {
      console.error("Error deactivating executive chef:", error);
      toast.error("Erreur lors de la desactivation");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "INACTIVE":
        return "bg-red-100 text-red-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStudentStatusColor = (status: string) => {
    switch (status) {
      case "EN_COURS":
        return "bg-blue-100 text-blue-800";
      case "TERMINE":
        return "bg-green-100 text-green-800";
      case "ABANDONNE":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!executiveChef) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-muted-foreground">Chef executif non trouve</p>
        <Button asChild>
          <Link href="/admin/team">Retour a l equipe</Link>
        </Button>
      </div>
    );
  }

  const displayName =
    executiveChef.user.firstName && executiveChef.user.lastName
      ? `${executiveChef.user.firstName} ${executiveChef.user.lastName}`
      : executiveChef.user.name || executiveChef.user.email;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/team">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              <h1 className="text-2xl font-bold">{displayName}</h1>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={getStatusColor(executiveChef.status)}>
                {executiveChef.status}
              </Badge>
              <Badge variant="outline">Chef Executif</Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4 mr-2" />
                Annuler
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </Button>
              {executiveChef.status === "ACTIVE" && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Desactiver
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Desactiver ce chef executif ?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action desactivera le compte du chef executif. Il
                        ne pourra plus acceder a la plateforme. Les mentors
                        qu il supervise ne seront pas affectes. Vous pourrez le
                        reactiver plus tard si necessaire.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeactivate}>
                        Desactiver
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Mentors supervises
              </CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMentors}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeMentors} actifs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Etudiants totaux
              </CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalStudents}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeStudents} en cours
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Etudiants par mentor
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalMentors > 0
                  ? (stats.totalStudents / stats.totalMentors).toFixed(1)
                  : "0"}
              </div>
              <p className="text-xs text-muted-foreground">moyenne</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Taux d activite
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalStudents > 0
                  ? Math.round(
                      (stats.activeStudents / stats.totalStudents) * 100
                    )
                  : 0}
                %
              </div>
              <p className="text-xs text-muted-foreground">
                etudiants en cours
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Informations</TabsTrigger>
          <TabsTrigger value="mentors">Mentors ({mentors.length})</TabsTrigger>
          <TabsTrigger value="students">
            Etudiants ({students.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informations personnelles</CardTitle>
              <CardDescription>
                Details du profil du chef executif
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Prenom</Label>
                    <Input
                      id="firstName"
                      value={editForm.firstName}
                      onChange={(e) =>
                        setEditForm({ ...editForm, firstName: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nom</Label>
                    <Input
                      id="lastName"
                      value={editForm.lastName}
                      onChange={(e) =>
                        setEditForm({ ...editForm, lastName: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telephone</Label>
                    <Input
                      id="phone"
                      value={editForm.phone}
                      onChange={(e) =>
                        setEditForm({ ...editForm, phone: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Statut</Label>
                    <Select
                      value={editForm.status}
                      onValueChange={(value) =>
                        setEditForm({ ...editForm, status: value })
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
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{executiveChef.user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Telephone</p>
                      <p className="font-medium">
                        {executiveChef.user.phone || "-"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Date d inscription
                      </p>
                      <p className="font-medium">
                        {formatDate(executiveChef.user.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Date d activation
                      </p>
                      <p className="font-medium">
                        {formatDate(executiveChef.activatedAt)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mentors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Mentors supervises</CardTitle>
              <CardDescription>
                Liste des mentors sous la supervision de ce chef executif
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mentors.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aucun mentor supervise pour le moment
                </p>
              ) : (
                <div className="space-y-3">
                  {mentors.map((mentor) => (
                    <Link
                      key={mentor.id}
                      href={`/admin/team/mentors/${mentor.id}`}
                      className="block"
                    >
                      <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {mentor.user.firstName && mentor.user.lastName
                                ? `${mentor.user.firstName} ${mentor.user.lastName}`
                                : mentor.user.name || mentor.user.email}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {mentor.user.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {mentor.studentsCount} etudiant
                              {mentor.studentsCount > 1 ? "s" : ""}
                            </p>
                            {mentor.specialties.length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                {mentor.specialties.slice(0, 2).join(", ")}
                              </p>
                            )}
                          </div>
                          <Badge className={getStatusColor(mentor.status)}>
                            {mentor.status}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tous les etudiants</CardTitle>
              <CardDescription>
                Etudiants de tous les mentors supervises
              </CardDescription>
            </CardHeader>
            <CardContent>
              {students.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aucun etudiant dans l equipe
                </p>
              ) : (
                <div className="space-y-3">
                  {students.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <GraduationCap className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {student.user.firstName && student.user.lastName
                              ? `${student.user.firstName} ${student.user.lastName}`
                              : student.user.name || "Etudiant"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Mentor: {student.mentorName}
                          </p>
                        </div>
                      </div>
                      <Badge className={getStudentStatusColor(student.status)}>
                        {student.status === "EN_COURS"
                          ? "En cours"
                          : student.status === "TERMINE"
                          ? "Termine"
                          : student.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
