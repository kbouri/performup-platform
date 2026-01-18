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
  Clock,
  DollarSign,
  Edit,
  Save,
  X,
  AlertTriangle,
  CheckCircle,
  User,
  BookOpen,
  GraduationCap,
  CalendarDays,
  FileText,
  ExternalLink,
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Professor {
  id: string;
  userId: string;
  type: "QUANT" | "VERBAL";
  status: string;
  hourlyRate: number | null;
  availability: string | null;
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

interface Student {
  id: string;
  userId: string;
  status: string;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    name: string | null;
    email: string;
  };
  packs: {
    id: string;
    packName: string;
    progress: number;
    status: string;
  }[];
}

interface RecentEvent {
  id: string;
  title: string;
  eventType: string;
  startTime: string;
  endTime: string;
  completed: boolean;
  studentName: string;
}

interface RecentPayment {
  id: string;
  amount: number;
  paymentDate: string;
  status: string;
}

interface Stats {
  totalStudents: number;
  activeStudents: number;
  totalEvents: number;
  eventsThisMonth: number;
  completedEventsThisMonth: number;
  hoursThisMonth: number;
  earningsThisMonth: number;
  totalPaymentsReceived: number;
}

export default function ProfessorProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [professor, setProfessor] = useState<Professor | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    type: "QUANT" as "QUANT" | "VERBAL",
    hourlyRate: "",
    availability: "",
    status: "",
  });

  useEffect(() => {
    fetchProfessor();
  }, [id]);

  const fetchProfessor = async () => {
    try {
      const response = await fetch(`/api/admin/team/professors/${id}`);
      if (!response.ok) {
        throw new Error("Professeur non trouve");
      }
      const data = await response.json();
      setProfessor(data.professor);
      setStudents(data.students || []);
      setStats(data.stats);
      setRecentEvents(data.recentEvents || []);
      setRecentPayments(data.recentPayments || []);

      setEditForm({
        firstName: data.professor.user.firstName || "",
        lastName: data.professor.user.lastName || "",
        phone: data.professor.user.phone || "",
        type: data.professor.type || "QUANT",
        hourlyRate: data.professor.hourlyRate
          ? (data.professor.hourlyRate / 100).toString()
          : "",
        availability: data.professor.availability || "",
        status: data.professor.status || "ACTIVE",
      });
    } catch (error) {
      console.error("Error fetching professor:", error);
      toast.error("Erreur lors du chargement du professeur");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/team/professors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: editForm.firstName,
          lastName: editForm.lastName,
          phone: editForm.phone,
          type: editForm.type,
          hourlyRate: editForm.hourlyRate
            ? Math.round(parseFloat(editForm.hourlyRate) * 100)
            : null,
          availability: editForm.availability,
          status: editForm.status,
        }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la mise a jour");
      }

      toast.success("Professeur mis a jour avec succes");
      setIsEditing(false);
      fetchProfessor();
    } catch (error) {
      console.error("Error updating professor:", error);
      toast.error("Erreur lors de la mise a jour");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    try {
      const response = await fetch(`/api/admin/team/professors/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la desactivation");
      }

      toast.success("Professeur desactive avec succes");
      router.push("/admin/team");
    } catch (error) {
      console.error("Error deactivating professor:", error);
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

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!professor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-muted-foreground">Professeur non trouve</p>
        <Button asChild>
          <Link href="/admin/team">Retour a l equipe</Link>
        </Button>
      </div>
    );
  }

  const displayName =
    professor.user.firstName && professor.user.lastName
      ? `${professor.user.firstName} ${professor.user.lastName}`
      : professor.user.name || professor.user.email;

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
            <h1 className="text-2xl font-bold">{displayName}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={getStatusColor(professor.status)}>
                {professor.status}
              </Badge>
              <Badge variant="outline">
                {professor.type === "QUANT" ? "Quantitatif" : "Verbal"}
              </Badge>
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
              {professor.status === "ACTIVE" && (
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
                        Desactiver ce professeur ?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action desactivera le compte du professeur. Il ne
                        pourra plus acceder a la plateforme. Vous pourrez le
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
              <CardTitle className="text-sm font-medium">Etudiants</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalStudents}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeStudents} actifs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Cours ce mois
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.eventsThisMonth}</div>
              <p className="text-xs text-muted-foreground">
                {stats.completedEventsThisMonth} completes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Heures ce mois
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.hoursThisMonth}h</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalEvents} cours au total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Gains ce mois
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.earningsThisMonth.toFixed(2)} EUR
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.totalPaymentsReceived.toFixed(2)} EUR total recu
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Informations</TabsTrigger>
          <TabsTrigger value="students">
            Etudiants ({students.length})
          </TabsTrigger>
          <TabsTrigger value="planning">
            <CalendarDays className="h-4 w-4 mr-1" />
            Planning
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="h-4 w-4 mr-1" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="events">Cours recents</TabsTrigger>
          <TabsTrigger value="payments">Paiements</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informations personnelles</CardTitle>
              <CardDescription>
                Details du profil du professeur
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
                    <Label htmlFor="type">Specialite</Label>
                    <Select
                      value={editForm.type}
                      onValueChange={(value: "QUANT" | "VERBAL") =>
                        setEditForm({ ...editForm, type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="QUANT">Quantitatif</SelectItem>
                        <SelectItem value="VERBAL">Verbal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hourlyRate">Taux horaire (EUR)</Label>
                    <Input
                      id="hourlyRate"
                      type="number"
                      step="0.01"
                      value={editForm.hourlyRate}
                      onChange={(e) =>
                        setEditForm({ ...editForm, hourlyRate: e.target.value })
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
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="availability">Disponibilites</Label>
                    <Textarea
                      id="availability"
                      value={editForm.availability}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          availability: e.target.value,
                        })
                      }
                      placeholder="Ex: Lundi 14h-18h, Mercredi 10h-12h..."
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{professor.user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Telephone</p>
                      <p className="font-medium">
                        {professor.user.phone || "-"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Specialite
                      </p>
                      <p className="font-medium">
                        {professor.type === "QUANT" ? "Quantitatif" : "Verbal"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Taux horaire
                      </p>
                      <p className="font-medium">
                        {professor.hourlyRate
                          ? `${(professor.hourlyRate / 100).toFixed(2)} EUR/h`
                          : "-"}
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
                        {formatDate(professor.user.createdAt)}
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
                        {formatDate(professor.activatedAt)}
                      </p>
                    </div>
                  </div>
                  {professor.availability && (
                    <div className="md:col-span-2 flex items-start gap-3">
                      <Clock className="h-4 w-4 text-muted-foreground mt-1" />
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Disponibilites
                        </p>
                        <p className="font-medium">{professor.availability}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Etudiants assignes</CardTitle>
              <CardDescription>
                Liste des etudiants suivis par ce professeur
              </CardDescription>
            </CardHeader>
            <CardContent>
              {students.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aucun etudiant assigne pour le moment
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
                              : student.user.name || student.user.email}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {student.user.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {student.packs.length > 0 && (
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {student.packs[0].packName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {student.packs[0].progress}% complete
                            </p>
                          </div>
                        )}
                        <Badge className={getStudentStatusColor(student.status)}>
                          {student.status === "EN_COURS"
                            ? "En cours"
                            : student.status === "TERMINE"
                            ? "Termine"
                            : student.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="planning" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Planning du professeur</CardTitle>
                  <CardDescription>
                    Consultez les cours et disponibilites
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/planning?professorId=${professor.id}`}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Voir en plein ecran
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  Consultez le planning complet de ce professeur
                </p>
                <Button asChild>
                  <Link href={`/planning?professorId=${professor.id}`}>
                    <CalendarDays className="h-4 w-4 mr-2" />
                    Ouvrir le planning
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Documents du professeur</CardTitle>
                  <CardDescription>
                    Documents partages par ce professeur
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/documents?userId=${professor.userId}`}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Voir tous les documents
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  Consultez les documents partages par ce professeur
                </p>
                <Button asChild>
                  <Link href={`/documents?userId=${professor.userId}`}>
                    <FileText className="h-4 w-4 mr-2" />
                    Ouvrir les documents
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cours recents</CardTitle>
              <CardDescription>
                Derniers cours dispenses par ce professeur
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentEvents.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aucun cours programme
                </p>
              ) : (
                <div className="space-y-3">
                  {recentEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            event.completed
                              ? "bg-green-100"
                              : "bg-yellow-100"
                          }`}
                        >
                          {event.completed ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <Clock className="h-5 w-5 text-yellow-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{event.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {event.studentName}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {formatDate(event.startTime)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(event.startTime)} -{" "}
                          {formatTime(event.endTime)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historique des paiements</CardTitle>
              <CardDescription>
                Paiements recus par ce professeur
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentPayments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aucun paiement enregistre
                </p>
              ) : (
                <div className="space-y-3">
                  {recentPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                          <DollarSign className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {payment.amount.toFixed(2)} EUR
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(payment.paymentDate)}
                          </p>
                        </div>
                      </div>
                      <Badge
                        className={
                          payment.status === "PAID"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }
                      >
                        {payment.status === "PAID" ? "Paye" : payment.status}
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
