"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
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
}

export default function StudentDetailPage() {
  const params = useParams<{ id: string }>();
  const [student, setStudent] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
                <DropdownMenuItem>
                  <Edit className="mr-2 h-4 w-4" />
                  Modifier
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Mail className="mr-2 h-4 w-4" />
                  Envoyer un email
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-error">
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
      </Tabs>
        </div>
      </div>
    </>
  );
}
