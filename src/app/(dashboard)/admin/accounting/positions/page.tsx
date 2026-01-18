"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout";
import { AccountingNav } from "@/components/accounting/accounting-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  ArrowRight,
  Loader2,
  Plus,
  Users,
  Wallet,
  TrendingUp,
  TrendingDown,
  Scale,
  PiggyBank,
  AlertCircle,
} from "lucide-react";

interface Position {
  id: string;
  currency: string;
  advanced: number;
  received: number;
  balance: number;
  asOfDate: string;
}

interface AdminPosition {
  admin: {
    id: string;
    name: string;
    email: string;
  };
  positions: Position[];
  totalBalance: Record<string, number>;
}

interface GlobalTotals {
  [currency: string]: {
    advanced: number;
    received: number;
    balance: number;
  };
}

interface RebalancingSuggestion {
  fromAdmin: string;
  toAdmin: string;
  amount: number;
  currency: string;
}

interface Distribution {
  id: string;
  totalAmount: number;
  currency: string;
  investmentAmount: number;
  distributedAmount: number;
  distributionDate: string;
  notes: string | null;
  founderDistributions: {
    id: string;
    founder: string;
    founderId: string;
    amount: number;
    percentage: number;
  }[];
  hasTransactions: boolean;
  createdAt: string;
}

interface Admin {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

interface BankAccount {
  id: string;
  accountName: string;
  bankName: string | null;
  currency: string;
  balance: number;
}

export default function PositionsPage() {
  const [positions, setPositions] = useState<AdminPosition[]>([]);
  const [globalTotals, setGlobalTotals] = useState<GlobalTotals>({});
  const [rebalancingSuggestions, setRebalancingSuggestions] = useState<RebalancingSuggestion[]>([]);
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDistributionDialogOpen, setIsDistributionDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Distribution form state
  const [distributionForm, setDistributionForm] = useState({
    totalAmount: "",
    currency: "EUR",
    investmentAmount: "0",
    distributionDate: new Date().toISOString().split("T")[0],
    notes: "",
    sourceAccountId: "",
    founders: [] as { founderId: string; percentage: string }[],
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [positionsRes, distributionsRes, accountsRes] = await Promise.all([
        fetch("/api/admin/accounting/positions"),
        fetch("/api/admin/accounting/distributions"),
        fetch("/api/admin/accounting/bank-accounts"),
      ]);

      if (positionsRes.ok) {
        const data = await positionsRes.json();
        setPositions(data.positions);
        setGlobalTotals(data.globalTotals);
        setRebalancingSuggestions(data.rebalancingSuggestions);

        // Extract admins from positions
        const adminsList = data.positions.map((p: AdminPosition) => ({
          id: p.admin.id,
          name: p.admin.name,
          email: p.admin.email,
        }));
        setAdmins(adminsList);

        // Initialize founders in form with all admins at equal percentage
        if (adminsList.length > 0 && distributionForm.founders.length === 0) {
          const equalPercentage = (100 / adminsList.length).toFixed(2);
          setDistributionForm(prev => ({
            ...prev,
            founders: adminsList.map((a: Admin) => ({
              founderId: a.id,
              percentage: equalPercentage,
            })),
          }));
        }
      }

      if (distributionsRes.ok) {
        const data = await distributionsRes.json();
        setDistributions(data.distributions);
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
  }, [distributionForm.founders.length]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleCreateDistribution(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/accounting/distributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totalAmount: Math.round(parseFloat(distributionForm.totalAmount) * 100),
          currency: distributionForm.currency,
          investmentAmount: Math.round(parseFloat(distributionForm.investmentAmount || "0") * 100),
          distributionDate: distributionForm.distributionDate,
          notes: distributionForm.notes || undefined,
          sourceAccountId: distributionForm.sourceAccountId || undefined,
          founders: distributionForm.founders.map((f) => ({
            founderId: f.founderId,
            percentage: parseFloat(f.percentage),
          })),
        }),
      });

      if (res.ok) {
        setIsDistributionDialogOpen(false);
        // Reset form but keep founders
        setDistributionForm(prev => ({
          ...prev,
          totalAmount: "",
          investmentAmount: "0",
          distributionDate: new Date().toISOString().split("T")[0],
          notes: "",
          sourceAccountId: "",
        }));
        fetchData();
      } else {
        const error = await res.json();
        alert(error.error || "Erreur lors de la creation");
      }
    } catch (error) {
      console.error("Error creating distribution:", error);
    } finally {
      setSubmitting(false);
    }
  }

  const updateFounderPercentage = (founderId: string, percentage: string) => {
    setDistributionForm(prev => ({
      ...prev,
      founders: prev.founders.map((f) =>
        f.founderId === founderId ? { ...f, percentage } : f
      ),
    }));
  };

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

  // Calculate total percentage
  const totalPercentage = distributionForm.founders.reduce(
    (acc, f) => acc + (parseFloat(f.percentage) || 0),
    0
  );

  // Get accounts by currency
  const getAccountsByCurrency = (currency: string) =>
    bankAccounts.filter((a) => a.currency === currency);

  // Calculate distribution preview
  const totalAmount = parseFloat(distributionForm.totalAmount || "0") * 100;
  const investmentAmount = parseFloat(distributionForm.investmentAmount || "0") * 100;
  const distributedAmount = totalAmount - investmentAmount;

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
        title="Positions & Distributions"
        description="Positions des fondateurs et historique des distributions"
        breadcrumbs={[
          { label: "Admin" },
          { label: "Comptabilite", href: "/admin/accounting" },
          { label: "Positions" },
        ]}
        actions={
          <Dialog open={isDistributionDialogOpen} onOpenChange={setIsDistributionDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Distribution
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Nouvelle distribution</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateDistribution} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Montant total</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={distributionForm.totalAmount}
                      onChange={(e) =>
                        setDistributionForm({ ...distributionForm, totalAmount: e.target.value })
                      }
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                    <Label>Devise</Label>
                    <Select
                      value={distributionForm.currency}
                      onValueChange={(v) =>
                        setDistributionForm({ ...distributionForm, currency: v, sourceAccountId: "" })
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Part investissement</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={distributionForm.investmentAmount}
                      onChange={(e) =>
                        setDistributionForm({ ...distributionForm, investmentAmount: e.target.value })
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={distributionForm.distributionDate}
                      onChange={(e) =>
                        setDistributionForm({ ...distributionForm, distributionDate: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                {totalAmount > 0 && (
                  <div className="bg-muted/50 p-3 rounded-lg text-sm">
                    <div className="flex justify-between">
                      <span>Montant total:</span>
                      <span className="font-medium">
                        {formatAmount(totalAmount, distributionForm.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>- Investissement:</span>
                      <span>{formatAmount(investmentAmount, distributionForm.currency)}</span>
                    </div>
                    <div className="flex justify-between font-medium border-t mt-2 pt-2">
                      <span>= A distribuer:</span>
                      <span>{formatAmount(distributedAmount, distributionForm.currency)}</span>
                    </div>
                  </div>
                )}

                <div>
                  <Label>Repartition par fondateur</Label>
                  <div className="space-y-2 mt-2">
                    {distributionForm.founders.map((f) => {
                      const admin = admins.find((a) => a.id === f.founderId);
                      const amount = (distributedAmount * (parseFloat(f.percentage) || 0)) / 100;
                      return (
                        <div key={f.founderId} className="flex items-center gap-2">
                          <span className="flex-1 text-sm">{admin?.name || admin?.email}</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            className="w-20"
                            value={f.percentage}
                            onChange={(e) => updateFounderPercentage(f.founderId, e.target.value)}
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                          {distributedAmount > 0 && (
                            <span className="text-sm text-muted-foreground w-24 text-right">
                              {formatAmount(amount, distributionForm.currency)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                    <div
                      className={`text-sm font-medium ${
                        Math.abs(totalPercentage - 100) > 0.01 ? "text-destructive" : "text-success"
                      }`}
                    >
                      Total: {totalPercentage.toFixed(2)}%
                      {Math.abs(totalPercentage - 100) > 0.01 && " (doit etre 100%)"}
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Compte source (optionnel)</Label>
                  <Select
                    value={distributionForm.sourceAccountId}
                    onValueChange={(v) =>
                      setDistributionForm({ ...distributionForm, sourceAccountId: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Aucun (pas de transaction)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Aucun</SelectItem>
                      {getAccountsByCurrency(distributionForm.currency).map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.accountName} - {formatAmount(a.balance, a.currency)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Si selectionne, une transaction sera creee
                  </p>
                </div>

                <div>
                  <Label>Notes (optionnel)</Label>
                  <Textarea
                    value={distributionForm.notes}
                    onChange={(e) =>
                      setDistributionForm({ ...distributionForm, notes: e.target.value })
                    }
                    placeholder="Details supplementaires..."
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={submitting || Math.abs(totalPercentage - 100) > 0.01}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Creer la distribution"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Global Totals Summary */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold font-display">{positions.length}</span>
            </div>
            <p className="text-sm text-muted-foreground">Fondateurs</p>
          </CardContent>
        </Card>
        {Object.entries(globalTotals).map(([currency, totals]) => (
          <Card key={currency}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <Badge variant="outline">{currency}</Badge>
                <span
                  className={`text-lg font-bold ${
                    totals.balance > 0
                      ? "text-success"
                      : totals.balance < 0
                      ? "text-destructive"
                      : ""
                  }`}
                >
                  {totals.balance > 0 ? "+" : ""}
                  {formatAmount(totals.balance, currency)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>Avance: {formatAmount(totals.advanced, currency)}</span>
                <span>Recu: {formatAmount(totals.received, currency)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Rebalancing Suggestions */}
      {rebalancingSuggestions.length > 0 && (
        <Card className="mb-6 border-warning/50 bg-warning/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-warning">
              <Scale className="h-5 w-5" />
              Suggestions de reequilibrage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {rebalancingSuggestions.map((suggestion, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  <span className="font-medium">{suggestion.fromAdmin}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{suggestion.toAdmin}</span>
                  <Badge variant="outline" className="ml-auto">
                    {formatAmount(suggestion.amount, suggestion.currency)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="positions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="positions">
            <Wallet className="mr-2 h-4 w-4" />
            Positions ({positions.length})
          </TabsTrigger>
          <TabsTrigger value="distributions">
            <PiggyBank className="mr-2 h-4 w-4" />
            Distributions ({distributions.length})
          </TabsTrigger>
        </TabsList>

        {/* Positions Tab */}
        <TabsContent value="positions" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {positions.map((adminPos) => (
              <Card key={adminPos.admin.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="text-base">{adminPos.admin.name}</div>
                      <div className="text-xs font-normal text-muted-foreground">
                        {adminPos.admin.email}
                      </div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {adminPos.positions.map((pos) => (
                      <div key={pos.id} className="flex items-center justify-between">
                        <Badge variant="outline">{pos.currency}</Badge>
                        <div className="text-right">
                          <div
                            className={`font-semibold flex items-center gap-1 ${
                              pos.balance > 0
                                ? "text-success"
                                : pos.balance < 0
                                ? "text-destructive"
                                : ""
                            }`}
                          >
                            {pos.balance > 0 ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : pos.balance < 0 ? (
                              <TrendingDown className="h-4 w-4" />
                            ) : null}
                            {pos.balance > 0 ? "+" : ""}
                            {formatAmount(pos.balance, pos.currency)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Avance: {formatAmount(pos.advanced, pos.currency)} | Recu:{" "}
                            {formatAmount(pos.received, pos.currency)}
                          </div>
                        </div>
                      </div>
                    ))}
                    {adminPos.positions.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        Aucune position
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {positions.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">Aucune position enregistree</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Distributions Tab */}
        <TabsContent value="distributions" className="space-y-4">
          {distributions.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Historique des distributions</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {distributions.map((dist) => (
                    <div key={dist.id} className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{dist.currency}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(dist.distributionDate)}
                            </span>
                            {dist.hasTransactions && (
                              <Badge variant="secondary" className="text-xs">
                                Transaction
                              </Badge>
                            )}
                          </div>
                          {dist.notes && (
                            <p className="text-sm text-muted-foreground mt-1">{dist.notes}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            {formatAmount(dist.totalAmount, dist.currency)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Distribue: {formatAmount(dist.distributedAmount, dist.currency)}
                            {dist.investmentAmount > 0 && (
                              <> | Investi: {formatAmount(dist.investmentAmount, dist.currency)}</>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {dist.founderDistributions.map((fd) => (
                          <div
                            key={fd.id}
                            className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5 text-sm"
                          >
                            <span className="font-medium">{fd.founder}</span>
                            <span className="text-muted-foreground">{fd.percentage}%</span>
                            <span className="font-semibold">
                              {formatAmount(fd.amount, dist.currency)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <PiggyBank className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">Aucune distribution enregistree</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
