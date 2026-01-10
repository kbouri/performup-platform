"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle,
  Loader2,
  AlertCircle,
  UserPlus,
  Mail,
  Clock,
  XCircle,
} from "lucide-react";

interface InvitationData {
  id: string;
  email: string;
  role: string;
  professorType?: string;
  expiresAt: string;
  metadata?: {
    hourlyRate?: number;
    specialties?: string[];
    executiveChefId?: string;
  };
}

function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<
    "loading" | "valid" | "expired" | "accepted" | "error" | "success"
  >("loading");
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("Token d'invitation manquant");
      return;
    }

    // Verify invitation token
    fetch(`/api/admin/team/invitations?token=${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setStatus("error");
          setError(data.error);
        } else if (data.invitation) {
          const inv = data.invitation;
          if (inv.status === "ACCEPTED") {
            setStatus("accepted");
          } else if (
            inv.status === "EXPIRED" ||
            new Date(inv.expiresAt) < new Date()
          ) {
            setStatus("expired");
          } else if (inv.status === "CANCELLED") {
            setStatus("error");
            setError("Cette invitation a ete annulee");
          } else {
            setInvitation(inv);
            setStatus("valid");
          }
        } else {
          setStatus("error");
          setError("Invitation non trouvee");
        }
      })
      .catch(() => {
        setStatus("error");
        setError("Erreur lors de la verification de l'invitation");
      });
  }, [token]);

  const getRoleLabel = (role: string, professorType?: string) => {
    const labels: Record<string, string> = {
      MENTOR: "Mentor",
      PROFESSOR: professorType === "QUANT" ? "Professeur Quant" : "Professeur Verbal",
      EXECUTIVE_CHEF: "Chef Executif",
    };
    return labels[role] || role;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    if (formData.password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caracteres");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/team/accept-invitation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone || undefined,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Une erreur est survenue");
        setIsSubmitting(false);
        return;
      }

      setStatus("success");

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch {
      setError("Une erreur est survenue");
      setIsSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-performup-blue mb-4" />
          <p className="text-muted-foreground">
            Verification de l&apos;invitation...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (status === "expired") {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
            <Clock className="h-8 w-8 text-orange-600" />
          </div>
          <CardTitle>Invitation expiree</CardTitle>
          <CardDescription>
            Cette invitation a expire. Veuillez contacter l&apos;administrateur
            pour recevoir une nouvelle invitation.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Button variant="outline" asChild>
            <Link href="/login">Retour a la connexion</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (status === "accepted") {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <CheckCircle className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle>Invitation deja acceptee</CardTitle>
          <CardDescription>
            Vous avez deja accepte cette invitation. Vous pouvez vous connecter
            avec vos identifiants.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Button asChild>
            <Link href="/login">Se connecter</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (status === "error") {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle>Erreur</CardTitle>
          <CardDescription>
            {error || "Une erreur est survenue avec cette invitation."}
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Button variant="outline" asChild>
            <Link href="/login">Retour a la connexion</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (status === "success") {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle>Compte cree avec succes</CardTitle>
          <CardDescription>
            Votre compte a ete cree. Vous allez etre redirige vers la page de
            connexion...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-performup-blue" />
        </CardContent>
        <CardFooter className="justify-center">
          <Button asChild>
            <Link href="/login">Se connecter maintenant</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-performup-blue/10">
          <UserPlus className="h-8 w-8 text-performup-blue" />
        </div>
        <CardTitle>Accepter l&apos;invitation</CardTitle>
        <CardDescription>
          Vous avez ete invite a rejoindre PerformUp en tant que{" "}
          <strong>
            {invitation
              ? getRoleLabel(invitation.role, invitation.professorType)
              : "collaborateur"}
          </strong>
          .
        </CardDescription>
      </CardHeader>
      <CardContent>
        {invitation && (
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-muted p-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{invitation.email}</span>
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Prenom *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                placeholder="Jean"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nom *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                placeholder="Dupont"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telephone</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              placeholder="+33 6 12 34 56 78"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe *</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              placeholder="Minimum 8 caracteres"
              minLength={8}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmer le mot de passe *</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
              placeholder="Confirmer votre mot de passe"
              minLength={8}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creation du compte...
              </>
            ) : (
              "Creer mon compte"
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-4 text-center text-sm text-muted-foreground">
        <p>
          En creant votre compte, vous acceptez les conditions d&apos;utilisation
          de PerformUp.
        </p>
        <p>
          Vous avez deja un compte ?{" "}
          <Link href="/login" className="text-performup-blue hover:underline">
            Se connecter
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-performup-blue mb-4" />
            <p className="text-muted-foreground">Chargement...</p>
          </CardContent>
        </Card>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  );
}
