"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout";
import { AccountingNav } from "@/components/accounting/accounting-nav";
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
import {
  Plus,
  Building2,
  Wallet,
  Loader2,
  ChevronRight,
  User,
  Edit,
  Trash2,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BankAccount {
  id: string;
  accountName: string;
  accountType: "BANK" | "CASH";
  bankName: string | null;
  currency: string;
  country: string | null;
  iban: string | null;
  isActive: boolean;
  isAdminOwned: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
  balance: number;
  transactionCount: number;
}

interface AdminUser {
  id: string;
  name: string | null;
  email: string;
}

const CURRENCIES = ["EUR", "MAD", "USD"] as const;
const ACCOUNT_TYPES = [
  { value: "BANK", label: "Compte bancaire" },
  { value: "CASH", label: "Caisse" },
] as const;

const COUNTRIES = [
  { value: "FR", label: "France" },
  { value: "MA", label: "Maroc" },
  { value: "US", label: "Etats-Unis" },
] as const;

export default function BankAccountsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [activeCurrency, setActiveCurrency] = useState<string>("EUR");

  // Dialog states
  const [newAccountOpen, setNewAccountOpen] = useState(false);
  const [editAccountOpen, setEditAccountOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [creating, setCreating] = useState(false);

  // Admin users for account creation
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);

  // Form state
  const [newAccount, setNewAccount] = useState({
    userId: "",
    accountType: "BANK",
    bankName: "",
    accountName: "",
    currency: "EUR",
    country: "",
    iban: "",
    isAdminOwned: true,
  });

  useEffect(() => {
    fetchAccounts();
    fetchAdminUsers();
  }, []);

  async function fetchAccounts() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/accounting/bank-accounts");
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
        setTotals(data.totals || {});
      }
    } catch (error) {
      console.error("Error fetching bank accounts:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAdminUsers() {
    try {
      const res = await fetch("/api/admin/users?role=ADMIN&limit=50");
      if (res.ok) {
        const data = await res.json();
        setAdminUsers(
          data.users?.map((u: { id: string; name: string | null; email: string }) => ({
            id: u.id,
            name: u.name,
            email: u.email,
          })) || []
        );
      }
    } catch (error) {
      console.error("Error fetching admin users:", error);
    }
  }

  const handleCreateAccount = async () => {
    if (!newAccount.userId || !newAccount.accountName || !newAccount.currency) return;

    setCreating(true);
    try {
      const response = await fetch("/api/admin/accounting/bank-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: newAccount.userId,
          accountType: newAccount.accountType,
          bankName: newAccount.bankName || null,
          accountName: newAccount.accountName,
          currency: newAccount.currency,
          country: newAccount.country || null,
          iban: newAccount.iban || null,
          isAdminOwned: newAccount.isAdminOwned,
        }),
      });

      if (response.ok) {
        setNewAccountOpen(false);
        setNewAccount({
          userId: "",
          accountType: "BANK",
          bankName: "",
          accountName: "",
          currency: "EUR",
          country: "",
          iban: "",
          isAdminOwned: true,
        });
        fetchAccounts();
      } else {
        const data = await response.json();
        alert(data.error || "Erreur lors de la creation");
      }
    } catch (error) {
      console.error("Error creating account:", error);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateAccount = async () => {
    if (!selectedAccount) return;

    setCreating(true);
    try {
      const response = await fetch(
        `/api/admin/accounting/bank-accounts/${selectedAccount.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountName: selectedAccount.accountName,
            bankName: selectedAccount.bankName,
            country: selectedAccount.country,
            iban: selectedAccount.iban,
            isActive: selectedAccount.isActive,
          }),
        }
      );

      if (response.ok) {
        setEditAccountOpen(false);
        setSelectedAccount(null);
        fetchAccounts();
      } else {
        const data = await response.json();
        alert(data.error || "Erreur lors de la mise a jour");
      }
    } catch (error) {
      console.error("Error updating account:", error);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!confirm("Voulez-vous vraiment supprimer ce compte ?")) return;

    try {
      const response = await fetch(
        `/api/admin/accounting/bank-accounts/${accountId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        fetchAccounts();
      } else {
        const data = await response.json();
        alert(data.error || "Erreur lors de la suppression");
      }
    } catch (error) {
      console.error("Error deleting account:", error);
    }
  };

  const formatAccountBalance = (balance: number, currency: string) => {
    const symbols: Record<string, string> = { EUR: "EUR", MAD: "MAD", USD: "USD" };
    const formatted = (balance / 100).toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${formatted} ${symbols[currency] || currency}`;
  };

  const getAccountIcon = (accountType: string) => {
    return accountType === "BANK" ? (
      <Building2 className="h-5 w-5" />
    ) : (
      <Wallet className="h-5 w-5" />
    );
  };

  const filteredAccounts = accounts.filter((a) => a.currency === activeCurrency);
  const adminAccounts = filteredAccounts.filter((a) => a.isAdminOwned);
  const userAccounts = filteredAccounts.filter((a) => !a.isAdminOwned);

  return (
    <>
      <PageHeader
        title="Comptes bancaires"
        description="Gestion des comptes bancaires et caisses"
        breadcrumbs={[
          { label: "Admin" },
          { label: "Comptabilite", href: "/admin/accounting" },
          { label: "Comptes bancaires" },
        ]}
      />

      <AccountingNav />

      {/* Summary Cards by Currency */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        {CURRENCIES.map((currency) => (
          <Card
            key={currency}
            className={`cursor-pointer transition-colors ${
              activeCurrency === currency ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => setActiveCurrency(currency)}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{currency}</p>
                  <div className="text-2xl font-bold font-display">
                    {formatAccountBalance(totals[currency] || 0, currency)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {accounts.filter((a) => a.currency === currency).length} compte(s)
                  </p>
                </div>
                <ChevronRight
                  className={`h-5 w-5 transition-transform ${
                    activeCurrency === currency ? "rotate-90" : ""
                  }`}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">
              Comptes en {activeCurrency}
            </h2>
            <Button onClick={() => setNewAccountOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau compte
            </Button>
          </div>

          <Tabs defaultValue="admin" className="space-y-4">
            <TabsList>
              <TabsTrigger value="admin">
                <User className="mr-2 h-4 w-4" />
                Comptes Admin ({adminAccounts.length})
              </TabsTrigger>
              <TabsTrigger value="users">
                <User className="mr-2 h-4 w-4" />
                Comptes Utilisateurs ({userAccounts.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="admin" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {adminAccounts.length === 0 ? (
                  <Card className="col-span-full">
                    <CardContent className="py-12 text-center text-muted-foreground">
                      Aucun compte admin en {activeCurrency}
                    </CardContent>
                  </Card>
                ) : (
                  adminAccounts.map((account) => (
                    <AccountCard
                      key={account.id}
                      account={account}
                      onEdit={() => {
                        setSelectedAccount(account);
                        setEditAccountOpen(true);
                      }}
                      onDelete={() => handleDeleteAccount(account.id)}
                      formatBalance={formatAccountBalance}
                      getIcon={getAccountIcon}
                    />
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="users" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {userAccounts.length === 0 ? (
                  <Card className="col-span-full">
                    <CardContent className="py-12 text-center text-muted-foreground">
                      Aucun compte utilisateur en {activeCurrency}
                    </CardContent>
                  </Card>
                ) : (
                  userAccounts.map((account) => (
                    <AccountCard
                      key={account.id}
                      account={account}
                      onEdit={() => {
                        setSelectedAccount(account);
                        setEditAccountOpen(true);
                      }}
                      onDelete={() => handleDeleteAccount(account.id)}
                      formatBalance={formatAccountBalance}
                      getIcon={getAccountIcon}
                    />
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* New Account Dialog */}
      <Dialog open={newAccountOpen} onOpenChange={setNewAccountOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau compte</DialogTitle>
            <DialogDescription>
              Ajouter un nouveau compte bancaire ou caisse
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Proprietaire *</Label>
              <Select
                value={newAccount.userId}
                onValueChange={(value) =>
                  setNewAccount((prev) => ({ ...prev, userId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selectionner un admin" />
                </SelectTrigger>
                <SelectContent>
                  {adminUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select
                  value={newAccount.accountType}
                  onValueChange={(value) =>
                    setNewAccount((prev) => ({ ...prev, accountType: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Devise *</Label>
                <Select
                  value={newAccount.currency}
                  onValueChange={(value) =>
                    setNewAccount((prev) => ({ ...prev, currency: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nom du compte *</Label>
              <Input
                value={newAccount.accountName}
                onChange={(e) =>
                  setNewAccount((prev) => ({ ...prev, accountName: e.target.value }))
                }
                placeholder="ex: Revolut Karim"
              />
            </div>

            {newAccount.accountType === "BANK" && (
              <div className="space-y-2">
                <Label>Nom de la banque</Label>
                <Input
                  value={newAccount.bankName}
                  onChange={(e) =>
                    setNewAccount((prev) => ({ ...prev, bankName: e.target.value }))
                  }
                  placeholder="ex: Revolut, CIH, LCL..."
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pays</Label>
                <Select
                  value={newAccount.country}
                  onValueChange={(value) =>
                    setNewAccount((prev) => ({ ...prev, country: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country.value} value={country.value}>
                        {country.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>IBAN</Label>
                <Input
                  value={newAccount.iban}
                  onChange={(e) =>
                    setNewAccount((prev) => ({ ...prev, iban: e.target.value }))
                  }
                  placeholder="FR76..."
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewAccountOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleCreateAccount}
              disabled={
                creating ||
                !newAccount.userId ||
                !newAccount.accountName ||
                !newAccount.currency
              }
            >
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Creer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Account Dialog */}
      <Dialog open={editAccountOpen} onOpenChange={setEditAccountOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier le compte</DialogTitle>
            <DialogDescription>
              Modifier les informations du compte bancaire
            </DialogDescription>
          </DialogHeader>
          {selectedAccount && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nom du compte *</Label>
                <Input
                  value={selectedAccount.accountName}
                  onChange={(e) =>
                    setSelectedAccount((prev) =>
                      prev ? { ...prev, accountName: e.target.value } : null
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Nom de la banque</Label>
                <Input
                  value={selectedAccount.bankName || ""}
                  onChange={(e) =>
                    setSelectedAccount((prev) =>
                      prev ? { ...prev, bankName: e.target.value } : null
                    )
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pays</Label>
                  <Select
                    value={selectedAccount.country || ""}
                    onValueChange={(value) =>
                      setSelectedAccount((prev) =>
                        prev ? { ...prev, country: value } : null
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((country) => (
                        <SelectItem key={country.value} value={country.value}>
                          {country.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>IBAN</Label>
                  <Input
                    value={selectedAccount.iban || ""}
                    onChange={(e) =>
                      setSelectedAccount((prev) =>
                        prev ? { ...prev, iban: e.target.value } : null
                      )
                    }
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={selectedAccount.isActive}
                  onChange={(e) =>
                    setSelectedAccount((prev) =>
                      prev ? { ...prev, isActive: e.target.checked } : null
                    )
                  }
                  className="h-4 w-4"
                />
                <Label htmlFor="isActive">Compte actif</Label>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>Devise: {selectedAccount.currency} (non modifiable)</p>
                <p>Proprietaire: {selectedAccount.user.name || selectedAccount.user.email}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditAccountOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleUpdateAccount} disabled={creating}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Account Card Component
function AccountCard({
  account,
  onEdit,
  onDelete,
  formatBalance,
  getIcon,
}: {
  account: BankAccount;
  onEdit: () => void;
  onDelete: () => void;
  formatBalance: (balance: number, currency: string) => string;
  getIcon: (accountType: string) => React.ReactNode;
}) {
  return (
    <Card className={!account.isActive ? "opacity-60" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                account.accountType === "BANK" ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600"
              }`}
            >
              {getIcon(account.accountType)}
            </div>
            <div>
              <CardTitle className="text-base">{account.accountName}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {account.bankName || account.accountType === "CASH" ? "Caisse" : "Compte"}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Modifier
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <div className="text-2xl font-bold">
              {formatBalance(account.balance, account.currency)}
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {account.user.name || account.user.email}
            </span>
            <div className="flex gap-2">
              {account.country && (
                <Badge variant="outline">{account.country}</Badge>
              )}
              {!account.isActive && (
                <Badge variant="secondary">Inactif</Badge>
              )}
            </div>
          </div>
          {account.transactionCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {account.transactionCount} transaction(s)
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
