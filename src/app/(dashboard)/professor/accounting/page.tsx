"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ClipboardList,
  CreditCard,
  TrendingUp,
  Loader2,
  CheckCircle,
  Clock,
  XCircle,
  Banknote,
  Calendar,
  User,
  GraduationCap,
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
  student: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  paymentDate: string;
  notes: string | null;
}

interface Summary {
  totalEarned: number;
  pendingAmount: number;
  validatedAmount: number;
  missionCount: number;
  pendingMissions: number;
  validatedMissions: number;
  paidMissions: number;
  paymentCount: number;
}

interface ProfessorInfo {
  id: string;
  name: string;
  email: string;
  type: string | null;
  hourlyRate: number | null;
}

interface AccountingData {
  professor: ProfessorInfo;
  missions: Mission[];
  payments: Payment[];
  summary: Summary;
  revenueByMonth: Record<string, number>;
}

export default function ProfessorAccountingPage() {
  const [data, setData] = useState<AccountingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/professor/accounting");
        if (res.ok) {
          const accountingData = await res.json();
          setData(accountingData);
        }
      } catch (error) {
        console.error("Error fetching accounting data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const formatAmount = (amount: number, currency: string = "EUR") => {
    const formatted = (amount / 100).toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${formatted} ${currency}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return (
          <Badge variant="success" className="gap-1">
            <Banknote className="h-3 w-3" />
            Paye
          </Badge>
        );
      case "VALIDATED":
        return (
          <Badge variant="default" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            Valide
          </Badge>
        );
      case "PENDING":
        return (
          <Badge variant="warning" className="gap-1">
            <Clock className="h-3 w-3" />
            En attente
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge variant="error" className="gap-1">
            <XCircle className="h-3 w-3" />
            Annule
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getProfessorTypeLabel = (type: string | null) => {
    switch (type) {
      case "GMAT":
        return "GMAT";
      case "TOEFL":
        return "TOEFL";
      case "TOEIC":
        return "TOEIC";
      case "SAT":
        return "SAT";
      case "GRE":
        return "GRE";
      case "IELTS":
        return "IELTS";
      case "DELF":
        return "DELF";
      default:
        return type || "General";
    }
  };

  const getMonthName = (monthKey: string) => {
    const [year, month] = monthKey.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <>
        <PageHeader
          title="Comptabilite"
          description="Consultez vos cours, paiements et revenus"
          breadcrumbs={[{ label: "Professeur" }, { label: "Comptabilite" }]}
        />
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Impossible de charger les donnees comptables
          </CardContent>
        </Card>
      </>
    );
  }

  // Sort months for chart
  const sortedMonths = Object.keys(data.revenueByMonth).sort();
  const maxRevenue = Math.max(...Object.values(data.revenueByMonth), 1);

  return (
    <>
      <PageHeader
        title="Comptabilite"
        description="Consultez vos cours, paiements et revenus"
        breadcrumbs={[{ label: "Professeur" }, { label: "Comptabilite" }]}
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold font-display text-success">
              {formatAmount(data.summary.totalEarned)}
            </div>
            <p className="text-sm text-muted-foreground">Total percu</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold font-display text-primary">
              {formatAmount(data.summary.validatedAmount)}
            </div>
            <p className="text-sm text-muted-foreground">Valide (a payer)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold font-display text-warning">
              {formatAmount(data.summary.pendingAmount)}
            </div>
            <p className="text-sm text-muted-foreground">En attente de validation</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold font-display">
              {data.summary.missionCount}
            </div>
            <p className="text-sm text-muted-foreground">
              Cours ({data.summary.paidMissions} payes)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Professor Info */}
      <div className="mb-6 flex items-center gap-3 rounded-lg border bg-muted/50 p-4">
        <GraduationCap className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium">{data.professor.name}</p>
            <Badge variant="outline">{getProfessorTypeLabel(data.professor.type)}</Badge>
          </div>
          {data.professor.hourlyRate && (
            <p className="text-sm text-muted-foreground">
              Taux horaire: {formatAmount(data.professor.hourlyRate)}
            </p>
          )}
        </div>
      </div>

      <Tabs defaultValue="missions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="missions">
            <ClipboardList className="mr-2 h-4 w-4" />
            Cours
          </TabsTrigger>
          <TabsTrigger value="payments">
            <CreditCard className="mr-2 h-4 w-4" />
            Paiements
          </TabsTrigger>
          <TabsTrigger value="revenue">
            <TrendingUp className="mr-2 h-4 w-4" />
            Revenus
          </TabsTrigger>
        </TabsList>

        {/* Missions/Cours Tab */}
        <TabsContent value="missions" className="space-y-4">
          {data.missions.length > 0 ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Mes cours</CardTitle>
                  <div className="text-sm text-muted-foreground">
                    {data.summary.paidMissions} payes / {data.summary.validatedMissions} valides / {data.summary.pendingMissions} en attente
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {data.missions.map((mission) => (
                    <div
                      key={mission.id}
                      className="flex items-start gap-4 p-4"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <GraduationCap className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{mission.title}</span>
                          {getStatusBadge(mission.status)}
                        </div>
                        {mission.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                            {mission.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatShortDate(mission.date)}
                          </span>
                          {mission.hoursWorked && (
                            <span>{mission.hoursWorked}h</span>
                          )}
                          {mission.student && (
                            <span className="flex items-center gap-1">
                              <User className="h-3.5 w-3.5" />
                              {mission.student.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {formatAmount(mission.amount, mission.currency)}
                        </p>
                        {mission.validatedAt && (
                          <p className="text-xs text-muted-foreground">
                            Valide le {formatShortDate(mission.validatedAt)}
                          </p>
                        )}
                        {mission.paidAt && (
                          <p className="text-xs text-success">
                            Paye le {formatShortDate(mission.paidAt)}
                          </p>
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
                <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">
                  Aucun cours enregistre
                </p>
                <p className="text-sm text-muted-foreground">
                  Vos cours apparaitront ici une fois crees
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          {data.payments.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Historique des paiements</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {data.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center gap-4 p-4"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                        <Banknote className="h-5 w-5 text-success" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">
                          {formatAmount(payment.amount, payment.currency)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(payment.paymentDate)}
                          {payment.notes && ` - ${payment.notes}`}
                        </p>
                      </div>
                      <Badge variant="success">Percu</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <CreditCard className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">
                  Aucun paiement enregistre
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenus des 6 derniers mois</CardTitle>
            </CardHeader>
            <CardContent>
              {sortedMonths.length > 0 ? (
                <div className="space-y-4">
                  {/* Simple bar chart */}
                  <div className="flex items-end gap-2 h-48">
                    {sortedMonths.map((month) => {
                      const value = data.revenueByMonth[month] || 0;
                      const height = (value / maxRevenue) * 100;
                      return (
                        <div key={month} className="flex-1 flex flex-col items-center gap-2">
                          <div className="w-full flex flex-col items-center">
                            <span className="text-xs font-medium mb-1">
                              {formatAmount(value)}
                            </span>
                            <div
                              className="w-full bg-primary rounded-t-md transition-all"
                              style={{ height: `${Math.max(height, 4)}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {getMonthName(month)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <p className="text-sm text-muted-foreground">Total sur la periode</p>
                      <p className="text-xl font-bold font-display">
                        {formatAmount(Object.values(data.revenueByMonth).reduce((a, b) => a + b, 0))}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Moyenne mensuelle</p>
                      <p className="text-xl font-bold font-display">
                        {formatAmount(
                          sortedMonths.length > 0
                            ? Object.values(data.revenueByMonth).reduce((a, b) => a + b, 0) / sortedMonths.length
                            : 0
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-muted-foreground">
                    Aucune donnee de revenus disponible
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Les revenus apparaitront ici une fois les paiements recus
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Statistiques</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10">
                      <Banknote className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{data.summary.paidMissions}</p>
                      <p className="text-sm text-muted-foreground">Cours payes</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <CheckCircle className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{data.summary.validatedMissions}</p>
                      <p className="text-sm text-muted-foreground">A payer</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10">
                      <Clock className="h-5 w-5 text-warning" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{data.summary.pendingMissions}</p>
                      <p className="text-sm text-muted-foreground">En attente</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
