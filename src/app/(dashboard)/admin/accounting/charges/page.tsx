"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout";
import { AccountingNav } from "@/components/accounting/accounting-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Receipt,
  Plus,
  Loader2,
  Calendar,
  Building2,
  RefreshCw,
  Play,
  CreditCard,
} from "lucide-react";

interface Expense {
  id: string;
  category: string;
  customCategory: string | null;
  amount: number;
  currency: string;
  supplier: string | null;
  description: string | null;
  expenseDate: string;
  isRecurring: boolean;
  payingAccount: {
    id: string;
    accountName: string;
    bankName: string | null;
    currency: string;
  } | null;
  hasTransaction: boolean;
  createdAt: string;
}

interface RecurringExpense {
  id: string;
  name: string;
  supplier: string | null;
  category: string;
  amount: number;
  currency: string;
  frequency: string;
  nextDueDate: string;
  lastPaidDate: string | null;
  isActive: boolean;
  payingAccount: {
    id: string;
    accountName: string;
    bankName: string | null;
    currency: string;
  } | null;
  createdAt: string;
}

interface BankAccount {
  id: string;
  accountName: string;
  bankName: string | null;
  currency: string;
}

const EXPENSE_CATEGORIES = [
  { value: "SALAIRE", label: "Salaire" },
  { value: "LOCAL", label: "Local" },
  { value: "MATERIEL", label: "Materiel" },
  { value: "MARKETING", label: "Marketing" },
  { value: "SAAS", label: "SaaS / Abonnements" },
  { value: "BANK_FEES", label: "Frais bancaires" },
  { value: "DEVELOPER", label: "Developpeur" },
  { value: "AUTRE", label: "Autre" },
];

const FREQUENCIES = [
  { value: "MONTHLY", label: "Mensuel" },
  { value: "QUARTERLY", label: "Trimestriel" },
  { value: "YEARLY", label: "Annuel" },
];

const CURRENCIES = ["EUR", "MAD", "USD"];

export default function ChargesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [currencyFilter, setCurrencyFilter] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAddRecurringDialogOpen, setIsAddRecurringDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [newExpense, setNewExpense] = useState({
    category: "",
    amount: "",
    currency: "EUR",
    supplier: "",
    description: "",
    expenseDate: new Date().toISOString().split("T")[0],
    payingAccountId: "",
  });

  const [newRecurring, setNewRecurring] = useState({
    name: "",
    category: "",
    amount: "",
    currency: "EUR",
    supplier: "",
    frequency: "MONTHLY",
    nextDueDate: "",
    payingAccountId: "",
    notes: "",
  });

  useEffect(() => {
    fetchData();
  }, [categoryFilter, currencyFilter]);

  async function fetchData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== "all") params.append("category", categoryFilter);
      if (currencyFilter !== "all") params.append("currency", currencyFilter);

      const [expensesRes, recurringRes, accountsRes] = await Promise.all([
        fetch(`/api/admin/accounting/expenses?${params}`),
        fetch("/api/admin/accounting/recurring-expenses"),
        fetch("/api/admin/accounting/bank-accounts"),
      ]);

      if (expensesRes.ok) {
        const data = await expensesRes.json();
        setExpenses(data.expenses);
      }
      if (recurringRes.ok) {
        const data = await recurringRes.json();
        setRecurringExpenses(data.recurringExpenses);
      }
      if (accountsRes.ok) {
        const data = await accountsRes.json();
        setBankAccounts(data.accounts);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/accounting/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newExpense,
          amount: Math.round(parseFloat(newExpense.amount) * 100),
        }),
      });
      if (res.ok) {
        setIsAddDialogOpen(false);
        setNewExpense({
          category: "",
          amount: "",
          currency: "EUR",
          supplier: "",
          description: "",
          expenseDate: new Date().toISOString().split("T")[0],
          payingAccountId: "",
        });
        fetchData();
      }
    } catch (error) {
      console.error("Error adding expense:", error);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddRecurring(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/accounting/recurring-expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newRecurring,
          amount: Math.round(parseFloat(newRecurring.amount) * 100),
        }),
      });
      if (res.ok) {
        setIsAddRecurringDialogOpen(false);
        setNewRecurring({
          name: "",
          category: "",
          amount: "",
          currency: "EUR",
          supplier: "",
          frequency: "MONTHLY",
          nextDueDate: "",
          payingAccountId: "",
          notes: "",
        });
        fetchData();
      }
    } catch (error) {
      console.error("Error adding recurring expense:", error);
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePayRecurring(id: string) {
    try {
      const res = await fetch(`/api/admin/accounting/recurring-expenses/${id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Error paying recurring expense:", error);
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

  const getCategoryLabel = (category: string) => {
    return EXPENSE_CATEGORIES.find((c) => c.value === category)?.label || category;
  };

  const getFrequencyLabel = (frequency: string) => {
    return FREQUENCIES.find((f) => f.value === frequency)?.label || frequency;
  };

  const filteredAccounts = (currency: string) => {
    return bankAccounts.filter((a) => a.currency === currency);
  };

  // Calculate totals
  const totalsByCurrency: Record<string, number> = {};
  expenses.forEach((e) => {
    totalsByCurrency[e.currency] = (totalsByCurrency[e.currency] || 0) + e.amount;
  });

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
        title="Charges"
        description="Gerez les charges et depenses"
        breadcrumbs={[
          { label: "Admin" },
          { label: "Comptabilite", href: "/admin/accounting" },
          { label: "Charges" },
        ]}
        actions={
          <div className="flex gap-2">
            <Dialog open={isAddRecurringDialogOpen} onOpenChange={setIsAddRecurringDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Charge recurrente
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Nouvelle charge recurrente</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddRecurring} className="space-y-4">
                  <div>
                    <Label>Nom</Label>
                    <Input
                      value={newRecurring.name}
                      onChange={(e) => setNewRecurring({ ...newRecurring, name: e.target.value })}
                      placeholder="Ex: Abonnement Notion"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Categorie</Label>
                      <Select
                        value={newRecurring.category}
                        onValueChange={(v) => setNewRecurring({ ...newRecurring, category: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Categorie" />
                        </SelectTrigger>
                        <SelectContent>
                          {EXPENSE_CATEGORIES.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Frequence</Label>
                      <Select
                        value={newRecurring.frequency}
                        onValueChange={(v) => setNewRecurring({ ...newRecurring, frequency: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FREQUENCIES.map((f) => (
                            <SelectItem key={f.value} value={f.value}>
                              {f.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Montant</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={newRecurring.amount}
                        onChange={(e) => setNewRecurring({ ...newRecurring, amount: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label>Devise</Label>
                      <Select
                        value={newRecurring.currency}
                        onValueChange={(v) => setNewRecurring({ ...newRecurring, currency: v, payingAccountId: "" })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Fournisseur</Label>
                    <Input
                      value={newRecurring.supplier}
                      onChange={(e) => setNewRecurring({ ...newRecurring, supplier: e.target.value })}
                      placeholder="Ex: Notion"
                    />
                  </div>
                  <div>
                    <Label>Prochaine echeance</Label>
                    <Input
                      type="date"
                      value={newRecurring.nextDueDate}
                      onChange={(e) => setNewRecurring({ ...newRecurring, nextDueDate: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Compte de paiement</Label>
                    <Select
                      value={newRecurring.payingAccountId}
                      onValueChange={(v) => setNewRecurring({ ...newRecurring, payingAccountId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selectionner un compte" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredAccounts(newRecurring.currency).map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.accountName} ({a.currency})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Creer"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nouvelle charge
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Nouvelle charge</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddExpense} className="space-y-4">
                  <div>
                    <Label>Categorie</Label>
                    <Select
                      value={newExpense.category}
                      onValueChange={(v) => setNewExpense({ ...newExpense, category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selectionner une categorie" />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
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
                        value={newExpense.amount}
                        onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label>Devise</Label>
                      <Select
                        value={newExpense.currency}
                        onValueChange={(v) => setNewExpense({ ...newExpense, currency: v, payingAccountId: "" })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Fournisseur</Label>
                    <Input
                      value={newExpense.supplier}
                      onChange={(e) => setNewExpense({ ...newExpense, supplier: e.target.value })}
                      placeholder="Nom du fournisseur"
                    />
                  </div>
                  <div>
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={newExpense.expenseDate}
                      onChange={(e) => setNewExpense({ ...newExpense, expenseDate: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Compte de paiement</Label>
                    <Select
                      value={newExpense.payingAccountId}
                      onValueChange={(v) => setNewExpense({ ...newExpense, payingAccountId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selectionner un compte" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredAccounts(newExpense.currency).map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.accountName} ({a.currency})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={newExpense.description}
                      onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                      placeholder="Details sur la charge..."
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        {Object.entries(totalsByCurrency).map(([currency, total]) => (
          <Card key={currency}>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold font-display">{formatAmount(total, currency)}</div>
              <p className="text-sm text-muted-foreground">Total charges {currency}</p>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold font-display">{expenses.length}</div>
            <p className="text-sm text-muted-foreground">Charges enregistrees</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold font-display text-warning">
              {recurringExpenses.filter((r) => r.isActive).length}
            </div>
            <p className="text-sm text-muted-foreground">Charges recurrentes actives</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Categorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes categories</SelectItem>
            {EXPENSE_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Devise" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes devises</SelectItem>
            {CURRENCIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="expenses" className="space-y-4">
        <TabsList>
          <TabsTrigger value="expenses">
            <Receipt className="mr-2 h-4 w-4" />
            Charges ({expenses.length})
          </TabsTrigger>
          <TabsTrigger value="recurring">
            <RefreshCw className="mr-2 h-4 w-4" />
            Recurrentes ({recurringExpenses.length})
          </TabsTrigger>
        </TabsList>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4">
          {expenses.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {expenses.map((expense) => (
                    <div key={expense.id} className="flex items-center gap-4 p-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-error/10">
                        <Receipt className="h-5 w-5 text-error" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary">{getCategoryLabel(expense.category)}</Badge>
                          {expense.supplier && (
                            <span className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Building2 className="h-3.5 w-3.5" />
                              {expense.supplier}
                            </span>
                          )}
                          {expense.isRecurring && (
                            <Badge variant="outline">
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Recurrent
                            </Badge>
                          )}
                        </div>
                        {expense.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                            {expense.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(expense.expenseDate)}
                          </span>
                          {expense.payingAccount && (
                            <span className="flex items-center gap-1">
                              <CreditCard className="h-3.5 w-3.5" />
                              {expense.payingAccount.accountName}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-error">
                          -{formatAmount(expense.amount, expense.currency)}
                        </p>
                        {expense.hasTransaction && (
                          <Badge variant="success" className="mt-1">
                            Comptabilise
                          </Badge>
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
                <Receipt className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">Aucune charge enregistree</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Recurring Tab */}
        <TabsContent value="recurring" className="space-y-4">
          {recurringExpenses.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {recurringExpenses.map((re) => {
                    const isDue = new Date(re.nextDueDate) <= new Date();
                    return (
                      <div key={re.id} className="flex items-center gap-4 p-4">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${re.isActive ? "bg-warning/10" : "bg-muted"}`}>
                          <RefreshCw className={`h-5 w-5 ${re.isActive ? "text-warning" : "text-muted-foreground"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{re.name}</span>
                            <Badge variant="secondary">{getCategoryLabel(re.category)}</Badge>
                            <Badge variant="outline">{getFrequencyLabel(re.frequency)}</Badge>
                            {!re.isActive && <Badge variant="error">Inactive</Badge>}
                          </div>
                          {re.supplier && (
                            <p className="text-sm text-muted-foreground mt-1">
                              <Building2 className="inline h-3.5 w-3.5 mr-1" />
                              {re.supplier}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            <span className={isDue && re.isActive ? "text-error font-medium" : ""}>
                              Prochaine echeance: {formatDate(re.nextDueDate)}
                            </span>
                            {re.lastPaidDate && (
                              <span>Dernier paiement: {formatDate(re.lastPaidDate)}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <p className="font-semibold">{formatAmount(re.amount, re.currency)}</p>
                          {re.isActive && isDue && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePayRecurring(re.id)}
                            >
                              <Play className="h-3 w-3 mr-1" />
                              Payer
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <RefreshCw className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">Aucune charge recurrente</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
