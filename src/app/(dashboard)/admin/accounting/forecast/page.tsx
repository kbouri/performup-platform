"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Loader2,
  Calendar,
  Users,
  AlertTriangle,
  ArrowRight,
  Clock,
  RefreshCcw,
  ChevronRight,
} from "lucide-react";

interface CashflowAccount {
  id: string;
  accountName: string;
  bankName: string | null;
  currency: string;
  accountType: string;
  balance: number;
  isAdminOwned: boolean;
  owner: string;
}

interface Projection {
  month: string;
  currency: string;
  openingBalance: number;
  expectedRevenue: number;
  expectedExpenses: number;
  netFlow: number;
  closingBalance: number;
}

interface RevenueDetail {
  id: string;
  student: string;
  amount: number;
  remainingAmount: number;
  currency: string;
  dueDate: string;
  status: string;
}

interface ExpenseDetail {
  id: string;
  type: "mission" | "recurring";
  name: string;
  amount: number;
  currency: string;
  dueDate: string;
}

interface BfrStudent {
  studentId: string;
  studentName: string;
  email: string;
  totalQuote: number;
  currency: string;
  totalPaid: number;
  totalRemaining: number;
  overdueAmount: number;
}

interface UpcomingPayment {
  studentId: string;
  studentName: string;
  amount: number;
  currency: string;
  dueDate: string;
}

export default function ForecastPage() {
  const [cashflowAccounts, setCashflowAccounts] = useState<CashflowAccount[]>([]);
  const [adminTotalsByCurrency, setAdminTotalsByCurrency] = useState<Record<string, number>>({});
  const [projection, setProjection] = useState<Projection[]>([]);
  const [revenueDetails, setRevenueDetails] = useState<RevenueDetail[]>([]);
  const [expenseDetails, setExpenseDetails] = useState<ExpenseDetail[]>([]);
  const [totalRevenue, setTotalRevenue] = useState<Record<string, number>>({});
  const [totalExpenses, setTotalExpenses] = useState<Record<string, number>>({});
  const [bfrStudents, setBfrStudents] = useState<BfrStudent[]>([]);
  const [overdueStudents, setOverdueStudents] = useState<{ studentName: string; overdueAmount: number; currency: string }[]>([]);
  const [upcomingPayments, setUpcomingPayments] = useState<UpcomingPayment[]>([]);
  const [bfrTotals, setBfrTotals] = useState<Record<string, { totalRemaining: number; overdueAmount: number }>>({});
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState("6");
  const [selectedCurrency, setSelectedCurrency] = useState("EUR");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [cashflowRes, forecastRes, bfrRes] = await Promise.all([
        fetch("/api/admin/accounting/cashflow"),
        fetch(`/api/admin/accounting/forecast?months=${months}`),
        fetch("/api/admin/accounting/bfr"),
      ]);

      if (cashflowRes.ok) {
        const data = await cashflowRes.json();
        setCashflowAccounts(data.adminAccounts);
        setAdminTotalsByCurrency(data.adminTotalsByCurrency);
      }

      if (forecastRes.ok) {
        const data = await forecastRes.json();
        setProjection(data.projection);
        setRevenueDetails(data.revenue.details);
        setExpenseDetails(data.expenses.details);
        setTotalRevenue(data.revenue.totals);
        setTotalExpenses(data.expenses.totals);
      }

      if (bfrRes.ok) {
        const data = await bfrRes.json();
        setBfrStudents(data.students);
        setOverdueStudents(data.overdueStudents);
        setUpcomingPayments(data.upcomingPayments);
        setBfrTotals(data.totalsByCurrency);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [months]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const formatMonth = (monthKey: string) => {
    const [year, month] = monthKey.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
  };

  // Filter projection by selected currency
  const filteredProjection = projection.filter((p) => p.currency === selectedCurrency);

  // Available currencies
  const currencies = Array.from(new Set([
    ...Object.keys(adminTotalsByCurrency),
    ...Object.keys(totalRevenue),
    ...Object.keys(totalExpenses),
  ]));

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
        title="Previsionnel"
        description="Tresorerie, previsions et BFR"
        breadcrumbs={[
          { label: "Admin" },
          { label: "Comptabilite", href: "/admin/accounting" },
          { label: "Previsionnel" },
        ]}
        actions={
          <div className="flex gap-2">
            <Select value={months} onValueChange={setMonths}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 mois</SelectItem>
                <SelectItem value="6">6 mois</SelectItem>
                <SelectItem value="12">12 mois</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchData}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Actualiser
            </Button>
          </div>
        }
      />

      {/* Current Treasury Summary */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        {Object.entries(adminTotalsByCurrency).map(([currency, balance]) => (
          <Card key={currency}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  <Badge variant="outline">{currency}</Badge>
                </div>
                <span
                  className={`text-xl font-bold ${
                    balance >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {formatAmount(balance, currency)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Tresorerie admin</p>
            </CardContent>
          </Card>
        ))}
        {Object.keys(adminTotalsByCurrency).length === 0 && (
          <Card className="md:col-span-4">
            <CardContent className="py-8 text-center text-muted-foreground">
              Aucun compte admin configure
            </CardContent>
          </Card>
        )}
      </div>

      {/* Alerts */}
      {overdueStudents.length > 0 && (
        <Card className="mb-6 border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Paiements en retard ({overdueStudents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overdueStudents.slice(0, 5).map((student, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{student.studentName}</span>
                  <Badge variant="error">
                    {formatAmount(student.overdueAmount, student.currency)}
                  </Badge>
                </div>
              ))}
              {overdueStudents.length > 5 && (
                <p className="text-xs text-muted-foreground">
                  + {overdueStudents.length - 5} autres...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="projection" className="space-y-4">
        <TabsList>
          <TabsTrigger value="projection">
            <TrendingUp className="mr-2 h-4 w-4" />
            Projection
          </TabsTrigger>
          <TabsTrigger value="revenue">
            <ArrowRight className="mr-2 h-4 w-4 rotate-45" />
            Revenus ({revenueDetails.length})
          </TabsTrigger>
          <TabsTrigger value="expenses">
            <ArrowRight className="mr-2 h-4 w-4 -rotate-45" />
            Depenses ({expenseDetails.length})
          </TabsTrigger>
          <TabsTrigger value="bfr">
            <Users className="mr-2 h-4 w-4" />
            BFR ({bfrStudents.length})
          </TabsTrigger>
          <TabsTrigger value="treasury">
            <Wallet className="mr-2 h-4 w-4" />
            Comptes
          </TabsTrigger>
        </TabsList>

        {/* Projection Tab */}
        <TabsContent value="projection" className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-sm text-muted-foreground">Devise:</span>
            {currencies.map((currency) => (
              <Button
                key={currency}
                variant={selectedCurrency === currency ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCurrency(currency)}
              >
                {currency}
              </Button>
            ))}
          </div>

          {filteredProjection.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Projection {selectedCurrency} sur {months} mois</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3">Mois</th>
                        <th className="text-right py-2 px-3">Solde initial</th>
                        <th className="text-right py-2 px-3">Revenus</th>
                        <th className="text-right py-2 px-3">Depenses</th>
                        <th className="text-right py-2 px-3">Flux net</th>
                        <th className="text-right py-2 px-3">Solde final</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProjection.map((row, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-2 px-3 font-medium">{formatMonth(row.month)}</td>
                          <td className="text-right py-2 px-3">
                            {formatAmount(row.openingBalance, row.currency)}
                          </td>
                          <td className="text-right py-2 px-3 text-success">
                            +{formatAmount(row.expectedRevenue, row.currency)}
                          </td>
                          <td className="text-right py-2 px-3 text-destructive">
                            -{formatAmount(row.expectedExpenses, row.currency)}
                          </td>
                          <td className={`text-right py-2 px-3 font-medium ${row.netFlow >= 0 ? "text-success" : "text-destructive"}`}>
                            {row.netFlow >= 0 ? "+" : ""}{formatAmount(row.netFlow, row.currency)}
                          </td>
                          <td className={`text-right py-2 px-3 font-bold ${row.closingBalance >= 0 ? "" : "text-destructive"}`}>
                            {formatAmount(row.closingBalance, row.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">
                  Aucune projection disponible pour {selectedCurrency}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-success" />
                  <span className="font-medium">Revenus attendus</span>
                </div>
                {Object.entries(totalRevenue).map(([currency, amount]) => (
                  <div key={currency} className="flex justify-between text-sm">
                    <Badge variant="outline">{currency}</Badge>
                    <span className="text-success font-medium">
                      +{formatAmount(amount, currency)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="h-5 w-5 text-destructive" />
                  <span className="font-medium">Depenses prevues</span>
                </div>
                {Object.entries(totalExpenses).map(([currency, amount]) => (
                  <div key={currency} className="flex justify-between text-sm">
                    <Badge variant="outline">{currency}</Badge>
                    <span className="text-destructive font-medium">
                      -{formatAmount(amount, currency)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-warning" />
                  <span className="font-medium">A venir (30j)</span>
                </div>
                <div className="text-2xl font-bold">{upcomingPayments.length}</div>
                <p className="text-xs text-muted-foreground">echeances attendues</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-4">
          {revenueDetails.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Revenus attendus</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y max-h-[600px] overflow-y-auto">
                  {revenueDetails.map((detail) => (
                    <div key={detail.id} className="flex items-center justify-between p-4">
                      <div>
                        <div className="font-medium">{detail.student}</div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(detail.dueDate)}
                          <Badge variant={detail.status === "PARTIALLY_PAID" ? "secondary" : "outline"} className="text-xs">
                            {detail.status === "PARTIALLY_PAID" ? "Partiel" : "En attente"}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-success">
                          +{formatAmount(detail.remainingAmount, detail.currency)}
                        </div>
                        {detail.remainingAmount < detail.amount && (
                          <div className="text-xs text-muted-foreground">
                            sur {formatAmount(detail.amount, detail.currency)}
                          </div>
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
                <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">Aucun revenu attendu</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4">
          {expenseDetails.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Depenses prevues</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y max-h-[600px] overflow-y-auto">
                  {expenseDetails.map((detail, i) => (
                    <div key={`${detail.id}-${i}`} className="flex items-center justify-between p-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{detail.name}</span>
                          <Badge variant={detail.type === "recurring" ? "secondary" : "outline"} className="text-xs">
                            {detail.type === "recurring" ? "Recurrent" : "Mission"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(detail.dueDate)}
                        </div>
                      </div>
                      <div className="font-semibold text-destructive">
                        -{formatAmount(detail.amount, detail.currency)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <TrendingDown className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">Aucune depense prevue</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* BFR Tab */}
        <TabsContent value="bfr" className="space-y-4">
          {/* BFR Summary */}
          <div className="grid gap-4 md:grid-cols-3 mb-4">
            {Object.entries(bfrTotals).map(([currency, totals]) => (
              <Card key={currency}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline">{currency}</Badge>
                    <span className="font-bold">{formatAmount(totals.totalRemaining, currency)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Encours total
                  </div>
                  {totals.overdueAmount > 0 && (
                    <div className="text-xs text-destructive mt-1">
                      dont {formatAmount(totals.overdueAmount, currency)} en retard
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {bfrStudents.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>BFR par etudiant</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y max-h-[600px] overflow-y-auto">
                  {bfrStudents.map((student) => (
                    <div key={student.studentId} className="flex items-center justify-between p-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{student.studentName}</span>
                          {student.overdueAmount > 0 && (
                            <Badge variant="error" className="text-xs">
                              Retard
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {student.email}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Devis: {formatAmount(student.totalQuote, student.currency)} |
                          Paye: {formatAmount(student.totalPaid, student.currency)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          {formatAmount(student.totalRemaining, student.currency)}
                        </div>
                        <div className="text-xs text-muted-foreground">restant</div>
                        {student.overdueAmount > 0 && (
                          <div className="text-xs text-destructive">
                            {formatAmount(student.overdueAmount, student.currency)} en retard
                          </div>
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
                <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">Aucun encours etudiant</p>
              </CardContent>
            </Card>
          )}

          {/* Upcoming Payments */}
          {upcomingPayments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Echeances dans les 30 prochains jours
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {upcomingPayments.slice(0, 10).map((payment, i) => (
                    <div key={i} className="flex items-center justify-between p-4">
                      <div>
                        <div className="font-medium">{payment.studentName}</div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(payment.dueDate)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          {formatAmount(payment.amount, payment.currency)}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Treasury Tab */}
        <TabsContent value="treasury" className="space-y-4">
          {cashflowAccounts.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {cashflowAccounts.map((account) => (
                <Card key={account.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                          <Wallet className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{account.accountName}</div>
                          {account.bankName && (
                            <div className="text-xs text-muted-foreground">{account.bankName}</div>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline">{account.currency}</Badge>
                    </div>
                    <div className={`text-xl font-bold ${account.balance >= 0 ? "" : "text-destructive"}`}>
                      {formatAmount(account.balance, account.currency)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {account.owner} - {account.accountType === "CASH" ? "Especes" : "Banque"}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Wallet className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">Aucun compte admin</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
