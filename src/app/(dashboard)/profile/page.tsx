"use client";

import { useState, useEffect, useRef } from "react";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { authClient } from "@/lib/auth-client";
import { ROLE_DISPLAY_NAMES } from "@/lib/utils";
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
import {
  User,
  Mail,
  Phone,
  Shield,
  Bell,
  Lock,
  Loader2,
  Save,
  CheckCircle,
  Wallet,
  Plus,
  Trash2,
  Building,
  Camera,
  X,
} from "lucide-react";

interface UserProfile {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  image: string | null;
  role: string;
  emailVerified: boolean;
  createdAt: string;
}

interface BankAccount {
  id: string;
  accountName: string;
  bankName: string | null;
  currency: string;
  accountType: string;
  iban: string | null;
  country: string | null;
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
  });
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    courseReminders: true,
    taskReminders: true,
  });

  // Profile image state
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bank accounts state
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [isAddAccountDialogOpen, setIsAddAccountDialogOpen] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);
  const [newAccount, setNewAccount] = useState({
    accountName: "",
    bankName: "",
    currency: "EUR",
    accountType: "BANK",
    iban: "",
    country: "",
  });

  // Handle profile image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith("image/")) {
      alert("Veuillez sélectionner une image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("L'image ne doit pas dépasser 5MB");
      return;
    }

    setUploadingImage(true);
    try {
      // Upload to Vercel Blob
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "profiles");

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error("Erreur lors de l'upload");
      }

      const { url } = await uploadRes.json();

      // Update user profile with new image URL
      const updateRes = await fetch("/api/profile/image", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: url }),
      });

      if (updateRes.ok) {
        setUser((prev) => prev ? { ...prev, image: url } : null);
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Erreur lors de l'upload de l'image");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handle remove profile image
  const handleRemoveImage = async () => {
    if (!confirm("Supprimer votre photo de profil ?")) return;

    setUploadingImage(true);
    try {
      const res = await fetch("/api/profile/image", {
        method: "DELETE",
      });

      if (res.ok) {
        setUser((prev) => prev ? { ...prev, image: null } : null);
      }
    } catch (error) {
      console.error("Error removing image:", error);
    } finally {
      setUploadingImage(false);
    }
  };

  async function fetchBankAccounts() {
    setLoadingAccounts(true);
    try {
      const res = await fetch("/api/profile/bank-accounts");
      if (res.ok) {
        const data = await res.json();
        setBankAccounts(data.accounts);
      }
    } catch (error) {
      console.error("Error fetching bank accounts:", error);
    } finally {
      setLoadingAccounts(false);
    }
  }

  async function handleAddAccount(e: React.FormEvent) {
    e.preventDefault();
    setSavingAccount(true);
    try {
      const res = await fetch("/api/profile/bank-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountName: newAccount.accountName,
          bankName: newAccount.bankName || undefined,
          currency: newAccount.currency,
          accountType: newAccount.accountType,
          iban: newAccount.iban || undefined,
          country: newAccount.country || undefined,
        }),
      });
      if (res.ok) {
        setIsAddAccountDialogOpen(false);
        setNewAccount({
          accountName: "",
          bankName: "",
          currency: "EUR",
          accountType: "BANK",
          iban: "",
          country: "",
        });
        fetchBankAccounts();
      } else {
        const error = await res.json();
        alert(error.error || "Erreur lors de l'ajout");
      }
    } catch (error) {
      console.error("Error adding account:", error);
    } finally {
      setSavingAccount(false);
    }
  }

  async function handleDeleteAccount(accountId: string) {
    if (!confirm("Supprimer ce compte bancaire ?")) return;
    try {
      const res = await fetch(`/api/profile/bank-accounts/${accountId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchBankAccounts();
      }
    } catch (error) {
      console.error("Error deleting account:", error);
    }
  }

  useEffect(() => {
    async function fetchProfile() {
      try {
        const session = await authClient.getSession();
        if (session?.data?.user) {
          const user = session.data.user as unknown as UserProfile;
          setUser(user);
          setFormData({
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            phone: user.phone || "",
          });
          // Fetch bank accounts for non-admin users
          if (user.role !== "ADMIN") {
            fetchBankAccounts();
          }
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const handleSaveProfile = async () => {
    if (!user) return;

    setSaving(true);
    setSaved(false);
    try {
      // Update user via API
      await authClient.updateUser({
        name: `${formData.firstName} ${formData.lastName}`.trim(),
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-performup-blue" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Profil non disponible</p>
      </div>
    );
  }

  const roleLabel = ROLE_DISPLAY_NAMES[user.role] || user.role;

  return (
    <>
      <PageHeader
        title="Mon profil"
        description="Gérez vos informations personnelles et préférences"
        breadcrumbs={[{ label: "Profil" }]}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                {/* Profile Image with Upload */}
                <div className="relative mb-4 group">
                  {user.image ? (
                    <img
                      src={user.image}
                      alt={user.name || "Photo de profil"}
                      className="h-24 w-24 rounded-full object-cover border-4 border-background shadow-lg"
                    />
                  ) : (
                    <UserAvatar
                      name={user.name || user.email}
                      size="xl"
                    />
                  )}

                  {/* Upload overlay */}
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                    {uploadingImage ? (
                      <Loader2 className="h-6 w-6 animate-spin text-white" />
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-full text-white hover:bg-white/20"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Camera className="h-5 w-5" />
                      </Button>
                    )}
                  </div>

                  {/* Remove button */}
                  {user.image && !uploadingImage && (
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-1 -right-1 h-6 w-6 rounded-full shadow-md"
                      onClick={handleRemoveImage}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}

                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>

                {/* Change photo button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="mb-4"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Upload...
                    </>
                  ) : (
                    <>
                      <Camera className="mr-2 h-4 w-4" />
                      Changer la photo
                    </>
                  )}
                </Button>

                <h2 className="text-xl font-display font-semibold">
                  {user.name || user.email}
                </h2>
                <p className="text-sm text-muted-foreground mb-3">
                  {user.email}
                </p>
                <Badge variant="secondary">{roleLabel}</Badge>

                <Separator className="my-6" />

                <div className="w-full space-y-3 text-left">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{user.email}</span>
                    {user.emailVerified && (
                      <CheckCircle className="h-4 w-4 text-success ml-auto" />
                    )}
                  </div>
                  {user.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{user.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{roleLabel}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informations personnelles
              </CardTitle>
              <CardDescription>
                Mettez à jour vos informations de profil
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Prénom</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          firstName: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nom</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          lastName: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={user.email} disabled />
                  <p className="text-xs text-muted-foreground">
                    L&apos;email ne peut pas être modifié
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    placeholder="+33 6 12 34 56 78"
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveProfile} disabled={saving}>
                    {saving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : saved ? (
                      <CheckCircle className="mr-2 h-4 w-4" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    {saved ? "Enregistré" : "Enregistrer"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
              <CardDescription>
                Gérez vos préférences de notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Notifications par email</p>
                    <p className="text-sm text-muted-foreground">
                      Recevez des emails pour les événements importants
                    </p>
                  </div>
                  <Switch
                    checked={notifications.email}
                    onCheckedChange={(checked) =>
                      setNotifications((prev) => ({ ...prev, email: checked }))
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Notifications push</p>
                    <p className="text-sm text-muted-foreground">
                      Recevez des notifications dans le navigateur
                    </p>
                  </div>
                  <Switch
                    checked={notifications.push}
                    onCheckedChange={(checked) =>
                      setNotifications((prev) => ({ ...prev, push: checked }))
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Rappels de cours</p>
                    <p className="text-sm text-muted-foreground">
                      Rappels 24h et 1h avant les cours
                    </p>
                  </div>
                  <Switch
                    checked={notifications.courseReminders}
                    onCheckedChange={(checked) =>
                      setNotifications((prev) => ({
                        ...prev,
                        courseReminders: checked,
                      }))
                    }
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Rappels de tâches</p>
                    <p className="text-sm text-muted-foreground">
                      Rappels pour les tâches à échéance proche
                    </p>
                  </div>
                  <Switch
                    checked={notifications.taskReminders}
                    onCheckedChange={(checked) =>
                      setNotifications((prev) => ({
                        ...prev,
                        taskReminders: checked,
                      }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Sécurité
              </CardTitle>
              <CardDescription>
                Gérez la sécurité de votre compte
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Mot de passe</p>
                    <p className="text-sm text-muted-foreground">
                      Dernière modification il y a plus de 30 jours
                    </p>
                  </div>
                  <Button variant="outline">Modifier</Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Sessions actives</p>
                    <p className="text-sm text-muted-foreground">
                      1 session active
                    </p>
                  </div>
                  <Button variant="outline">Voir</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bank Accounts - For non-admin users */}
          {user.role !== "ADMIN" && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Wallet className="h-5 w-5" />
                      Coordonnees bancaires
                    </CardTitle>
                    <CardDescription>
                      Gerez vos comptes pour recevoir vos paiements
                    </CardDescription>
                  </div>
                  <Dialog open={isAddAccountDialogOpen} onOpenChange={setIsAddAccountDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Ajouter
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Ajouter un compte bancaire</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleAddAccount} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="accountName">Nom du compte *</Label>
                          <Input
                            id="accountName"
                            value={newAccount.accountName}
                            onChange={(e) =>
                              setNewAccount((prev) => ({
                                ...prev,
                                accountName: e.target.value,
                              }))
                            }
                            placeholder="Mon compte principal"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="accountType">Type de compte</Label>
                            <Select
                              value={newAccount.accountType}
                              onValueChange={(value) =>
                                setNewAccount((prev) => ({
                                  ...prev,
                                  accountType: value,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="BANK">Compte bancaire</SelectItem>
                                <SelectItem value="CASH">Especes</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="currency">Devise</Label>
                            <Select
                              value={newAccount.currency}
                              onValueChange={(value) =>
                                setNewAccount((prev) => ({
                                  ...prev,
                                  currency: value,
                                }))
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

                        <div className="space-y-2">
                          <Label htmlFor="bankName">Nom de la banque</Label>
                          <Input
                            id="bankName"
                            value={newAccount.bankName}
                            onChange={(e) =>
                              setNewAccount((prev) => ({
                                ...prev,
                                bankName: e.target.value,
                              }))
                            }
                            placeholder="CIH, Revolut, LCL..."
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="iban">IBAN</Label>
                          <Input
                            id="iban"
                            value={newAccount.iban}
                            onChange={(e) =>
                              setNewAccount((prev) => ({
                                ...prev,
                                iban: e.target.value,
                              }))
                            }
                            placeholder="FR76..."
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="country">Pays</Label>
                          <Select
                            value={newAccount.country}
                            onValueChange={(value) =>
                              setNewAccount((prev) => ({
                                ...prev,
                                country: value,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selectionnez" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="FR">France</SelectItem>
                              <SelectItem value="MA">Maroc</SelectItem>
                              <SelectItem value="US">Etats-Unis</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsAddAccountDialogOpen(false)}
                          >
                            Annuler
                          </Button>
                          <Button type="submit" disabled={savingAccount}>
                            {savingAccount && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Ajouter
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {loadingAccounts ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : bankAccounts.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Building className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Aucun compte bancaire enregistre</p>
                    <p className="text-sm">
                      Ajoutez un compte pour recevoir vos paiements
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bankAccounts.map((account) => (
                      <div
                        key={account.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-muted rounded-lg">
                            {account.accountType === "BANK" ? (
                              <Building className="h-4 w-4" />
                            ) : (
                              <Wallet className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{account.accountName}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              {account.bankName && (
                                <span>{account.bankName}</span>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {account.currency}
                              </Badge>
                              {account.country && (
                                <span className="text-xs">{account.country}</span>
                              )}
                            </div>
                            {account.iban && (
                              <p className="text-xs text-muted-foreground font-mono">
                                {account.iban}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteAccount(account.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

