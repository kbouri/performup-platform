"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout";
import { AccountingNav } from "@/components/accounting/accounting-nav";
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
  BookOpen,
  Download,
  Loader2,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";

interface Transaction {
  id: string;
  transactionNumber: string;
  date: string;
  type: string;
  typeLabel: string;
  amount: number;
  currency: string;
  sourceAccount: { id: string; accountName: string } | null;
  destinationAccount: { id: string; accountName: string } | null;
  description: string | null;
  student: { id: string; name: string } | null;
  mentor: { id: string; name: string } | null;
  professor: { id: string; name: string } | null;
  expense: { id: string; category: string; supplier: string | null } | null;
  mission: { id: string; title: string } | null;
  creator: string;
  createdAt: string;
}

interface Summary {
  totalsByCurrency: Record<string, { incoming: number; outgoing: number }>;
  byType: Record<string, number>;
  count: number;
}

const TRANSACTION_TYPES = [
  { value: "STUDENT_PAYMENT", label: "Paiement etudiant" },
  { value: "MENTOR_PAYMENT", label: "Paiement mentor" },
  { value: "PROFESSOR_PAYMENT", label: "Paiement professeur" },
  { value: "EXPENSE", label: "Charge" },
  { value: "DISTRIBUTION", label: "Distribution" },
  { value: "TRANSFER", label: "Transfert" },
  { value: "FX_EXCHANGE", label: "Change de devise" },
];

const CURRENCIES = ["EUR", "MAD", "USD"];
const PAGE_SIZE = 50;

export default function JournalPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [typeFilter, setTypeFilter] = useState("all");
  const [currencyFilter, setCurrencyFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchData();
  }, [page, typeFilter, currencyFilter, startDate, endDate]);

  async function fetchData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("limit", String(PAGE_SIZE));
      params.append("offset", String(page * PAGE_SIZE));
      if (typeFilter !== "all") params.append("type", typeFilter);
      if (currencyFilter !== "all") params.append("currency", currencyFilter);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const res = await fetch(`/api/admin/accounting/journal?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions);
        setSummary(data.summary);
        setTotalCount(data.pagination.total);
      }
    } catch (error) {
      console.error("Error fetching journal:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.append("type", typeFilter);
      if (currencyFilter !== "all") params.append("currency", currencyFilter);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const res = await fetch(`/api/admin/accounting/journal/export?${params}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `journal_comptable_${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Error exporting journal:", error);
    } finally {
      setExporting(false);
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

  const getTransactionIcon = (type: string) => {
    if (type === "STUDENT_PAYMENT") {
      return <ArrowDownLeft className="h-4 w-4 text-success" />;
    }
    if (type === "EXPENSE" || type === "MENTOR_PAYMENT" || type === "PROFESSOR_PAYMENT") {
      return <ArrowUpRight className="h-4 w-4 text-error" />;
    }
    if (type === "TRANSFER" || type === "FX_EXCHANGE") {
      return <ArrowLeftRight className="h-4 w-4 text-warning" />;
    }
    return <ArrowDownLeft className="h-4 w-4" />;
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "STUDENT_PAYMENT":
        return "success";
      case "EXPENSE":
      case "MENTOR_PAYMENT":
      case "PROFESSOR_PAYMENT":
        return "error";
      case "TRANSFER":
      case "FX_EXCHANGE":
        return "warning";
      default:
        return "secondary";
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (loading && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Journal comptable"
        description="Historique de toutes les transactions"
        breadcrumbs={[
          { label: "Admin" },
          { label: "Comptabilite", href: "/admin/accounting" },
          { label: "Journal" },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="mr-2 h-4 w-4" />
              Filtres
            </Button>
            <Button variant="outline" onClick={handleExport} disabled={exporting}>
              {exporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Exporter CSV
            </Button>
          </div>
        }
      />

      <AccountingNav />

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          {Object.entries(summary.totalsByCurrency).map(([currency, totals]) => (
            <Card key={currency}>
              <CardContent className="pt-6">
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-success">Entrees</span>
                    <span className="font-medium text-success">
                      +{formatAmount(totals.incoming, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-error">Sorties</span>
                    <span className="font-medium text-error">
                      -{formatAmount(totals.outgoing, currency)}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{currency}</p>
              </CardContent>
            </Card>
          ))}
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold font-display">{totalCount}</div>
              <p className="text-sm text-muted-foreground">Transactions totales</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="w-48">
                <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(0); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous types</SelectItem>
                    {TRANSACTION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-32">
                <Select value={currencyFilter} onValueChange={(v) => { setCurrencyFilter(v); setPage(0); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Devise" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-40">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(0); }}
                  placeholder="Date debut"
                />
              </div>
              <div className="w-40">
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(0); }}
                  placeholder="Date fin"
                />
              </div>
              <Button
                variant="ghost"
                onClick={() => {
                  setTypeFilter("all");
                  setCurrencyFilter("all");
                  setStartDate("");
                  setEndDate("");
                  setPage(0);
                }}
              >
                Reinitialiser
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transactions List */}
      {transactions.length > 0 ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Transactions</CardTitle>
              <span className="text-sm text-muted-foreground">
                Page {page + 1} / {totalPages} ({totalCount} resultats)
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {transactions.map((txn) => (
                <div key={txn.id} className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    {getTransactionIcon(txn.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {txn.transactionNumber}
                      </code>
                      <Badge variant={getTypeBadgeVariant(txn.type) as "success" | "error" | "warning" | "secondary"}>
                        {txn.typeLabel}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                      {txn.description || "Pas de description"}
                    </p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span>{formatDate(txn.date)}</span>
                      {txn.sourceAccount && (
                        <span>De: {txn.sourceAccount.accountName}</span>
                      )}
                      {txn.destinationAccount && (
                        <span>Vers: {txn.destinationAccount.accountName}</span>
                      )}
                      {txn.student && <span>Etudiant: {txn.student.name}</span>}
                      {txn.mentor && <span>Mentor: {txn.mentor.name}</span>}
                      {txn.professor && <span>Professeur: {txn.professor.name}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${txn.sourceAccount ? "text-error" : "text-success"}`}>
                      {txn.sourceAccount ? "-" : "+"}{formatAmount(txn.amount, txn.currency)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      par {txn.creator}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0 || loading}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Precedent
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page + 1} sur {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1 || loading}
                >
                  Suivant
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">Aucune transaction enregistree</p>
            <p className="text-sm text-muted-foreground">
              Les transactions apparaitront ici lorsque des mouvements seront enregistres
            </p>
          </CardContent>
        </Card>
      )}
    </>
  );
}
