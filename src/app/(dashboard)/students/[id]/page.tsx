"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  formatCurrency,
  formatDate,
  formatRelativeTime,
  STUDENT_STATUS_DISPLAY,
} from "@/lib/utils";
import {
  ArrowLeft,
  Calendar,
  FileText,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Briefcase,
  Target,
  CheckCircle2,
  Edit,
  MoreHorizontal,
  PenTool,
  BookOpen,
  MessageSquare,
  Building2,
  ExternalLink,
  Linkedin,
  Loader2,
  CreditCard,
  Users,
  UserX,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface StudentData {
  id: string;
  userId: string;
  status: string;
  startDate: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
  currentFormation: string | null;
  linkedinUrl: string | null;
  programType: string;
  internalNotes: string | null;
  progress: number;
  totalPaid: number;
  totalDue: number;
  user: {
    id: string;
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string;
    phone: string | null;
    image: string | null;
    active: boolean;
  };
  team: {
    mentor: {
      id: string;
      userId: string;
      name: string | null;
      email: string;
      image: string | null;
    } | null;
    professorQuant: {
      id: string;
      userId: string;
      name: string | null;
      email: string;
      image: string | null;
      type: string;
    } | null;
    professorVerbal: {
      id: string;
      userId: string;
      name: string | null;
      email: string;
      image: string | null;
      type: string;
    } | null;
  };
  packs: Array<{
    id: string;
    packId: string;
    customPrice: number;
    progressPercent: number;
    status: string;
    pack: {
      displayName: string;
    };
  }>;
  schools: Array<{
    id: string;
    priority: number;
    status: string;
    school: {
      id: string;
      name: string;
    };
    program: {
    id: string;
      name: string;
      type: string;
    } | null;
  }>;
  calendarEvents: Array<{
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    eventType: string;
    meetingUrl: string | null;
    instructor: {
      user: {
        name: string | null;
      };
    } | null;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    dueDate: string;
    category: string;
    completed: boolean;
  }>;
  essays: Array<{
    id: string;
    title: string;
    status: string;
    school: {
      name: string;
    };
    program: {
      name: string;
    } | null;
    updatedAt: string;
  }>;
  testScores: Array<{
    id: string;
    testType: string;
    scoreType: string;
    scoreQuant: number | null;
    scoreVerbal: number | null;
    totalScore: number | null;
    testDate: string;
  }>;
  academicExperiences: Array<{
    id: string;
    institution: string;
    degree: string;
    fieldOfStudy: string | null;
    startDate: string;
    endDate: string | null;
    current: boolean;
  }>;
  workExperiences: Array<{
    id: string;
    company: string;
    title: string;
    startDate: string;
    endDate: string | null;
    current: boolean;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    currency: string;
    paymentDate: string;
    paymentMethod: string;
    status: string;
    referenceNumber: string | null;
  }>;
  paymentSchedules: Array<{
    id: string;
    type: string;
    amount: number;
    currency: string;
    dueDate: string;
    status: string;
    paidAmount: number;
  }>;
}

interface MentorOption {
  id: string;
  name: string;
}

interface ProfessorOption {
  id: string;
  name: string;
  type: string;
}

export default function StudentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [student, setStudent] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    nationality: "",
    currentFormation: "",
    linkedinUrl: "",
    programType: "MASTER",
    status: "EN_DEMARRAGE",
    mentorId: "",
    professorQuantId: "",
    professorVerbalId: "",
    internalNotes: "",
  });

  // Team options
  const [mentors, setMentors] = useState<MentorOption[]>([]);
  const [professors, setProfessors] = useState<ProfessorOption[]>([]);

  // Deactivate dialog
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  useEffect(() => {
    async function fetchStudent() {
      if (!params.id) return;
      
      try {
        const response = await fetch(`/api/students/${params.id}`);
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Erreur lors du chargement");
        }
        const data = await response.json();
        setStudent(data.student);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    }

    fetchStudent();
  }, [params.id]);

  // Fetch mentors and professors for edit form
  useEffect(() => {
    async function fetchTeamOptions() {
      try {
        const [mentorsRes, professorsRes] = await Promise.all([
          fetch("/api/mentors"),
          fetch("/api/professors"),
        ]);

        if (mentorsRes.ok) {
          const data = await mentorsRes.json();
          setMentors(data.mentors || []);
        }

        if (professorsRes.ok) {
          const data = await professorsRes.json();
          setProfessors(data.professors || []);
        }
      } catch (error) {
        console.error("Error fetching team options:", error);
      }
    }
    fetchTeamOptions();
  }, []);

  // Initialize edit form when student data is loaded
  useEffect(() => {
    if (student) {
      setEditForm({
        firstName: student.user.firstName || "",
        lastName: student.user.lastName || "",
        phone: student.user.phone || "",
        nationality: student.nationality || "",
        currentFormation: student.currentFormation || "",
        linkedinUrl: student.linkedinUrl || "",
        programType: student.programType || "MASTER",
        status: student.status || "EN_DEMARRAGE",
        mentorId: student.team.mentor?.id || "",
        professorQuantId: student.team.professorQuant?.id || "",
        professorVerbalId: student.team.professorVerbal?.id || "",
        internalNotes: student.internalNotes || "",
      });
    }
  }, [student]);

  // Handle save student
  const handleSaveStudent = async () => {
    if (!student) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/students/${student.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personalInfo: {
            firstName: editForm.firstName,
            lastName: editForm.lastName,
            phone: editForm.phone,
            nationality: editForm.nationality,
            currentFormation: editForm.currentFormation,
            linkedinUrl: editForm.linkedinUrl,
            programType: editForm.programType,
          },
          team: {
            mentorId: editForm.mentorId || null,
            professorQuantId: editForm.professorQuantId || null,
            professorVerbalId: editForm.professorVerbalId || null,
          },
          status: editForm.status,
          internalNotes: editForm.internalNotes,
        }),
      });

      if (response.ok) {
        // Refresh student data
        const refreshRes = await fetch(`/api/students/${student.id}`);
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          setStudent(data.student);
        }
        setEditDialogOpen(false);
      } else {
        const data = await response.json();
        alert(data.error || "Erreur lors de la sauvegarde");
      }
    } catch (error) {
      console.error("Error saving student:", error);
      alert("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  // Handle deactivate student
  const handleDeactivateStudent = async () => {
    if (!student) return;

    setDeactivating(true);
    try {
      const response = await fetch(`/api/students/${student.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.push("/students");
      } else {
        const data = await response.json();
        alert(data.error || "Erreur lors de la désactivation");
      }
    } catch (error) {
      console.error("Error deactivating student:", error);
      alert("Erreur lors de la désactivation");
    } finally {
      setDeactivating(false);
      setDeactivateDialogOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-performup-blue"></div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-error mb-4">{error || "Étudiant non trouvé"}</p>
        <Button asChild variant="outline">
          <Link href="/students">
          <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux étudiants
          </Link>
        </Button>
      </div>
    );
  }

  const statusInfo = STUDENT_STATUS_DISPLAY[student.status] || {
    label: student.status,
    variant: "secondary",
  };

  return (
    <>
      <PageHeader
        title={student.user.name || student.user.email}
        description={student.currentFormation || "Étudiant PerformUp"}
        breadcrumbs={[
          { label: "Étudiants", href: "/students" },
          { label: student.user.name || "Détail" },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/planning?studentId=${student.id}`}>
                <Calendar className="mr-2 h-4 w-4" />
                Planning
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/documents?studentId=${student.id}`}>
                <FileText className="mr-2 h-4 w-4" />
                Documents
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Modifier le profil
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={`mailto:${student.user.email}`}>
                    <Mail className="mr-2 h-4 w-4" />
                    Envoyer un email
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-error"
                  onClick={() => setDeactivateDialogOpen(true)}
                >
                  <UserX className="mr-2 h-4 w-4" />
                  Désactiver
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Profile */}
        <div className="space-y-6">
          {/* Profile Card */}
          <Card>
        <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <UserAvatar
                  name={student.user.name || student.user.email}
                  size="xl"
                  className="mb-4"
                />
                <h2 className="text-xl font-display font-semibold">
                  {student.user.name}
                </h2>
                <p className="text-sm text-muted-foreground mb-3">
                  {student.user.email}
                </p>
                <Badge
                  variant={statusInfo.variant as "success" | "warning" | "error" | "secondary"}
                >
                    {statusInfo.label}
                  </Badge>
                </div>

              <Separator className="my-6" />

              <div className="space-y-4">
                  {student.user.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{student.user.phone}</span>
                  </div>
                )}
                {student.nationality && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{student.nationality}</span>
                  </div>
                )}
                {student.currentFormation && (
                  <div className="flex items-center gap-3">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{student.currentFormation}</span>
                  </div>
                  )}
                  {student.linkedinUrl && (
                  <div className="flex items-center gap-3">
                    <Linkedin className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={student.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-performup-blue hover:underline flex items-center gap-1"
                    >
                      LinkedIn <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
                {student.startDate && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Inscrit le {formatDate(new Date(student.startDate))}
                    </span>
                </div>
                )}
          </div>
        </CardContent>
      </Card>

          {/* Team Card */}
        <Card>
            <CardHeader>
              <CardTitle className="text-base">Équipe</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {student.team.mentor && (
                <div className="flex items-center gap-3">
                  <UserAvatar name={student.team.mentor.name || "M"} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {student.team.mentor.name}
                    </p>
                    <p className="text-xs text-muted-foreground">Mentor</p>
                  </div>
                  <Button variant="ghost" size="icon-sm">
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {student.team.professorQuant && (
                <div className="flex items-center gap-3">
                  <UserAvatar
                    name={student.team.professorQuant.name || "PQ"}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {student.team.professorQuant.name}
                    </p>
                    <p className="text-xs text-muted-foreground">Prof Quant</p>
                  </div>
                  <Button variant="ghost" size="icon-sm">
                    <MessageSquare className="h-4 w-4" />
                  </Button>
              </div>
              )}
              {student.team.professorVerbal && (
                <div className="flex items-center gap-3">
                  <UserAvatar
                    name={student.team.professorVerbal.name || "PV"}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {student.team.professorVerbal.name}
                    </p>
                    <p className="text-xs text-muted-foreground">Prof Verbal</p>
              </div>
                  <Button variant="ghost" size="icon-sm">
                    <MessageSquare className="h-4 w-4" />
                  </Button>
            </div>
              )}
              {!student.team.mentor &&
                !student.team.professorQuant &&
                !student.team.professorVerbal && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucune équipe assignée
                  </p>
                )}
          </CardContent>
        </Card>

          {/* Payment Summary */}
        <Card>
            <CardHeader>
              <CardTitle className="text-base">Paiements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total dû</span>
                  <span className="font-medium">
                    {formatCurrency(student.totalDue)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Payé</span>
                  <span className="font-medium text-success">
                    {formatCurrency(student.totalPaid)}
                  </span>
              </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Reste à payer</span>
                  <span className="font-medium text-warning">
                    {formatCurrency(student.totalDue - student.totalPaid)}
                  </span>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>

        {/* Right Column - Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress Overview */}
        <Card>
            <CardHeader>
              <CardTitle className="text-base">Progression globale</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress
                value={student.progress}
                className="mb-4"
                showEncouragement
              />
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="text-2xl font-display font-semibold text-performup-blue">
                    {student.packs.length}
              </div>
                  <p className="text-sm text-muted-foreground">Packs actifs</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="text-2xl font-display font-semibold text-performup-gold">
                    {student.schools.length}
              </div>
                  <p className="text-sm text-muted-foreground">Écoles ciblées</p>
            </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="text-2xl font-display font-semibold text-success">
                    {student.essays.filter((e) => e.status === "finalized").length}
                    /{student.essays.length}
              </div>
                  <p className="text-sm text-muted-foreground">Essays finalisés</p>
              </div>
            </div>
          </CardContent>
        </Card>

          {/* Tabs for detailed content */}
          <Tabs defaultValue="packs" className="space-y-4">
            <TabsList>
              <TabsTrigger value="packs">Packs</TabsTrigger>
              <TabsTrigger value="schools">Écoles</TabsTrigger>
              <TabsTrigger value="planning">Planning</TabsTrigger>
              <TabsTrigger value="essays">Essays</TabsTrigger>
              <TabsTrigger value="scores">Scores</TabsTrigger>
              <TabsTrigger value="payments">Paiements</TabsTrigger>
            </TabsList>

            <TabsContent value="packs" className="space-y-4">
              {student.packs.length > 0 ? (
                student.packs.map((pack) => (
                  <Card key={pack.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-performup-blue/10">
                            <Briefcase className="h-5 w-5 text-performup-blue" />
                          </div>
                      <div>
                            <h3 className="font-medium">{pack.pack.displayName}</h3>
                            <p className="text-sm text-muted-foreground">
                              {formatCurrency(pack.customPrice)}
                            </p>
                      </div>
                    </div>
                        <Badge
                          variant={
                            pack.status === "active"
                              ? "success"
                              : pack.status === "completed"
                              ? "secondary"
                              : "warning"
                          }
                        >
                          {pack.status === "active"
                            ? "Actif"
                            : pack.status === "completed"
                            ? "Terminé"
                            : "En pause"}
                        </Badge>
                      </div>
                      <Progress
                        value={pack.progressPercent}
                        showEncouragement={false}
                        size="sm"
                      />
                </CardContent>
              </Card>
                ))
              ) : (
              <Card>
                  <CardContent className="py-8 text-center">
                    <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Aucun pack assigné</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="schools" className="space-y-4">
                  {student.schools.length > 0 ? (
                student.schools.map((school) => (
                  <Card key={school.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-performup-gold/10">
                            <Building2 className="h-5 w-5 text-performup-gold" />
                          </div>
                          <div>
                            <h3 className="font-medium">{school.school.name}</h3>
                            {school.program && (
                              <p className="text-sm text-muted-foreground">
                                {school.program.name} ({school.program.type})
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Priorité {school.priority}</Badge>
                          <Badge
                            variant={
                              school.status === "ADMITTED"
                                ? "success"
                                : school.status === "REJECTED"
                                ? "error"
                                : "secondary"
                            }
                          >
                            {school.status}
                          </Badge>
                        </div>
                    </div>
                </CardContent>
              </Card>
                ))
              ) : (
              <Card>
                  <CardContent className="py-8 text-center">
                    <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Aucune école ciblée</p>
                </CardContent>
              </Card>
              )}
            </TabsContent>

            <TabsContent value="planning" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Prochains événements</CardTitle>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/planning?studentId=${student.id}`}>
                        Voir tout
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {student.calendarEvents.length > 0 ? (
                    <div className="space-y-3">
                      {student.calendarEvents.slice(0, 5).map((event) => (
                          <div
                          key={event.id}
                          className="flex items-center gap-4 p-3 rounded-lg border"
                          >
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-calendar-quant/10">
                              <BookOpen className="h-5 w-5 text-calendar-quant" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{event.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(new Date(event.startTime), {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                              {event.instructor && ` • ${event.instructor.user.name}`}
                            </p>
                          </div>
                          {event.meetingUrl && (
                            <Button variant="secondary" size="sm" asChild>
                              <a
                                href={event.meetingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Rejoindre
                              </a>
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        Aucun événement à venir
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Tâches à faire</CardTitle>
                    <Badge variant="secondary">{student.tasks.length}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {student.tasks.length > 0 ? (
                    <div className="space-y-2">
                      {student.tasks.slice(0, 5).map((task) => (
                          <div
                            key={task.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                          >
                            <div
                              className={`h-2 w-2 rounded-full ${
                                new Date(task.dueDate) < new Date()
                                  ? "bg-error"
                                : "bg-muted-foreground"
                              }`}
                            />
                          <span className="flex-1 text-sm truncate">{task.title}</span>
                            <Badge variant="outline" className="text-xs">
                              {task.category}
                            </Badge>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <CheckCircle2 className="h-8 w-8 mx-auto text-success mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Toutes les tâches sont complétées !
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="essays" className="space-y-4">
              {student.essays.length > 0 ? (
                student.essays.map((essay) => (
                  <Card key={essay.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-performup-blue/10">
                            <PenTool className="h-5 w-5 text-performup-blue" />
                          </div>
                          <div>
                            <h3 className="font-medium">{essay.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {essay.school.name}
                              {essay.program && ` - ${essay.program.name}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(new Date(essay.updatedAt))}
                          </span>
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
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <PenTool className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Aucun essay créé</p>
                  </CardContent>
                </Card>
              )}
        </TabsContent>

            <TabsContent value="scores" className="space-y-4">
              {student.testScores.length > 0 ? (
                student.testScores.map((score) => (
                  <Card key={score.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                            <Target className="h-5 w-5 text-success" />
              </div>
                          <div>
                            <h3 className="font-medium">{score.testType}</h3>
                            <p className="text-sm text-muted-foreground">
                              {score.scoreType} -{" "}
                              {formatDate(new Date(score.testDate))}
                            </p>
                </div>
                        </div>
                        {score.totalScore && (
                          <div className="text-2xl font-display font-bold text-performup-blue">
                            {score.totalScore}
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {score.scoreQuant !== null && (
                          <div className="text-center p-3 rounded-lg bg-calendar-quant/10">
                            <div className="text-lg font-semibold text-calendar-quant">
                              {score.scoreQuant}
                            </div>
                            <p className="text-xs text-muted-foreground">Quant</p>
                          </div>
                        )}
                        {score.scoreVerbal !== null && (
                          <div className="text-center p-3 rounded-lg bg-calendar-verbal/10">
                            <div className="text-lg font-semibold text-calendar-verbal">
                              {score.scoreVerbal}
                            </div>
                            <p className="text-xs text-muted-foreground">Verbal</p>
                          </div>
                        )}
                  </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Aucun score enregistré</p>
              </CardContent>
            </Card>
              )}
            </TabsContent>

            <TabsContent value="payments" className="space-y-4">
              {/* Payment Schedules */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Échéancier de paiement</CardTitle>
                </CardHeader>
                <CardContent>
                  {student.paymentSchedules && student.paymentSchedules.length > 0 ? (
                    <div className="space-y-3">
                      {student.paymentSchedules.map((schedule) => (
                        <div
                          key={schedule.id}
                          className="flex items-center justify-between p-3 rounded-lg border"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                              schedule.status === "PAID" ? "bg-success/10" :
                              schedule.status === "OVERDUE" ? "bg-error/10" : "bg-muted"
                            }`}>
                              <CreditCard className={`h-5 w-5 ${
                                schedule.status === "PAID" ? "text-success" :
                                schedule.status === "OVERDUE" ? "text-error" : "text-muted-foreground"
                              }`} />
                            </div>
                            <div>
                              <p className="font-medium">{schedule.type}</p>
                              <p className="text-sm text-muted-foreground">
                                Échéance: {formatDate(new Date(schedule.dueDate))}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatCurrency(schedule.amount, schedule.currency)}</p>
                            <Badge
                              variant={
                                schedule.status === "PAID"
                                  ? "success"
                                  : schedule.status === "OVERDUE"
                                  ? "error"
                                  : schedule.status === "PARTIAL"
                                  ? "warning"
                                  : "secondary"
                              }
                            >
                              {schedule.status === "PAID" ? "Payé" :
                               schedule.status === "OVERDUE" ? "En retard" :
                               schedule.status === "PARTIAL" ? `Partiel (${formatCurrency(schedule.paidAmount, schedule.currency)})` :
                               "En attente"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Aucun échéancier défini</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment History */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Historique des paiements</CardTitle>
                </CardHeader>
                <CardContent>
                  {student.payments && student.payments.length > 0 ? (
                    <div className="space-y-3">
                      {student.payments.map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between p-3 rounded-lg border"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                              <CheckCircle2 className="h-5 w-5 text-success" />
                            </div>
                            <div>
                              <p className="font-medium">
                                {payment.paymentMethod === "BANK_TRANSFER" ? "Virement" :
                                 payment.paymentMethod === "CARD" ? "Carte" :
                                 payment.paymentMethod === "CASH" ? "Espèces" :
                                 payment.paymentMethod === "CHECK" ? "Chèque" :
                                 payment.paymentMethod}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(new Date(payment.paymentDate))}
                                {payment.referenceNumber && ` • Réf: ${payment.referenceNumber}`}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-success">
                              +{formatCurrency(payment.amount, payment.currency)}
                            </p>
                            <Badge variant={payment.status === "VALIDATED" ? "success" : "secondary"}>
                              {payment.status === "VALIDATED" ? "Validé" : payment.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Aucun paiement enregistré</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Edit Student Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le profil</DialogTitle>
            <DialogDescription>
              Modifiez les informations de l&apos;étudiant
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Personal Info */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Informations personnelles
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prénom</Label>
                  <Input
                    id="firstName"
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom</Label>
                  <Input
                    id="lastName"
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nationality">Nationalité</Label>
                  <Input
                    id="nationality"
                    value={editForm.nationality}
                    onChange={(e) => setEditForm({ ...editForm, nationality: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currentFormation">Formation actuelle</Label>
                  <Input
                    id="currentFormation"
                    value={editForm.currentFormation}
                    onChange={(e) => setEditForm({ ...editForm, currentFormation: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="programType">Type de programme</Label>
                  <Select
                    value={editForm.programType}
                    onValueChange={(value) => setEditForm({ ...editForm, programType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MASTER">Master</SelectItem>
                      <SelectItem value="BACHELOR">Bachelor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedinUrl">LinkedIn</Label>
                <Input
                  id="linkedinUrl"
                  value={editForm.linkedinUrl}
                  onChange={(e) => setEditForm({ ...editForm, linkedinUrl: e.target.value })}
                  placeholder="https://linkedin.com/in/..."
                />
              </div>
            </div>

            <Separator />

            {/* Team */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Équipe
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mentorId">Mentor</Label>
                  <Select
                    value={editForm.mentorId || "_none"}
                    onValueChange={(value) => setEditForm({ ...editForm, mentorId: value === "_none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un mentor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Aucun</SelectItem>
                      {mentors.map((mentor) => (
                        <SelectItem key={mentor.id} value={mentor.id}>
                          {mentor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="professorQuantId">Professeur Quant</Label>
                    <Select
                      value={editForm.professorQuantId || "_none"}
                      onValueChange={(value) => setEditForm({ ...editForm, professorQuantId: value === "_none" ? "" : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Aucun</SelectItem>
                        {professors.filter(p => p.type === "QUANT").map((prof) => (
                          <SelectItem key={prof.id} value={prof.id}>
                            {prof.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="professorVerbalId">Professeur Verbal</Label>
                    <Select
                      value={editForm.professorVerbalId || "_none"}
                      onValueChange={(value) => setEditForm({ ...editForm, professorVerbalId: value === "_none" ? "" : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Aucun</SelectItem>
                        {professors.filter(p => p.type === "VERBAL").map((prof) => (
                          <SelectItem key={prof.id} value={prof.id}>
                            {prof.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Status */}
            <div className="space-y-4">
              <h3 className="font-medium">Statut</h3>
              <Select
                value={editForm.status}
                onValueChange={(value) => setEditForm({ ...editForm, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EN_DEMARRAGE">En démarrage</SelectItem>
                  <SelectItem value="EN_COURS">En cours</SelectItem>
                  <SelectItem value="FINALISE">Finalisé</SelectItem>
                  <SelectItem value="EN_PAUSE">En pause</SelectItem>
                  <SelectItem value="SUSPENDU">Suspendu</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Internal Notes */}
            <div className="space-y-4">
              <h3 className="font-medium">Notes internes</h3>
              <Textarea
                value={editForm.internalNotes}
                onChange={(e) => setEditForm({ ...editForm, internalNotes: e.target.value })}
                placeholder="Notes visibles uniquement par l'équipe..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveStudent} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation Dialog */}
      <AlertDialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Désactiver cet étudiant ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action désactivera le compte de {student.user.name || student.user.email}.
              L&apos;étudiant ne pourra plus se connecter et son statut sera mis à &quot;Suspendu&quot;.
              Cette action peut être annulée en modifiant le statut de l&apos;étudiant.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivateStudent}
              className="bg-error hover:bg-error/90"
              disabled={deactivating}
            >
              {deactivating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Désactiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
