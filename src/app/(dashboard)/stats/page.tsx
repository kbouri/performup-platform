"use client";

import { useState, useEffect } from "react";
import {
  Users,
  TrendingUp,
  TrendingDown,
  DollarSign,
  GraduationCap,
  UserCheck,
  BookOpen,
  Building2,
  PieChart,
  BarChart3,
  Activity,
  Target,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface Stats {
  students: {
    total: number;
    active: number;
    newThisMonth: number;
    newLastMonth: number;
    growthRate: number;
    byStatus: { status: string; count: number }[];
    byProgram: { program: string; count: number }[];
  };
  team: {
    totalMentors: number;
    activeMentors: number;
    totalProfessors: number;
    activeProfessors: number;
    totalExecutiveChefs: number;
    avgStudentsPerMentor: number;
  };
  financial: {
    revenueThisMonth: number;
    revenueLastMonth: number;
    revenueThisYear: number;
    paymentsCountThisMonth: number;
    pendingAmount: number;
    pendingCount: number;
    revenueGrowth: number;
  };
  essays: {
    total: number;
    byStatus: { status: string; count: number }[];
  };
  schools: {
    total: number;
    applicationsByStatus: { status: string; count: number }[];
  };
  charts: {
    monthlyEnrollments: { month: string; count: number }[];
    monthlyRevenue: { month: string; amount: number }[];
    topPacks: { name: string; count: number }[];
    mentorWorkload: { name: string; students: number }[];
  };
  kpis: {
    conversionRate: number;
    avgStudentsPerMentor: number;
    totalRevenue: number;
  };
}

const statusLabels: Record<string, string> = {
  EN_DEMARRAGE: "En démarrage",
  EN_COURS: "En cours",
  TERMINE: "Terminé",
  ABANDONNE: "Abandonné",
  DRAFT: "Brouillon",
  IN_PROGRESS: "En cours",
  REVIEW: "En révision",
  FINAL: "Final",
  SUBMITTED: "Soumis",
  TARGET: "Cible",
  APPLIED: "Candidature envoyée",
  INTERVIEW: "Entretien",
  ADMITTED: "Admis",
  REJECTED: "Refusé",
  WAITLISTED: "Liste d'attente",
};

const statusColors: Record<string, string> = {
  EN_DEMARRAGE: "bg-yellow-500",
  EN_COURS: "bg-blue-500",
  TERMINE: "bg-green-500",
  ABANDONNE: "bg-red-500",
  DRAFT: "bg-gray-400",
  IN_PROGRESS: "bg-blue-500",
  REVIEW: "bg-orange-500",
  FINAL: "bg-green-500",
  SUBMITTED: "bg-purple-500",
  TARGET: "bg-blue-400",
  APPLIED: "bg-indigo-500",
  INTERVIEW: "bg-amber-500",
  ADMITTED: "bg-green-500",
  REJECTED: "bg-red-500",
  WAITLISTED: "bg-orange-400",
};

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setError(null);
      const response = await fetch("/api/admin/stats");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || "Erreur inconnue");
      }

      setStats(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur inconnue";
      console.error("Error:", errorMessage);
      setError(errorMessage);
      toast.error("Erreur lors du chargement des statistiques");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-muted-foreground">Impossible de charger les statistiques</p>
        {error && (
          <p className="text-sm text-red-500 max-w-md text-center">{error}</p>
        )}
        <Button onClick={() => { setLoading(true); fetchStats(); }} variant="outline">
          Réessayer
        </Button>
      </div>
    );
  }

  const maxEnrollment = Math.max(...stats.charts.monthlyEnrollments.map((e) => e.count), 1);
  const maxRevenue = Math.max(...stats.charts.monthlyRevenue.map((r) => r.amount), 1);
  const maxPackCount = Math.max(...stats.charts.topPacks.map((p) => p.count), 1);
  const maxWorkload = Math.max(...stats.charts.mentorWorkload.map((m) => m.students), 1);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Statistiques</h1>
        <p className="text-muted-foreground">
          Vue d'ensemble des performances de la plateforme
        </p>
      </div>

      {/* KPIs principaux */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90">
              Étudiants actifs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{stats.students.active}</div>
                <p className="text-xs opacity-75">sur {stats.students.total} total</p>
              </div>
              <Users className="h-10 w-10 opacity-50" />
            </div>
            <div className="mt-2 flex items-center text-xs">
              {stats.students.growthRate >= 0 ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              <span>
                {stats.students.growthRate >= 0 ? "+" : ""}
                {stats.students.growthRate}% ce mois
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90">
              Revenus ce mois
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">
                  {stats.financial.revenueThisMonth.toLocaleString("fr-FR")} €
                </div>
                <p className="text-xs opacity-75">
                  {stats.financial.paymentsCountThisMonth} paiements
                </p>
              </div>
              <DollarSign className="h-10 w-10 opacity-50" />
            </div>
            <div className="mt-2 flex items-center text-xs">
              {stats.financial.revenueGrowth >= 0 ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              <span>
                {stats.financial.revenueGrowth >= 0 ? "+" : ""}
                {stats.financial.revenueGrowth}% vs mois dernier
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90">
              Taux de conversion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{stats.kpis.conversionRate}%</div>
                <p className="text-xs opacity-75">étudiants actifs / total</p>
              </div>
              <Target className="h-10 w-10 opacity-50" />
            </div>
            <div className="mt-2">
              <div className="w-full bg-white/20 rounded-full h-2">
                <div
                  className="bg-white h-2 rounded-full transition-all"
                  style={{ width: `${stats.kpis.conversionRate}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90">
              Paiements en attente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">
                  {stats.financial.pendingAmount.toLocaleString("fr-FR")} €
                </div>
                <p className="text-xs opacity-75">
                  {stats.financial.pendingCount} paiements
                </p>
              </div>
              <Activity className="h-10 w-10 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="students">Étudiants</TabsTrigger>
          <TabsTrigger value="financial">Financier</TabsTrigger>
          <TabsTrigger value="team">Équipe</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Évolution des inscriptions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Inscriptions mensuelles
                </CardTitle>
                <CardDescription>12 derniers mois</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.charts.monthlyEnrollments.map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-16">
                        {item.month}
                      </span>
                      <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all flex items-center justify-end pr-2"
                          style={{ width: `${(item.count / maxEnrollment) * 100}%` }}
                        >
                          {item.count > 0 && (
                            <span className="text-xs text-white font-medium">
                              {item.count}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Évolution des revenus */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Revenus mensuels
                </CardTitle>
                <CardDescription>12 derniers mois</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.charts.monthlyRevenue.map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-16">
                        {item.month}
                      </span>
                      <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all flex items-center justify-end pr-2"
                          style={{ width: `${(item.amount / maxRevenue) * 100}%` }}
                        >
                          {item.amount > 0 && (
                            <span className="text-xs text-white font-medium">
                              {item.amount.toLocaleString("fr-FR")}€
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top packs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Packs les plus vendus
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.charts.topPacks.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    Aucun pack vendu
                  </p>
                ) : (
                  <div className="space-y-4">
                    {stats.charts.topPacks.map((pack, i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{pack.name}</span>
                          <Badge variant="secondary">{pack.count} ventes</Badge>
                        </div>
                        <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                            style={{ width: `${(pack.count / maxPackCount) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Charge des mentors */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Charge des mentors
                </CardTitle>
                <CardDescription>Nombre d'étudiants par mentor</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.charts.mentorWorkload.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    Aucun mentor actif
                  </p>
                ) : (
                  <div className="space-y-4">
                    {stats.charts.mentorWorkload.map((mentor, i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate max-w-[200px]">
                            {mentor.name}
                          </span>
                          <Badge variant="outline">{mentor.students} étudiants</Badge>
                        </div>
                        <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all"
                            style={{ width: `${(mentor.students / maxWorkload) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total étudiants</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.students.total}</div>
                <p className="text-xs text-muted-foreground">
                  +{stats.students.newThisMonth} ce mois
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Étudiants actifs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {stats.students.active}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.kpis.conversionRate}% du total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Moyenne par mentor</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {stats.kpis.avgStudentsPerMentor}
                </div>
                <p className="text-xs text-muted-foreground">étudiants/mentor</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Répartition par statut</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.students.byStatus.map((item, i) => {
                    const percentage = stats.students.total > 0
                      ? Math.round((item.count / stats.students.total) * 100)
                      : 0;
                    return (
                      <div key={i} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">
                            {statusLabels[item.status] || item.status}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {item.count} ({percentage}%)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${statusColors[item.status] || "bg-gray-500"}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Répartition par programme</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.students.byProgram.map((item, i) => {
                    const percentage = stats.students.total > 0
                      ? Math.round((item.count / stats.students.total) * 100)
                      : 0;
                    return (
                      <div key={i} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">{item.program || "Non défini"}</span>
                          <span className="text-sm text-muted-foreground">
                            {item.count} ({percentage}%)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Revenus ce mois</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {stats.financial.revenueThisMonth.toLocaleString("fr-FR")} €
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Revenus mois dernier</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.financial.revenueLastMonth.toLocaleString("fr-FR")} €
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Revenus cette année</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {stats.financial.revenueThisYear.toLocaleString("fr-FR")} €
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">En attente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                  {stats.financial.pendingAmount.toLocaleString("fr-FR")} €
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.financial.pendingCount} paiements
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Évolution des revenus</CardTitle>
              <CardDescription>Comparaison mois par mois</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.charts.monthlyRevenue.map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-20">
                      {item.month}
                    </span>
                    <div className="flex-1 h-8 bg-muted rounded-lg overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-lg transition-all flex items-center justify-end pr-3"
                        style={{ width: `${Math.max((item.amount / maxRevenue) * 100, 5)}%` }}
                      >
                        <span className="text-xs text-white font-medium">
                          {item.amount.toLocaleString("fr-FR")} €
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Mentors</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.team.activeMentors}</div>
                <p className="text-xs text-muted-foreground">
                  sur {stats.team.totalMentors} total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Professeurs</CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.team.activeProfessors}</div>
                <p className="text-xs text-muted-foreground">
                  sur {stats.team.totalProfessors} total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Chefs Exécutifs</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.team.totalExecutiveChefs}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Ratio étudiants/mentor</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.team.avgStudentsPerMentor}</div>
                <p className="text-xs text-muted-foreground">en moyenne</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Charge de travail des mentors</CardTitle>
              <CardDescription>Distribution des étudiants par mentor</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.charts.mentorWorkload.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aucun mentor avec des étudiants
                </p>
              ) : (
                <div className="space-y-4">
                  {stats.charts.mentorWorkload.map((mentor, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="w-40 truncate">
                        <span className="text-sm font-medium">{mentor.name}</span>
                      </div>
                      <div className="flex-1 h-8 bg-muted rounded-lg overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-lg transition-all flex items-center px-3"
                          style={{ width: `${(mentor.students / maxWorkload) * 100}%` }}
                        >
                          <span className="text-xs text-white font-medium">
                            {mentor.students} étudiants
                          </span>
                        </div>
                      </div>
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
