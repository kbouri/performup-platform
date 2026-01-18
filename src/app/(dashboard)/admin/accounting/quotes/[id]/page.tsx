"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  User,
  Calendar,
  CheckCircle,
  XCircle,
  Send,
  Plus,
  CreditCard,
  AlertTriangle,
  Trash2,
  Sparkles,
} from "lucide-react";

interface QuoteItem {
  id: string;
  amount: number;
  description: string;
  packName: string;
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  paymentDate: string;
  status: string;
}

interface Schedule {
  id: string;
  amount: number;
  currency: string;
  actualCurrency: string | null;
  exchangeRate: number | null;
  dueDate: string;
  status: string;
  paidAmount: number;
  paidDate: string | null;
  payments: Payment[];
}

interface Quote {
  id: string;
  quoteNumber: string;
  totalAmount: number;
  currency: string;
  paymentCurrency: string | null;
  status: string;
  sentAt: string | null;
  validatedAt: string | null;
  rejectedAt: string | null;
  expiresAt: string | null;
  notes: string | null;
  createdAt: string;
  student: {
    id: string;
    userId: string;
    name: string;
    email: string;
    phone: string | null;
  };
  items: QuoteItem[];
  schedules: Schedule[];
  summary: {
    totalPaid: number;
    remaining: number;
    percentPaid: number;
    scheduleCount: number;
    paidSchedules: number;
  };
}

export default function QuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [submittingSchedule, setSubmittingSchedule] = useState(false);

  // Manual schedule entries
  const [scheduleEntries, setScheduleEntries] = useState<Array<{
    id: string;
    dueDate: string;
    amount: string;
  }>>([
    { id: "1", dueDate: new Date().toISOString().split("T")[0], amount: "" },
  ]);

  // Calculate totals for schedule entries
  const calculateScheduleTotals = () => {
    if (!quote) return { allocated: 0, remaining: quote?.totalAmount || 0 };

    const allocated = scheduleEntries.reduce((sum, entry) => {
      const amount = parseFloat(entry.amount) || 0;
      return sum + Math.round(amount * 100);
    }, 0);

    return {
      allocated,
      remaining: quote.totalAmount - allocated,
    };
  };

  const addScheduleEntry = () => {
    const lastEntry = scheduleEntries[scheduleEntries.length - 1];
    const lastDate = lastEntry ? new Date(lastEntry.dueDate) : new Date();
    lastDate.setMonth(lastDate.getMonth() + 1);

    setScheduleEntries([
      ...scheduleEntries,
      {
        id: String(Date.now()),
        dueDate: lastDate.toISOString().split("T")[0],
        amount: "",
      },
    ]);
  };

  const removeScheduleEntry = (id: string) => {
    if (scheduleEntries.length > 1) {
      setScheduleEntries(scheduleEntries.filter((e) => e.id !== id));
    }
  };

  const updateScheduleEntry = (id: string, field: "dueDate" | "amount", value: string) => {
    setScheduleEntries(
      scheduleEntries.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  const setLastEntryToRemaining = () => {
    if (!quote || scheduleEntries.length === 0) return;

    const totals = calculateScheduleTotals();
    const lastIndex = scheduleEntries.length - 1;
    const lastEntry = scheduleEntries[lastIndex];

    // Calculate remaining without the last entry
    const allocatedWithoutLast = scheduleEntries.slice(0, -1).reduce((sum, entry) => {
      const amount = parseFloat(entry.amount) || 0;
      return sum + Math.round(amount * 100);
    }, 0);

    const remainingForLast = quote.totalAmount - allocatedWithoutLast;

    setScheduleEntries(
      scheduleEntries.map((e, i) =>
        i === lastIndex
          ? { ...e, amount: (remainingForLast / 100).toFixed(2) }
          : e
      )
    );
  };

  const fetchQuote = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/accounting/quotes/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setQuote(data.quote);
      } else {
        router.push("/admin/accounting/quotes");
      }
    } catch (error) {
      console.error("Error fetching quote:", error);
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

  async function updateQuoteStatus(newStatus: string) {
    if (!quote) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/accounting/quotes/${quote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchQuote();
      } else {
        const error = await res.json();
        alert(error.error || "Erreur");
      }
    } catch (error) {
      console.error("Error updating quote:", error);
    } finally {
      setUpdating(false);
    }
  }

  async function generateSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (!quote) return;

    // Validate entries
    const totals = calculateScheduleTotals();
    if (Math.abs(totals.remaining) > 1) {
      alert(`Le total des echeances (${formatAmount(totals.allocated, quote.currency)}) ne correspond pas au montant du devis (${formatAmount(quote.totalAmount, quote.currency)}). Difference: ${formatAmount(totals.remaining, quote.currency)}`);
      return;
    }

    // Validate all entries have dates and amounts
    for (const entry of scheduleEntries) {
      if (!entry.dueDate || !entry.amount || parseFloat(entry.amount) <= 0) {
        alert("Chaque echeance doit avoir une date et un montant valide");
        return;
      }
    }

    setSubmittingSchedule(true);
    try {
      const res = await fetch(`/api/admin/accounting/quotes/${quote.id}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schedules: scheduleEntries.map((e) => ({
            dueDate: e.dueDate,
            amount: Math.round(parseFloat(e.amount) * 100),
          })),
        }),
      });
      if (res.ok) {
        setIsScheduleDialogOpen(false);
        setScheduleEntries([
          { id: "1", dueDate: new Date().toISOString().split("T")[0], amount: "" },
        ]);
        fetchQuote();
      } else {
        const error = await res.json();
        alert(error.error || "Erreur");
      }
    } catch (error) {
      console.error("Error generating schedule:", error);
    } finally {
      setSubmittingSchedule(false);
    }
  }

  const formatAmount = (amount: number, currency: string) => {
    return (amount / 100).toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " " + currency;
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
      case "DRAFT":
        return <Badge variant="secondary">Brouillon</Badge>;
      case "SENT":
        return <Badge variant="warning">Envoye</Badge>;
      case "VALIDATED":
        return <Badge variant="success">Valide</Badge>;
      case "REJECTED":
        return <Badge variant="error">Refuse</Badge>;
      case "EXPIRED":
        return <Badge variant="outline">Expire</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getScheduleStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="outline">A venir</Badge>;
      case "PARTIALLY_PAID":
        return <Badge variant="warning">Partiel</Badge>;
      case "PAID":
        return <Badge variant="success">Paye</Badge>;
      case "OVERDUE":
        return <Badge variant="error">En retard</Badge>;
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

  if (!quote) {
    return null;
  }

  return (
    <>
      <PageHeader
        title={`Devis ${quote.quoteNumber}`}
        description={`Devis pour ${quote.student.name}`}
        breadcrumbs={[
          { label: "Admin" },
          { label: "Comptabilite", href: "/admin/accounting" },
          { label: "Devis", href: "/admin/accounting/quotes" },
          { label: quote.quoteNumber },
        ]}
        actions={
          <div className="flex gap-2">
            {quote.status === "DRAFT" && (
              <Button
                variant="outline"
                onClick={() => updateQuoteStatus("SENT")}
                disabled={updating}
              >
                <Send className="mr-2 h-4 w-4" />
                Envoyer
              </Button>
            )}
            {quote.status === "SENT" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => updateQuoteStatus("REJECTED")}
                  disabled={updating}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Refuser
                </Button>
                <Button onClick={() => updateQuoteStatus("VALIDATED")} disabled={updating}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Valider
                </Button>
              </>
            )}
            {quote.status === "VALIDATED" && quote.schedules.length === 0 && (
              <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Generer echeancier
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Creer l&apos;echeancier</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={generateSchedule} className="space-y-4">
                    {/* Summary */}
                    <div className="bg-muted/50 p-3 rounded-lg text-sm">
                      <div className="flex justify-between">
                        <span>Total du devis:</span>
                        <strong>{formatAmount(quote.totalAmount, quote.currency)}</strong>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span>Alloue:</span>
                        <span className={calculateScheduleTotals().allocated > 0 ? "text-success font-medium" : ""}>
                          {formatAmount(calculateScheduleTotals().allocated, quote.currency)}
                        </span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span>Reste a allouer:</span>
                        <span className={calculateScheduleTotals().remaining !== 0 ? "text-warning font-medium" : "text-success font-medium"}>
                          {formatAmount(calculateScheduleTotals().remaining, quote.currency)}
                        </span>
                      </div>
                    </div>

                    {/* Schedule Entries */}
                    <div className="space-y-3">
                      <Label>Echeances ({scheduleEntries.length})</Label>
                      {scheduleEntries.map((entry, index) => (
                        <div key={entry.id} className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium shrink-0">
                            {index + 1}
                          </div>
                          <Input
                            type="date"
                            value={entry.dueDate}
                            onChange={(e) => updateScheduleEntry(entry.id, "dueDate", e.target.value)}
                            className="flex-1"
                          />
                          <div className="relative flex-1">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="Montant"
                              value={entry.amount}
                              onChange={(e) => updateScheduleEntry(entry.id, "amount", e.target.value)}
                              className="pr-12"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                              {quote.currency}
                            </span>
                          </div>
                          {scheduleEntries.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeScheduleEntry(entry.id)}
                              className="shrink-0"
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addScheduleEntry}
                        className="flex-1"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Ajouter echeance
                      </Button>
                      {scheduleEntries.length > 0 && calculateScheduleTotals().remaining > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={setLastEntryToRemaining}
                          className="flex-1"
                        >
                          <Sparkles className="mr-2 h-4 w-4" />
                          Reste sur derniere
                        </Button>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={submittingSchedule || Math.abs(calculateScheduleTotals().remaining) > 1}
                    >
                      {submittingSchedule ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Creer l'echeancier"
                      )}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column - Quote Details */}
        <div className="md:col-span-2 space-y-6">
          {/* Status Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {getStatusBadge(quote.status)}
                  <Badge variant="outline">{quote.currency}</Badge>
                  {quote.paymentCurrency && quote.paymentCurrency !== quote.currency && (
                    <Badge variant="secondary">Paiement en {quote.paymentCurrency}</Badge>
                  )}
                </div>
                <div className="text-2xl font-bold">
                  {formatAmount(quote.totalAmount, quote.currency)}
                </div>
              </div>
              {quote.summary.totalPaid > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Progression</span>
                    <span>{quote.summary.percentPaid}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-success h-2 rounded-full transition-all"
                      style={{ width: `${quote.summary.percentPaid}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Paye: {formatAmount(quote.summary.totalPaid, quote.currency)}</span>
                    <span>Reste: {formatAmount(quote.summary.remaining, quote.currency)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle>Packs inclus</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {quote.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4">
                    <div>
                      <div className="font-medium">{item.packName}</div>
                      {item.description && (
                        <div className="text-sm text-muted-foreground">{item.description}</div>
                      )}
                    </div>
                    <div className="font-semibold">
                      {formatAmount(item.amount, quote.currency)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Schedule */}
          {quote.schedules.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Echeancier</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    {quote.summary.paidSchedules}/{quote.summary.scheduleCount} payees
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {quote.schedules.map((schedule, index) => {
                    const isOverdue =
                      schedule.status !== "PAID" && new Date(schedule.dueDate) < new Date();
                    return (
                      <div
                        key={schedule.id}
                        className={`p-4 ${isOverdue ? "bg-error/5" : ""}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                              {index + 1}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{formatDate(schedule.dueDate)}</span>
                                {getScheduleStatusBadge(isOverdue && schedule.status !== "PAID" ? "OVERDUE" : schedule.status)}
                              </div>
                              {schedule.paidAmount > 0 && schedule.paidAmount < schedule.amount && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Paye: {formatAmount(schedule.paidAmount, schedule.currency)}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">
                              {formatAmount(schedule.amount, schedule.currency)}
                            </div>
                            {schedule.status === "PAID" && schedule.paidDate && (
                              <div className="text-xs text-success">
                                Paye le {formatDate(schedule.paidDate)}
                              </div>
                            )}
                          </div>
                        </div>
                        {isOverdue && schedule.status !== "PAID" && (
                          <div className="flex items-center gap-2 mt-2 text-xs text-error">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            En retard de{" "}
                            {Math.floor(
                              (new Date().getTime() - new Date(schedule.dueDate).getTime()) /
                                (1000 * 60 * 60 * 24)
                            )}{" "}
                            jours
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {quote.status === "VALIDATED" && quote.schedules.length === 0 && (
            <Card className="border-warning/50 bg-warning/5">
              <CardContent className="py-8 text-center">
                <CreditCard className="mx-auto h-12 w-12 text-warning" />
                <p className="mt-4 font-medium">Aucun echeancier</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Generez un echeancier pour suivre les paiements
                </p>
                <Button className="mt-4" onClick={() => setIsScheduleDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Generer echeancier
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Student & Dates */}
        <div className="space-y-6">
          {/* Student */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Etudiant
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="font-medium">{quote.student.name}</div>
                <div className="text-sm text-muted-foreground">{quote.student.email}</div>
                {quote.student.phone && (
                  <div className="text-sm text-muted-foreground">{quote.student.phone}</div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => router.push(`/students/${quote.student.id}`)}
                >
                  Voir le profil
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Dates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cree le</span>
                  <span>{formatDate(quote.createdAt)}</span>
                </div>
                {quote.sentAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Envoye le</span>
                    <span>{formatDate(quote.sentAt)}</span>
                  </div>
                )}
                {quote.validatedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valide le</span>
                    <span className="text-success">{formatDate(quote.validatedAt)}</span>
                  </div>
                )}
                {quote.rejectedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Refuse le</span>
                    <span className="text-error">{formatDate(quote.rejectedAt)}</span>
                  </div>
                )}
                {quote.expiresAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expire le</span>
                    <span>{formatDate(quote.expiresAt)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {quote.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{quote.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
