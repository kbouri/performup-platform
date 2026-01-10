"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { UserAvatar } from "@/components/ui/avatar";
import { authClient } from "@/lib/auth-client";
import {
  formatCurrency,
  formatDate,
  STUDENT_STATUS_DISPLAY,
  EVENT_TYPE_DISPLAY,
} from "@/lib/utils";
import {
  Users,
  Calendar,
  FileText,
  TrendingUp,
  Clock,
  ArrowRight,
  Plus,
  CheckCircle2,
  Target,
  Loader2,
  BookOpen,
  PenTool,
} from "lucide-react";

interface DashboardData {
  kpis: {
    totalStudents: number;
    activeStudents: number;
    totalMentors: number;
    totalProfessors: number;
    totalEssays: number;
    pendingTasks: number;
    upcomingEvents: number;
    totalRevenue: number;
    expectedRevenue: number;
  };
  recentStudents: Array<{
    id: string;
    name: string | null;
    email: string;
    status: string;
    packs: string[];
    createdAt: string;
  }>;
  nextEvents: Array<{
    id: string;
    title: string;
    eventType: string;
    startTime: string;
    student: string | null;
    instructor: string | null;
  }>;
  statusDistribution: Record<string, number>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("STUDENT");
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    async function fetchData() {
      try {
        // Get user info
        const session = await authClient.getSession();
        if (session?.data?.user) {
          setUserRole((session.data.user as { role?: string }).role || "STUDENT");
          setUserName((session.data.user as { name?: string }).name || "");
        }

        // Fetch dashboard data (admin only)
        if ((session?.data?.user as { role?: string })?.role === "ADMIN") {
          const response = await fetch("/api/admin/dashboard");
          if (response.ok) {
            const result = await response.json();
            setData(result);
          }
        }
      } catch (error) {
        console.error("Error fetching dashboard:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-performup-blue" />
      </div>
    );
  }

  // Admin Dashboard
  if (userRole === "ADMIN" && data) {
    return (
      <>
        <PageHeader
          title={`Bonjour${userName ? `, ${userName.split(" ")[0]}` : ""}`}
          description="Voici un aperçu de votre activité"
          breadcrumbs={[{ label: "Tableau de bord" }]}
          actions={
            <Button asChild>
              <Link href="/students/new">
                <Plus className="mr-2 h-4 w-4" />
                Nouvel étudiant
              </Link>
            </Button>
          }
        />

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-performup-blue/10">
                  <Users className="h-6 w-6 text-performup-blue" />
                </div>
                <div>
                  <div className="text-2xl font-bold font-display text-performup-blue">
                    {data.kpis.totalStudents}
                  </div>
                  <p className="text-sm text-muted-foreground">Étudiants</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10">
                  <TrendingUp className="h-6 w-6 text-success" />
                </div>
                <div>
                  <div className="text-2xl font-bold font-display text-success">
                    {formatCurrency(data.kpis.totalRevenue)}
                  </div>
                  <p className="text-sm text-muted-foreground">Revenus</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-calendar-quant/10">
                  <Calendar className="h-6 w-6 text-calendar-quant" />
                </div>
                <div>
                  <div className="text-2xl font-bold font-display text-calendar-quant">
                    {data.kpis.upcomingEvents}
                  </div>
                  <p className="text-sm text-muted-foreground">Événements à venir</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-warning/10">
                  <Clock className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <div className="text-2xl font-bold font-display text-warning">
                    {data.kpis.pendingTasks}
                  </div>
                  <p className="text-sm text-muted-foreground">Tâches en attente</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Students */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Derniers étudiants</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/students">
                    Voir tout <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {data.recentStudents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun étudiant
                </div>
              ) : (
                <div className="space-y-4">
                  {data.recentStudents.map((student) => {
                    const statusInfo = STUDENT_STATUS_DISPLAY[student.status] || {
                      label: student.status,
                      variant: "secondary",
                    };
                    return (
                      <div
                        key={student.id}
                        className="flex items-center gap-4"
                      >
                        <UserAvatar name={student.name || student.email} size="sm" />
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/students/${student.id}`}
                            className="font-medium hover:text-performup-blue transition-colors"
                          >
                            {student.name || student.email}
                          </Link>
                          <p className="text-sm text-muted-foreground truncate">
                            {student.packs.join(", ") || "Aucun pack"}
                          </p>
                        </div>
                        <Badge
                          variant={
                            statusInfo.variant as
                              | "success"
                              | "warning"
                              | "error"
                              | "secondary"
                          }
                        >
                          {statusInfo.label}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Prochains événements</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/planning">
                    Voir tout <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {data.nextEvents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun événement à venir
                </div>
              ) : (
                <div className="space-y-4">
                  {data.nextEvents.map((event) => {
                    const eventInfo = EVENT_TYPE_DISPLAY[event.eventType] || {
                      label: event.eventType,
                    };
                    return (
                      <div key={event.id} className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-calendar-quant/10">
                          <BookOpen className="h-5 w-5 text-calendar-quant" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{event.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {event.student} •{" "}
                            {formatDate(new Date(event.startTime), {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <Badge variant="outline">{eventInfo.label}</Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Répartition des statuts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(data.statusDistribution).map(([status, count]) => {
                  const statusInfo = STUDENT_STATUS_DISPLAY[status] || {
                    label: status,
                  };
                  const percentage = Math.round(
                    (count / data.kpis.totalStudents) * 100
                  );
                  return (
                    <div key={status}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>{statusInfo.label}</span>
                        <span className="text-muted-foreground">
                          {count} ({percentage || 0}%)
                        </span>
                      </div>
                      <Progress value={percentage} size="sm" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Aperçu rapide</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="text-2xl font-display font-semibold text-performup-blue">
                    {data.kpis.totalMentors}
                  </div>
                  <p className="text-sm text-muted-foreground">Mentors</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="text-2xl font-display font-semibold text-calendar-quant">
                    {data.kpis.totalProfessors}
                  </div>
                  <p className="text-sm text-muted-foreground">Professeurs</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="text-2xl font-display font-semibold text-performup-gold">
                    {data.kpis.totalEssays}
                  </div>
                  <p className="text-sm text-muted-foreground">Essays</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="text-2xl font-display font-semibold text-success">
                    {data.kpis.activeStudents}
                  </div>
                  <p className="text-sm text-muted-foreground">Actifs</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  // Default dashboard for other roles
  return (
    <>
      <PageHeader
        title={`Bonjour${userName ? `, ${userName.split(" ")[0]}` : ""}`}
        description="Voici un aperçu de votre activité"
        breadcrumbs={[{ label: "Tableau de bord" }]}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Actions rapides</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/planning">
                <Calendar className="mr-2 h-4 w-4" />
                Voir mon planning
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/tasks">
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Mes tâches
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/documents">
                <FileText className="mr-2 h-4 w-4" />
                Mes documents
              </Link>
            </Button>
            {(userRole === "MENTOR" || userRole === "STUDENT") && (
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/essays">
                  <PenTool className="mr-2 h-4 w-4" />
                  Essays
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Welcome Message */}
        <Card className="bg-gradient-to-br from-performup-blue/5 to-performup-gold/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-performup-blue/10">
                <Target className="h-8 w-8 text-performup-blue" />
              </div>
              <div>
                <h3 className="text-lg font-display font-semibold">
                  Bienvenue sur PerformUp
                </h3>
                <p className="text-sm text-muted-foreground">
                  Votre plateforme d&apos;accompagnement personnalisé
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Explorez les différentes sections pour accéder à vos cours, 
              documents et suivre votre progression.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
