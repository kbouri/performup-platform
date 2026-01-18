"use client";

import { useState, useEffect, useCallback } from "react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CreditCard,
  Loader2,
  Plus,
  Users,
  CheckCircle,
  Clock,
  Wallet,
  Calendar,
} from "lucide-react";

interface BankAccount {
  accountName: string;
  bankName: string | null;
  currency: string;
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  paymentDate: string;
  status: string;
  notes: string | null;
  student: {
    id: string;
    name: string;
    email: string;
  } | null;
  bankAccount: BankAccount | null;
  receivedBy: string | null;
  schedule: {
    id: string;
    amount: number;
    dueDate: string;
  } | null;
  validatedAt: string | null;
  createdAt: string;
}

interface Summary {
  total: number;
  validated: number;
  pending: number;
  byCurrency: Record<string, { total: number; count: number }>;
}

interface Student {
  id: string;
  name: string;
  email: string;
}

interface BankAccountFull {
  id: string;
  accountName: string;
  bankName: string | null;
  currency: string;
  balance: number;
}

export default function StudentPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, validated: 0, pending: 0, byCurrency: {} });
  const [students, setStudents] = useState<Student[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [currencyFilter, setCurrencyFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [createForm, setCreateForm] = useState({
    studentId: "",
    amount: "",
    currency: "EUR",
    paymentDate: new Date().toISOString().split("T")[0],
    bankAccountId: "",
    notes: "",
    autoValidate: true,
  });

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      let url = "/api/admin/accounting/student-payments?";
      if (statusFilter !== "all") url += `status=${statusFilter}&`;
      if (currencyFilter !== "all") url += `currency=${currencyFilter}&`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, currencyFilter]);

  const fetchStudents = async () => {
    try {
      const res = await fetch("/api/students?limit=100");
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students.map((s: { id: string; name: string; email: string }) => ({
          id: s.id,
          name: s.name,
          email: s.email,
        })));
      }
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const res = await fetch("/api/admin/accounting/bank-accounts");
      if (res.ok) {
        const data = await res.json();
        setBankAccounts(data.accounts);
      }
    } catch (error) {
      console.error("Error fetching bank accounts:", error);
    }
  };

  useEffect(() => {
    fetchPayments();
    fetchStudents();
    fetchBankAccounts();
  }, [fetchPayments]);

  async function handleCreatePayment(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/accounting/student-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: createForm.studentId,
          amount: Math.round(parseFloat(createForm.amount) * 100),
          currency: createForm.currency,
          paymentDate: createForm.paymentDate,
          bankAccountId: createForm.bankAccountId,
          notes: createForm.notes || undefined,
          autoValidate: createForm.autoValidate,
        }),
      });

      if (res.ok) {
        setIsCreateDialogOpen(false);
        setCreateForm({
          studentId: "",
          amount: "",
          currency: "EUR",
          paymentDate: new Date().toISOString().split("T")[0],
          bankAccountId: "",
          notes: "",
          autoValidate: true,
        });
        fetchPayments();
      } else {
        const error = await res.json();
        alert(error.error || "Erreur lors de l'enregistrement");
      }
    } catch (error) {
      console.error("Error creating payment:", error);
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
      case "VALIDATED":
        return <Badge variant="success">Valide</Badge>;
      case "PENDING_VALIDATION":
        return <Badge variant="warning">En attente</Badge>;
      case "REJECTED":
        return <Badge variant="error">Rejete</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Filter bank accounts by selected currency
  const filteredBankAccounts = bankAccounts.filter(
    (a) => a.currency === createForm.currency
  );

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
        title="Paiements etudiants"
        description="Encaissements et suivi des paiements"
        breadcrumbs={[
          { label: "Admin" },
          { label: "Comptabilite", href: "/admin/accounting" },
          { label: "Paiements etudiants" },
        ]}
        actions={
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Enregistrer paiement
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouveau paiement</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreatePayment} className="space-y-4">
                <div>
                  <Label>Etudiant</Label>
                  <Select
                    value={createForm.studentId}
                    onValueChange={(v) => setCreateForm({ ...createForm, studentId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selectionner un etudiant" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} ({s.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Montant</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={createForm.amount}
                      onChange={(e) => setCreateForm({ ...createForm, amount: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                    <Label>Devise</Label>
                    <Select
                      value={createForm.currency}
                      onValueChange={(v) =>
                        setCreateForm({ ...createForm, currency: v, bankAccountId: "" })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="MAD">MAD</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Date de paiement</Label>
                  <Input
                    type="date"
                    value={createForm.paymentDate}
                    onChange={(e) => setCreateForm({ ...createForm, paymentDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Compte de reception</Label>
                  <Select
                    value={createForm.bankAccountId}
                    onValueChange={(v) => setCreateForm({ ...createForm, bankAccountId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selectionner un compte" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredBankAccounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.accountName} {a.bankName && `(${a.bankName})`} - {formatAmount(a.balance, a.currency)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {filteredBankAccounts.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Aucun compte disponible en {createForm.currency}
                    </p>
                  )}
                </div>
                <div>
                  <Label>Notes (optionnel)</Label>
                  <Textarea
                    value={createForm.notes}
                    onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                    placeholder="Details du paiement..."
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="autoValidate"
                    checked={createForm.autoValidate}
                    onCheckedChange={(checked) =>
                      setCreateForm({ ...createForm, autoValidate: checked === true })
                    }
                  />
                  <Label htmlFor="autoValidate" className="text-sm font-normal">
                    Valider automatiquement le paiement
                  </Label>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={submitting || !createForm.studentId || !createForm.bankAccountId}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
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
              <CreditCard className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{summary.total}</span>
            </div>
            <p className="text-sm text-muted-foreground">Total paiements</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              <span className="text-2xl font-bold">{summary.validated}</span>
            </div>
            <p className="text-sm text-muted-foreground">Valides</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              <span className="text-2xl font-bold">{summary.pending}</span>
            </div>
            <p className="text-sm text-muted-foreground">En attente</p>
          </CardContent>
        </Card>
        {Object.entries(summary.byCurrency).length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-1">
                {Object.entries(summary.byCurrency).map(([currency, data]) => (
                  <div key={currency} className="flex justify-between text-sm">
                    <Badge variant="outline">{currency}</Badge>
                    <span className="font-medium">{formatAmount(data.total, currency)}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Total valide par devise</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-4">
        <span className="text-sm text-muted-foreground">Filtres:</span>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="VALIDATED">Valides</SelectItem>
            <SelectItem value="PENDING_VALIDATION">En attente</SelectItem>
          </SelectContent>
        </Select>
        <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Devise" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="EUR">EUR</SelectItem>
            <SelectItem value="MAD">MAD</SelectItem>
            <SelectItem value="USD">USD</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Payments List */}
      {payments.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Historique des paiements</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {payments.map((payment) => (
                <div key={payment.id} className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                    <CreditCard className="h-5 w-5 text-success" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{payment.student?.name || "Etudiant inconnu"}</span>
                      {getStatusBadge(payment.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(payment.paymentDate)}
                      </span>
                      {payment.bankAccount && (
                        <span className="flex items-center gap-1">
                          <Wallet className="h-3.5 w-3.5" />
                          {payment.bankAccount.accountName}
                        </span>
                      )}
                      {payment.receivedBy && (
                        <span>par {payment.receivedBy}</span>
                      )}
                    </div>
                    {payment.notes && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {payment.notes}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-success">
                      +{formatAmount(payment.amount, payment.currency)}
                    </div>
                    <Badge variant="outline" className="mt-1">{payment.currency}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <CreditCard className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">Aucun paiement trouve</p>
            <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Enregistrer un paiement
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
}
