"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout";
import { AccountingNav } from "@/components/accounting/accounting-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import {
  FileText,
  Loader2,
  Plus,
  ChevronRight,
  Users,
  CheckCircle,
  Clock,
  Send,
} from "lucide-react";

interface QuoteItem {
  id: string;
  amount: number;
  description: string;
  packName: string;
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
  expiresAt: string | null;
  notes: string | null;
  createdAt: string;
  student: {
    id: string;
    userId: string;
    name: string;
    email: string;
  };
  items: QuoteItem[];
  scheduleCount: number;
  paidAmount: number;
}

interface Stats {
  total: number;
  draft: number;
  sent: number;
  validated: number;
  totalAmount: number;
}

interface Student {
  id: string;
  name: string;
  email: string;
  hasPacks: boolean;
  hasQuote: boolean;
}

export default function QuotesPage() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, draft: 0, sent: 0, validated: 0, totalAmount: 0 });
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [createForm, setCreateForm] = useState({
    studentId: "",
    paymentCurrency: "",
    notes: "",
  });

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    try {
      const url = statusFilter !== "all"
        ? `/api/admin/accounting/quotes?status=${statusFilter}`
        : "/api/admin/accounting/quotes";

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setQuotes(data.quotes);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching quotes:", error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const fetchStudents = async () => {
    try {
      const res = await fetch("/api/students?limit=100");
      if (res.ok) {
        const data = await res.json();
        // Filter students who have packs and don't have a validated quote
        setStudents(data.students.map((s: {
          id: string;
          name: string | null;
          firstName?: string | null;
          lastName?: string | null;
          email: string;
          packs?: Array<{ status: string }>
        }) => ({
          id: s.id,
          name: s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.email,
          email: s.email,
          hasPacks: (s.packs?.filter(p => p.status === "active")?.length || 0) > 0,
          hasQuote: false, // Will be updated by quotes fetch
        })));
      }
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  };

  useEffect(() => {
    fetchQuotes();
    fetchStudents();
  }, [fetchQuotes]);

  async function handleCreateQuote(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/accounting/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: createForm.studentId,
          paymentCurrency: createForm.paymentCurrency || undefined,
          notes: createForm.notes || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setIsCreateDialogOpen(false);
        setCreateForm({ studentId: "", paymentCurrency: "", notes: "" });
        router.push(`/admin/accounting/quotes/${data.quote.id}`);
      } else {
        const error = await res.json();
        alert(error.error || "Erreur lors de la creation");
      }
    } catch (error) {
      console.error("Error creating quote:", error);
    } finally {
      setSubmitting(false);
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
      month: "short",
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

  // Filter students who can have a quote created
  const eligibleStudents = students.filter((s) => s.hasPacks);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Devis"
        description="Gestion des devis etudiants"
        breadcrumbs={[
          { label: "Admin" },
          { label: "Comptabilite", href: "/admin/accounting" },
          { label: "Devis" },
        ]}
        actions={
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nouveau devis
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Creer un devis</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateQuote} className="space-y-4">
                <div>
                  <Label>Etudiant</Label>
                  {eligibleStudents.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">
                      Aucun etudiant eligible. Assurez-vous qu&apos;un etudiant a au moins un pack actif.
                    </p>
                  ) : (
                    <Select
                      value={createForm.studentId}
                      onValueChange={(v) => setCreateForm({ ...createForm, studentId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selectionner un etudiant" />
                      </SelectTrigger>
                      <SelectContent>
                        {eligibleStudents.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} ({s.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Seuls les etudiants avec des packs actifs sont affiches
                  </p>
                </div>
                <div>
                  <Label>Devise de paiement (optionnel)</Label>
                  <Select
                    value={createForm.paymentCurrency}
                    onValueChange={(v) => setCreateForm({ ...createForm, paymentCurrency: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Meme que le devis (EUR)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">EUR (defaut)</SelectItem>
                      <SelectItem value="MAD">MAD</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Notes (optionnel)</Label>
                  <Textarea
                    value={createForm.notes}
                    onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                    placeholder="Notes internes..."
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting || !createForm.studentId}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Creer le devis"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <AccountingNav />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
            <p className="text-sm text-muted-foreground">Total devis</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{stats.draft}</span>
            </div>
            <p className="text-sm text-muted-foreground">Brouillons</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Send className="h-5 w-5 text-warning" />
              <span className="text-2xl font-bold">{stats.sent}</span>
            </div>
            <p className="text-sm text-muted-foreground">Envoyes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              <span className="text-2xl font-bold">{stats.validated}</span>
            </div>
            <p className="text-sm text-muted-foreground">Valides</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4 mb-4">
        <span className="text-sm text-muted-foreground">Statut:</span>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="DRAFT">Brouillons</SelectItem>
            <SelectItem value="SENT">Envoyes</SelectItem>
            <SelectItem value="VALIDATED">Valides</SelectItem>
            <SelectItem value="REJECTED">Refuses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Quotes List */}
      {quotes.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {quotes.map((quote) => (
                <div
                  key={quote.id}
                  className="flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => router.push(`/admin/accounting/quotes/${quote.id}`)}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-medium">{quote.quoteNumber}</code>
                      {getStatusBadge(quote.status)}
                      <Badge variant="outline">{quote.currency}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm">{quote.student.name}</span>
                      <span className="text-xs text-muted-foreground">({quote.student.email})</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {quote.items.length} pack(s) - Cree le {formatDate(quote.createdAt)}
                      {quote.scheduleCount > 0 && ` - ${quote.scheduleCount} echeance(s)`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatAmount(quote.totalAmount, quote.currency)}</div>
                    {quote.paidAmount > 0 && (
                      <div className="text-xs text-success">
                        Paye: {formatAmount(quote.paidAmount, quote.currency)}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">Aucun devis trouve</p>
            <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Creer un devis
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
}
