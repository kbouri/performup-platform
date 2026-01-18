"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  Plus,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Receipt,
  PieChart,
  Loader2,
  CheckCircle,
  Clock,
  AlertCircle,
  Landmark,
  FileText,
  Users,
  Briefcase,
  BookOpen,
  LineChart,
  Scale,
  ArrowLeftRight,
} from "lucide-react";

// Navigation items for accounting sub-modules
const accountingNavItems = [
  { href: "/admin/accounting", label: "Vue d'ensemble", icon: PieChart },
  { href: "/admin/accounting/bank-accounts", label: "Comptes bancaires", icon: Landmark },
  { href: "/admin/accounting/quotes", label: "Devis", icon: FileText },
  { href: "/admin/accounting/student-payments", label: "Paiements etudiants", icon: Users },
  { href: "/admin/accounting/missions", label: "Missions", icon: Briefcase },
  { href: "/admin/accounting/journal", label: "Journal", icon: BookOpen },
  { href: "/admin/accounting/forecast", label: "Tresorerie", icon: LineChart },
  { href: "/admin/accounting/positions", label: "Positions admins", icon: Scale },
  { href: "/admin/accounting/charges", label: "Charges", icon: Receipt },
  { href: "/admin/accounting/transfers", label: "Transferts", icon: ArrowLeftRight },
];

interface Payment {
  id: string;
  amount: number;
  paymentDate: string;
  status: string;
  student: { id: string; name: string | null; email: string } | null;
  receivedBy: string | null;
  createdAt: string;
}

interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string | null;
  expenseDate: string;
  isRecurring: boolean;
  student: { id: string; name: string | null } | null;
}

interface Distribution {
  id: string;
  totalAmount: number;
  investmentAmount: number;
  distributedAmount: number;
  distributionDate: string;
  founders: Array<{
    founder: { id: string; name: string | null };
    amount: number;
    percentage: number;
  }>;
}

export default function AccountingPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsSummary, setPaymentsSummary] = useState({
    total: 0,
    pending: 0,
    count: 0,
  });
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expensesSummary, setExpensesSummary] = useState<{
    total: number;
    byCategory: Record<string, number>;
  }>({ total: 0, byCategory: {} });
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [newPaymentOpen, setNewPaymentOpen] = useState(false);
  const [newExpenseOpen, setNewExpenseOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form states
  const [newPayment, setNewPayment] = useState({
    amount: "",
    paymentDate: "",
    studentId: "",
    notes: "",
  });

  const [newExpense, setNewExpense] = useState({
    category: "AUTRE",
    amount: "",
    description: "",
    expenseDate: "",
  });

  const [students, setStudents] = useState<
    Array<{ id: string; name: string | null; email: string }>
  >([]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [paymentsRes, expensesRes, distributionsRes, studentsRes] =
          await Promise.all([
            fetch("/api/admin/accounting/payments"),
            fetch("/api/admin/accounting/expenses"),
            fetch("/api/admin/accounting/distributions"),
            fetch("/api/students?limit=100"),
          ]);

        if (paymentsRes.ok) {
          const data = await paymentsRes.json();
          setPayments(data.payments || []);
          setPaymentsSummary(data.summary || { total: 0, pending: 0, count: 0 });
        }

        if (expensesRes.ok) {
          const data = await expensesRes.json();
          setExpenses(data.expenses || []);
          setExpensesSummary(
            data.summary || { total: 0, byCategory: {} }
          );
        }

        if (distributionsRes.ok) {
          const data = await distributionsRes.json();
          setDistributions(data.distributions || []);
        }

        if (studentsRes.ok) {
          const data = await studentsRes.json();
          setStudents(
            data.students?.map((s: { id: string; name: string | null; email: string }) => ({
              id: s.id,
              name: s.name,
              email: s.email,
            })) || []
          );
        }
      } catch (error) {
        console.error("Error fetching accounting data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleCreatePayment = async () => {
    if (!newPayment.amount || !newPayment.paymentDate) return;

    setCreating(true);
    try {
      const response = await fetch("/api/admin/accounting/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Math.round(parseFloat(newPayment.amount) * 100),
          paymentDate: newPayment.paymentDate,
          studentId: newPayment.studentId || null,
          notes: newPayment.notes,
        }),
      });

      if (response.ok) {
        setNewPaymentOpen(false);
        setNewPayment({ amount: "", paymentDate: "", studentId: "", notes: "" });
        // Refresh payments
        const res = await fetch("/api/admin/accounting/payments");
        if (res.ok) {
          const data = await res.json();
          setPayments(data.payments);
          setPaymentsSummary(data.summary);
        }
      }
    } catch (error) {
      console.error("Error creating payment:", error);
    } finally {
      setCreating(false);
    }
  };

  const handleCreateExpense = async () => {
    if (!newExpense.amount || !newExpense.expenseDate) return;

    setCreating(true);
    try {
      const response = await fetch("/api/admin/accounting/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: newExpense.category,
          amount: Math.round(parseFloat(newExpense.amount) * 100),
          description: newExpense.description,
          expenseDate: newExpense.expenseDate,
        }),
      });

      if (response.ok) {
        setNewExpenseOpen(false);
        setNewExpense({
          category: "AUTRE",
          amount: "",
          description: "",
          expenseDate: "",
        });
        // Refresh expenses
        const res = await fetch("/api/admin/accounting/expenses");
        if (res.ok) {
          const data = await res.json();
          setExpenses(data.expenses);
          setExpensesSummary(data.summary);
        }
      }
    } catch (error) {
      console.error("Error creating expense:", error);
    } finally {
      setCreating(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "VALIDATED":
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "PENDING_VALIDATION":
        return <Clock className="h-4 w-4 text-warning" />;
      case "REJECTED":
        return <AlertCircle className="h-4 w-4 text-error" />;
      default:
        return null;
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      SALAIRE: "Salaire",
      LOCAL: "Local",
      MATERIEL: "Matériel",
      MARKETING: "Marketing",
      AUTRE: "Autre",
    };
    return labels[category] || category;
  };

  // Calculate net income
  const netIncome = paymentsSummary.total - expensesSummary.total;

  const pathname = usePathname();

  return (
    <>
      <PageHeader
        title="Comptabilité"
        description="Gestion des paiements, charges et distributions"
        breadcrumbs={[{ label: "Admin" }, { label: "Comptabilité" }]}
      />

      {/* Sub-navigation */}
      <div className="mb-6 -mx-1 overflow-x-auto">
        <nav className="flex gap-1 p-1 bg-muted/50 rounded-lg min-w-max">
          {accountingNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                  isActive
                    ? "bg-white shadow-sm text-performup-blue"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/50"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10">
                <TrendingUp className="h-6 w-6 text-success" />
              </div>
              <div>
                <div className="text-2xl font-bold font-display text-success">
                  {formatCurrency(paymentsSummary.total)}
                </div>
                <p className="text-sm text-muted-foreground">Revenus totaux</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-error/10">
                <TrendingDown className="h-6 w-6 text-error" />
              </div>
              <div>
                <div className="text-2xl font-bold font-display text-error">
                  {formatCurrency(expensesSummary.total)}
                </div>
                <p className="text-sm text-muted-foreground">Charges totales</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-performup-blue/10">
                <DollarSign className="h-6 w-6 text-performup-blue" />
              </div>
              <div>
                <div
                  className={`text-2xl font-bold font-display ${
                    netIncome >= 0 ? "text-success" : "text-error"
                  }`}
                >
                  {formatCurrency(netIncome)}
                </div>
                <p className="text-sm text-muted-foreground">Résultat net</p>
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
                  {formatCurrency(paymentsSummary.pending)}
                </div>
                <p className="text-sm text-muted-foreground">En attente</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-performup-blue" />
        </div>
      ) : (
        <Tabs defaultValue="payments" className="space-y-4">
          <TabsList>
            <TabsTrigger value="payments">
              <CreditCard className="mr-2 h-4 w-4" />
              Paiements
            </TabsTrigger>
            <TabsTrigger value="expenses">
              <Receipt className="mr-2 h-4 w-4" />
              Charges
            </TabsTrigger>
            <TabsTrigger value="distributions">
              <PieChart className="mr-2 h-4 w-4" />
              Distributions
            </TabsTrigger>
          </TabsList>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setNewPaymentOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nouveau paiement
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {payments.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                      Aucun paiement enregistré
                    </div>
                  ) : (
                    payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center gap-4 p-4 hover:bg-muted/50"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                          <CreditCard className="h-5 w-5 text-success" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {formatCurrency(payment.amount)}
                            </span>
                            {getStatusIcon(payment.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {payment.student?.name || payment.student?.email || "—"}{" "}
                            • {formatDate(new Date(payment.paymentDate))}
                          </p>
                        </div>
                        <Badge
                          variant={
                            payment.status === "VALIDATED"
                              ? "success"
                              : payment.status === "REJECTED"
                              ? "error"
                              : "warning"
                          }
                        >
                          {payment.status === "VALIDATED"
                            ? "Validé"
                            : payment.status === "REJECTED"
                            ? "Rejeté"
                            : "En attente"}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Expenses Tab */}
          <TabsContent value="expenses" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setNewExpenseOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle charge
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-5 mb-4">
              {Object.entries(expensesSummary.byCategory).map(
                ([category, amount]) => (
                  <Card key={category}>
                    <CardContent className="pt-6">
                      <div className="text-lg font-bold">
                        {formatCurrency(amount)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {getCategoryLabel(category)}
                      </p>
                    </CardContent>
                  </Card>
                )
              )}
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {expenses.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                      Aucune charge enregistrée
                    </div>
                  ) : (
                    expenses.map((expense) => (
                      <div
                        key={expense.id}
                        className="flex items-center gap-4 p-4 hover:bg-muted/50"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-error/10">
                          <Receipt className="h-5 w-5 text-error" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {formatCurrency(expense.amount)}
                            </span>
                            <Badge variant="outline">
                              {getCategoryLabel(expense.category)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {expense.description || "—"} •{" "}
                            {formatDate(new Date(expense.expenseDate))}
                          </p>
                        </div>
                        {expense.isRecurring && (
                          <Badge variant="secondary">Récurrent</Badge>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Distributions Tab */}
          <TabsContent value="distributions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Historique des distributions</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {distributions.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                      Aucune distribution enregistrée
                    </div>
                  ) : (
                    distributions.map((dist) => (
                      <div key={dist.id} className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <span className="font-medium">
                              {formatCurrency(dist.totalAmount)}
                            </span>
                            <span className="text-sm text-muted-foreground ml-2">
                              {formatDate(new Date(dist.distributionDate))}
                            </span>
                          </div>
                          <div className="text-right text-sm">
                            <span className="text-success">
                              Distribué: {formatCurrency(dist.distributedAmount)}
                            </span>
                            <span className="text-muted-foreground mx-2">|</span>
                            <span className="text-performup-blue">
                              Réinvesti: {formatCurrency(dist.investmentAmount)}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-4">
                          {dist.founders.map((f) => (
                            <div
                              key={f.founder.id}
                              className="flex items-center gap-2 text-sm"
                            >
                              <span className="text-muted-foreground">
                                {f.founder.name}:
                              </span>
                              <span className="font-medium">
                                {formatCurrency(f.amount)} ({f.percentage}%)
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* New Payment Dialog */}
      <Dialog open={newPaymentOpen} onOpenChange={setNewPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau paiement</DialogTitle>
            <DialogDescription>
              Enregistrez un paiement reçu
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Montant (EUR) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={newPayment.amount}
                onChange={(e) =>
                  setNewPayment((prev) => ({ ...prev, amount: e.target.value }))
                }
                placeholder="5000.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentDate">Date *</Label>
              <Input
                id="paymentDate"
                type="date"
                value={newPayment.paymentDate}
                onChange={(e) =>
                  setNewPayment((prev) => ({ ...prev, paymentDate: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="student">Étudiant</Label>
              <Select
                value={newPayment.studentId || "_none"}
                onValueChange={(value) =>
                  setNewPayment((prev) => ({ ...prev, studentId: value === "_none" ? "" : value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un étudiant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Aucun</SelectItem>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name || s.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={newPayment.notes}
                onChange={(e) =>
                  setNewPayment((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Notes optionnelles..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewPaymentOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleCreatePayment}
              disabled={creating || !newPayment.amount || !newPayment.paymentDate}
            >
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Expense Dialog */}
      <Dialog open={newExpenseOpen} onOpenChange={setNewExpenseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle charge</DialogTitle>
            <DialogDescription>
              Enregistrez une nouvelle charge
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category">Catégorie *</Label>
              <Select
                value={newExpense.category}
                onValueChange={(value) =>
                  setNewExpense((prev) => ({ ...prev, category: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SALAIRE">Salaire</SelectItem>
                  <SelectItem value="LOCAL">Local</SelectItem>
                  <SelectItem value="MATERIEL">Matériel</SelectItem>
                  <SelectItem value="MARKETING">Marketing</SelectItem>
                  <SelectItem value="AUTRE">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expenseAmount">Montant (EUR) *</Label>
              <Input
                id="expenseAmount"
                type="number"
                step="0.01"
                value={newExpense.amount}
                onChange={(e) =>
                  setNewExpense((prev) => ({ ...prev, amount: e.target.value }))
                }
                placeholder="500.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expenseDate">Date *</Label>
              <Input
                id="expenseDate"
                type="date"
                value={newExpense.expenseDate}
                onChange={(e) =>
                  setNewExpense((prev) => ({ ...prev, expenseDate: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={newExpense.description}
                onChange={(e) =>
                  setNewExpense((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Description de la charge..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewExpenseOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleCreateExpense}
              disabled={creating || !newExpense.amount || !newExpense.expenseDate}
            >
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

