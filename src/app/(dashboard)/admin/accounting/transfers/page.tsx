"use client";

import { useState, useEffect } from "react";
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
  ArrowLeftRight,
  ArrowRight,
  Loader2,
  Plus,
  RefreshCcw,
  Wallet,
} from "lucide-react";

interface Transfer {
  id: string;
  transactionNumber: string;
  date: string;
  amount: number;
  currency: string;
  sourceAccount: {
    id: string;
    accountName: string;
    bankName: string | null;
    currency: string;
  } | null;
  destinationAccount: {
    id: string;
    accountName: string;
    bankName: string | null;
    currency: string;
  } | null;
  description: string | null;
  notes: string | null;
  creator: string;
  createdAt: string;
}

interface FxOperation {
  id: string;
  transactionNumber: string;
  date: string;
  fromAmount: number;
  fromCurrency: string;
  fromAccount: {
    id: string;
    accountName: string;
    bankName: string | null;
    currency: string;
  } | null;
  toAmount: number;
  toCurrency: string;
  toAccount: {
    id: string;
    accountName: string;
    bankName: string | null;
    currency: string;
  } | null;
  exchangeRate: number | null;
  fxFees: number | null;
  description: string | null;
  creator: string;
  createdAt: string;
}

interface BankAccount {
  id: string;
  accountName: string;
  bankName: string | null;
  currency: string;
  balance: number;
}

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [fxOperations, setFxOperations] = useState<FxOperation[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [isFxDialogOpen, setIsFxDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Transfer form state
  const [transferForm, setTransferForm] = useState({
    sourceAccountId: "",
    destinationAccountId: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
    notes: "",
  });

  // FX form state
  const [fxForm, setFxForm] = useState({
    fromAccountId: "",
    toAccountId: "",
    fromAmount: "",
    toAmount: "",
    exchangeRate: "",
    fxFees: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
    notes: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [transfersRes, fxRes, accountsRes] = await Promise.all([
        fetch("/api/admin/accounting/transfers"),
        fetch("/api/admin/accounting/fx-exchange"),
        fetch("/api/admin/accounting/bank-accounts"),
      ]);

      if (transfersRes.ok) {
        const data = await transfersRes.json();
        setTransfers(data.transfers);
      }
      if (fxRes.ok) {
        const data = await fxRes.json();
        setFxOperations(data.fxOperations);
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

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/accounting/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...transferForm,
          amount: Math.round(parseFloat(transferForm.amount) * 100),
        }),
      });
      if (res.ok) {
        setIsTransferDialogOpen(false);
        setTransferForm({
          sourceAccountId: "",
          destinationAccountId: "",
          amount: "",
          date: new Date().toISOString().split("T")[0],
          description: "",
          notes: "",
        });
        fetchData();
      } else {
        const error = await res.json();
        alert(error.error || "Erreur lors du transfert");
      }
    } catch (error) {
      console.error("Error creating transfer:", error);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFxExchange(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/accounting/fx-exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...fxForm,
          fromAmount: Math.round(parseFloat(fxForm.fromAmount) * 100),
          toAmount: Math.round(parseFloat(fxForm.toAmount) * 100),
          exchangeRate: fxForm.exchangeRate ? parseFloat(fxForm.exchangeRate) : undefined,
          fxFees: fxForm.fxFees ? Math.round(parseFloat(fxForm.fxFees) * 100) : undefined,
        }),
      });
      if (res.ok) {
        setIsFxDialogOpen(false);
        setFxForm({
          fromAccountId: "",
          toAccountId: "",
          fromAmount: "",
          toAmount: "",
          exchangeRate: "",
          fxFees: "",
          date: new Date().toISOString().split("T")[0],
          description: "",
          notes: "",
        });
        fetchData();
      } else {
        const error = await res.json();
        alert(error.error || "Erreur lors du change");
      }
    } catch (error) {
      console.error("Error creating FX exchange:", error);
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

  // Get accounts filtered by currency for transfer (same currency)
  const getTransferSourceAccounts = () => bankAccounts;
  const getTransferDestAccounts = (sourceCurrency: string) =>
    bankAccounts.filter((a) => a.currency === sourceCurrency);

  // Get selected source account for transfer
  const selectedTransferSource = bankAccounts.find((a) => a.id === transferForm.sourceAccountId);

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
        title="Transferts & Change"
        description="Gerez les transferts entre comptes et les operations de change"
        breadcrumbs={[
          { label: "Admin" },
          { label: "Comptabilite", href: "/admin/accounting" },
          { label: "Transferts" },
        ]}
        actions={
          <div className="flex gap-2">
            <Dialog open={isFxDialogOpen} onOpenChange={setIsFxDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Change de devise
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Operation de change</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleFxExchange} className="space-y-4">
                  <div>
                    <Label>Compte source</Label>
                    <Select
                      value={fxForm.fromAccountId}
                      onValueChange={(v) => setFxForm({ ...fxForm, fromAccountId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selectionner un compte" />
                      </SelectTrigger>
                      <SelectContent>
                        {bankAccounts.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.accountName} ({a.currency}) - {formatAmount(a.balance, a.currency)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Montant source</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={fxForm.fromAmount}
                      onChange={(e) => setFxForm({ ...fxForm, fromAmount: e.target.value })}
                      placeholder="Montant a changer"
                      required
                    />
                  </div>
                  <div className="flex justify-center">
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <Label>Compte destination</Label>
                    <Select
                      value={fxForm.toAccountId}
                      onValueChange={(v) => setFxForm({ ...fxForm, toAccountId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selectionner un compte" />
                      </SelectTrigger>
                      <SelectContent>
                        {bankAccounts
                          .filter((a) => {
                            const fromAccount = bankAccounts.find((b) => b.id === fxForm.fromAccountId);
                            return !fromAccount || a.currency !== fromAccount.currency;
                          })
                          .map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.accountName} ({a.currency})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Montant recu</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={fxForm.toAmount}
                      onChange={(e) => setFxForm({ ...fxForm, toAmount: e.target.value })}
                      placeholder="Montant apres change"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Taux (optionnel)</Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={fxForm.exchangeRate}
                        onChange={(e) => setFxForm({ ...fxForm, exchangeRate: e.target.value })}
                        placeholder="Auto-calcule"
                      />
                    </div>
                    <div>
                      <Label>Frais (optionnel)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={fxForm.fxFees}
                        onChange={(e) => setFxForm({ ...fxForm, fxFees: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={fxForm.date}
                      onChange={(e) => setFxForm({ ...fxForm, date: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Notes (optionnel)</Label>
                    <Textarea
                      value={fxForm.notes}
                      onChange={(e) => setFxForm({ ...fxForm, notes: e.target.value })}
                      placeholder="Details supplementaires..."
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Effectuer le change"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Transfert
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Nouveau transfert</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleTransfer} className="space-y-4">
                  <div>
                    <Label>Compte source</Label>
                    <Select
                      value={transferForm.sourceAccountId}
                      onValueChange={(v) => setTransferForm({ ...transferForm, sourceAccountId: v, destinationAccountId: "" })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selectionner un compte" />
                      </SelectTrigger>
                      <SelectContent>
                        {getTransferSourceAccounts().map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.accountName} ({a.currency}) - {formatAmount(a.balance, a.currency)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-center">
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <Label>Compte destination</Label>
                    <Select
                      value={transferForm.destinationAccountId}
                      onValueChange={(v) => setTransferForm({ ...transferForm, destinationAccountId: v })}
                      disabled={!selectedTransferSource}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={selectedTransferSource ? "Selectionner un compte" : "Choisissez d'abord le compte source"} />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedTransferSource &&
                          getTransferDestAccounts(selectedTransferSource.currency)
                            .filter((a) => a.id !== transferForm.sourceAccountId)
                            .map((a) => (
                              <SelectItem key={a.id} value={a.id}>
                                {a.accountName} ({a.currency})
                              </SelectItem>
                            ))}
                      </SelectContent>
                    </Select>
                    {selectedTransferSource && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Seuls les comptes en {selectedTransferSource.currency} sont affiches
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Montant</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={transferForm.amount}
                      onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={transferForm.date}
                      onChange={(e) => setTransferForm({ ...transferForm, date: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Description (optionnel)</Label>
                    <Input
                      value={transferForm.description}
                      onChange={(e) => setTransferForm({ ...transferForm, description: e.target.value })}
                      placeholder="Motif du transfert"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Effectuer le transfert"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold font-display">{transfers.length}</div>
            <p className="text-sm text-muted-foreground">Transferts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold font-display">{fxOperations.length}</div>
            <p className="text-sm text-muted-foreground">Operations de change</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold font-display">{bankAccounts.length}</div>
            <p className="text-sm text-muted-foreground">Comptes actifs</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transfers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transfers">
            <ArrowLeftRight className="mr-2 h-4 w-4" />
            Transferts ({transfers.length})
          </TabsTrigger>
          <TabsTrigger value="fx">
            <RefreshCcw className="mr-2 h-4 w-4" />
            Change ({fxOperations.length})
          </TabsTrigger>
        </TabsList>

        {/* Transfers Tab */}
        <TabsContent value="transfers" className="space-y-4">
          {transfers.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Historique des transferts</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {transfers.map((transfer) => (
                    <div key={transfer.id} className="flex items-center gap-4 p-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <ArrowLeftRight className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {transfer.transactionNumber}
                          </code>
                          <Badge variant="secondary">{transfer.currency}</Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-sm">
                          <span className="flex items-center gap-1">
                            <Wallet className="h-3.5 w-3.5" />
                            {transfer.sourceAccount?.accountName || "?"}
                          </span>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="flex items-center gap-1">
                            <Wallet className="h-3.5 w-3.5" />
                            {transfer.destinationAccount?.accountName || "?"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(transfer.date)} - par {transfer.creator}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {formatAmount(transfer.amount, transfer.currency)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <ArrowLeftRight className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">Aucun transfert enregistre</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* FX Tab */}
        <TabsContent value="fx" className="space-y-4">
          {fxOperations.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Historique des operations de change</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {fxOperations.map((fx) => (
                    <div key={fx.id} className="flex items-center gap-4 p-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                        <RefreshCcw className="h-5 w-5 text-warning" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {fx.transactionNumber}
                          </code>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-sm">
                          <span>{fx.fromAccount?.accountName || "?"}</span>
                          <span className="text-error">-{formatAmount(fx.fromAmount, fx.fromCurrency)}</span>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{fx.toAccount?.accountName || "?"}</span>
                          <span className="text-success">+{formatAmount(fx.toAmount, fx.toCurrency)}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                          <span>{formatDate(fx.date)}</span>
                          {fx.exchangeRate && (
                            <span>Taux: {fx.exchangeRate.toFixed(4)}</span>
                          )}
                          {fx.fxFees && fx.fxFees > 0 && (
                            <span>Frais: {formatAmount(fx.fxFees, fx.fromCurrency)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <RefreshCcw className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">Aucune operation de change</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
