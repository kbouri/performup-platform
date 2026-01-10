"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  FileText,
  Calendar,
  CreditCard,
  Loader2,
  CheckCircle,
  Clock,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";

interface Pack {
  id: string;
  name: string;
  description: string | null;
  customPrice: number;
  status: string;
}

interface QuoteItem {
  id: string;
  amount: number;
  description: string | null;
  packName: string;
}

interface Quote {
  id: string;
  quoteNumber: string;
  totalAmount: number;
  currency: string;
  paymentCurrency: string | null;
  status: string;
  validatedAt: string | null;
  items: QuoteItem[];
}

interface Schedule {
  id: string;
  amount: number;
  currency: string;
  dueDate: string;
  status: string;
  paidAmount: number;
  remaining: number;
  paidDate: string | null;
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  paymentDate: string;
  notes: string | null;
}

interface Summary {
  totalAmount: number;
  totalPaid: number;
  remaining: number;
  percentPaid: number;
  scheduleCount: number;
  paidSchedules: number;
  pendingSchedules: number;
  partialSchedules: number;
  overdueSchedules: number;
  paymentCount: number;
}

interface AccountingData {
  packs: Pack[];
  quote: Quote | null;
  schedules: Schedule[];
  payments: Payment[];
  summary: Summary;
}

export default function StudentAccountingPage() {
  const [data, setData] = useState<AccountingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/student/accounting");
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

  const formatAmount = (amount: number, currency: string) => {
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return (
          <Badge variant="success" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            Paye
          </Badge>
        );
      case "PARTIAL":
        return (
          <Badge variant="warning" className="gap-1">
            <Clock className="h-3 w-3" />
            Partiel
          </Badge>
        );
      case "PENDING":
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            A venir
          </Badge>
        );
      case "OVERDUE":
        return (
          <Badge variant="error" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            En retard
          </Badge>
        );
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

  if (!data) {
    return (
      <>
        <PageHeader
          title="Comptabilite"
          description="Consultez votre devis, echeancier et historique de paiements"
          breadcrumbs={[{ label: "Etudiant" }, { label: "Comptabilite" }]}
        />
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Impossible de charger les donnees comptables
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Comptabilite"
        description="Consultez votre devis, echeancier et historique de paiements"
        breadcrumbs={[{ label: "Etudiant" }, { label: "Comptabilite" }]}
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold font-display">
              {formatAmount(data.summary.totalAmount, "EUR")}
            </div>
            <p className="text-sm text-muted-foreground">Total du devis</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold font-display text-success">
              {formatAmount(data.summary.totalPaid, "EUR")}
            </div>
            <p className="text-sm text-muted-foreground">Deja paye</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold font-display text-warning">
              {formatAmount(data.summary.remaining, "EUR")}
            </div>
            <p className="text-sm text-muted-foreground">Reste a payer</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progression</span>
                <span className="font-semibold">{data.summary.percentPaid}%</span>
              </div>
              <Progress value={data.summary.percentPaid} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertes */}
      {data.summary.overdueSchedules > 0 && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <div>
            <p className="font-medium text-destructive">
              {data.summary.overdueSchedules} echeance(s) en retard
            </p>
            <p className="text-sm text-muted-foreground">
              Veuillez regulariser votre situation au plus vite
            </p>
          </div>
        </div>
      )}

      <Tabs defaultValue="quote" className="space-y-4">
        <TabsList>
          <TabsTrigger value="quote">
            <FileText className="mr-2 h-4 w-4" />
            Mon devis
          </TabsTrigger>
          <TabsTrigger value="schedule">
            <Calendar className="mr-2 h-4 w-4" />
            Echeancier
          </TabsTrigger>
          <TabsTrigger value="payments">
            <CreditCard className="mr-2 h-4 w-4" />
            Historique
          </TabsTrigger>
        </TabsList>

        {/* Devis Tab */}
        <TabsContent value="quote" className="space-y-4">
          {data.quote ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Devis {data.quote.quoteNumber}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Valide le {data.quote.validatedAt && formatDate(data.quote.validatedAt)}
                    </p>
                  </div>
                  <Badge variant="success">Valide</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="divide-y rounded-lg border">
                    {data.quote.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-4"
                      >
                        <div>
                          <p className="font-medium">{item.packName}</p>
                          {item.description && (
                            <p className="text-sm text-muted-foreground">
                              {item.description}
                            </p>
                          )}
                        </div>
                        <span className="font-semibold">
                          {formatAmount(item.amount, data.quote!.currency)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between border-t pt-4">
                    <span className="text-lg font-semibold">Total</span>
                    <span className="text-2xl font-bold">
                      {formatAmount(data.quote.totalAmount, data.quote.currency)}
                    </span>
                  </div>

                  {data.quote.paymentCurrency &&
                    data.quote.paymentCurrency !== data.quote.currency && (
                      <p className="text-sm text-muted-foreground">
                        Paiements acceptes en {data.quote.paymentCurrency}
                      </p>
                    )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">
                  Aucun devis valide pour le moment
                </p>
                <p className="text-sm text-muted-foreground">
                  Votre devis sera disponible une fois valide par l&apos;administration
                </p>
              </CardContent>
            </Card>
          )}

          {/* Packs souscrits */}
          {data.packs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Mes packs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {data.packs.map((pack) => (
                    <div
                      key={pack.id}
                      className="rounded-lg border p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{pack.name}</p>
                          {pack.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {pack.description}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline">{pack.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Echeancier Tab */}
        <TabsContent value="schedule" className="space-y-4">
          {data.schedules.length > 0 ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Echeancier de paiement</CardTitle>
                  <div className="text-sm text-muted-foreground">
                    {data.summary.paidSchedules} / {data.summary.scheduleCount} echeances payees
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {data.schedules.map((schedule, index) => (
                    <div
                      key={schedule.id}
                      className={`flex items-center gap-4 p-4 ${
                        schedule.status === "OVERDUE" ? "bg-destructive/5" : ""
                      }`}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted font-semibold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {formatAmount(schedule.amount, schedule.currency)}
                          </span>
                          {getStatusBadge(schedule.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Echeance: {formatDate(schedule.dueDate)}
                          {schedule.paidDate && (
                            <span className="ml-2 text-success">
                              - Paye le {formatDate(schedule.paidDate)}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        {schedule.status === "PARTIAL" && (
                          <>
                            <p className="text-sm text-success">
                              Paye: {formatAmount(schedule.paidAmount, schedule.currency)}
                            </p>
                            <p className="text-sm text-warning">
                              Reste: {formatAmount(schedule.remaining, schedule.currency)}
                            </p>
                          </>
                        )}
                        {schedule.status === "PENDING" && (
                          <p className="text-sm text-muted-foreground">
                            A payer
                          </p>
                        )}
                        {schedule.status === "OVERDUE" && (
                          <p className="text-sm text-destructive font-medium">
                            A regulariser
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
                <Calendar className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">
                  Aucun echeancier defini pour le moment
                </p>
                <p className="text-sm text-muted-foreground">
                  L&apos;echeancier sera disponible une fois votre devis valide
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Historique Tab */}
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
                        <CreditCard className="h-5 w-5 text-success" />
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
                      <Badge variant="success">Valide</Badge>
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
      </Tabs>
    </>
  );
}
