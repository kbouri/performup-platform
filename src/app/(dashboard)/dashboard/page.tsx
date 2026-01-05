"use client";

import { useSession } from "@/lib/auth-client";
import { PageHeader } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatRelativeTime, formatCurrency, getRoleDisplayName } from "@/lib/utils";
import {
  Calendar,
  FileText,
  PenTool,
  Users,
  TrendingUp,
  Clock,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  Target,
  Bell,
  Play,
} from "lucide-react";
import Link from "next/link";

// Mock data for the dashboard
const upcomingEvents = [
  {
    id: "1",
    title: "Cours Quantitatif",
    type: "COURS_QUANT",
    startTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
    instructor: "Prof. Martin",
  },
  {
    id: "2",
    title: "Session Mentor",
    type: "SESSION_MENTOR",
    startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
    instructor: "Sophie Dubois",
  },
  {
    id: "3",
    title: "Cours Verbal",
    type: "COURS_VERBAL",
    startTime: new Date(Date.now() + 48 * 60 * 60 * 1000),
    instructor: "Prof. Laurent",
  },
];

const pendingTasks = [
  {
    id: "1",
    title: "Finaliser essay HEC",
    category: "ESSAY",
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    priority: "high",
  },
  {
    id: "2",
    title: "Exercices Quant - Chapitre 5",
    category: "QUANT",
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    priority: "medium",
  },
  {
    id: "3",
    title: "Réviser vocabulaire GMAT",
    category: "VERBAL",
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    priority: "low",
  },
];

const notifications = [
  {
    id: "1",
    title: "Nouveau message de votre mentor",
    message: "Sophie a commenté votre essay ESSEC",
    time: new Date(Date.now() - 30 * 60 * 1000),
    read: false,
  },
  {
    id: "2",
    title: "Rappel de cours",
    message: "Cours de Quant dans 2 heures",
    time: new Date(Date.now() - 2 * 60 * 60 * 1000),
    read: true,
  },
];

export default function DashboardPage() {
  const { data: session } = useSession();
  const user = session?.user as { id: string; name: string; email: string; image?: string | null; role?: string } | undefined;
  const isAdmin = user?.role === "ADMIN";
  const isMentor = user?.role === "MENTOR";
  const isStudent = user?.role === "STUDENT";

  const getEventColor = (type: string) => {
    switch (type) {
      case "COURS_QUANT":
        return "quant";
      case "COURS_VERBAL":
        return "verbal";
      case "SESSION_MENTOR":
        return "mentor";
      default:
        return "default";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "QUANT":
        return "quant";
      case "VERBAL":
        return "verbal";
      case "ESSAY":
        return "gold";
      default:
        return "secondary";
    }
  };

  return (
    <>
      <PageHeader
        title={`Bonjour, ${user?.name?.split(" ")[0] || ""}${"\u00A0"}!`}
        description={`Voici un aperçu de votre espace ${getRoleDisplayName(user?.role || "")}`}
      />

      <div className="space-y-6">
        {/* Stats cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {isAdmin && (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Étudiants actifs
                  </CardTitle>
                  <Users className="h-4 w-4 text-performup-blue" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-display">42</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="text-success">+3</span> ce mois
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Revenus du mois
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-display">
                    {formatCurrency(1250000)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="text-success">+12</span> vs mois dernier
                  </p>
                </CardContent>
              </Card>
            </>
          )}

          {(isStudent || isMentor) && (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Progression globale
                  </CardTitle>
                  <Target className="h-4 w-4 text-performup-gold" />
                </CardHeader>
                <CardContent>
                  <Progress value={68} showEncouragement={false} />
                  <p className="text-xs text-muted-foreground mt-2">
                    Tu avances bien !
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Essays complétés
                  </CardTitle>
                  <PenTool className="h-4 w-4 text-performup-blue" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-display">4/8</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    2 en cours de révision
                  </p>
                </CardContent>
              </Card>
            </>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Cours cette semaine
              </CardTitle>
              <Calendar className="h-4 w-4 text-calendar-quant" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display">6</div>
              <p className="text-xs text-muted-foreground mt-1">
                Prochain: aujourd&apos;hui 14h
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tâches à faire
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-display">3</div>
              <p className="text-xs text-muted-foreground mt-1">
                1 urgente
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main content grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Upcoming events */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Prochains événements</CardTitle>
                <CardDescription>Vos cours et sessions à venir</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/planning">
                  Voir tout <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-accent/50"
                  >
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-lg bg-calendar-${getEventColor(event.type)}/10`}
                    >
                      {event.type === "COURS_QUANT" && (
                        <BookOpen className={`h-6 w-6 text-calendar-${getEventColor(event.type)}`} />
                      )}
                      {event.type === "COURS_VERBAL" && (
                        <FileText className={`h-6 w-6 text-calendar-${getEventColor(event.type)}`} />
                      )}
                      {event.type === "SESSION_MENTOR" && (
                        <Users className={`h-6 w-6 text-calendar-${getEventColor(event.type)}`} />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{event.title}</span>
                        <Badge variant={getEventColor(event.type) as "quant" | "verbal" | "mentor"}>
                          {event.type.replace("_", " ")}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(event.startTime, {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span>avec {event.instructor}</span>
                      </div>
                    </div>
                    <Button size="sm" variant="secondary">
                      <Play className="mr-1 h-3 w-3" />
                      Rejoindre
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Restez informé</CardDescription>
              </div>
              <Button variant="ghost" size="icon-sm">
                <Bell className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`flex gap-3 rounded-lg p-3 transition-colors ${
                      notif.read ? "opacity-60" : "bg-performup-blue/5"
                    }`}
                  >
                    <div
                      className={`mt-1 h-2 w-2 rounded-full ${
                        notif.read ? "bg-muted-foreground" : "bg-performup-blue"
                      }`}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{notif.title}</p>
                      <p className="text-xs text-muted-foreground">{notif.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatRelativeTime(notif.time)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Tâches à faire</CardTitle>
              <CardDescription>Gérez vos priorités</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/tasks">
                Voir tout <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-accent/50"
                >
                  <div
                    className={`h-3 w-3 rounded-full ${
                      task.priority === "high"
                        ? "bg-error"
                        : task.priority === "medium"
                        ? "bg-warning"
                        : "bg-muted-foreground"
                    }`}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{task.title}</span>
                      <Badge variant={getCategoryColor(task.category) as "quant" | "verbal" | "gold" | "secondary"}>
                        {task.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Échéance: {formatDate(task.dueDate, { weekday: "short", day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <Button size="sm" variant="outline">
                    Commencer
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

