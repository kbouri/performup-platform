"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUp } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/layout/logo";
import { Eye, EyeOff, ArrowRight, Check } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordRequirements = [
    { label: "Au moins 8 caractères", met: formData.password.length >= 8 },
    { label: "Une majuscule", met: /[A-Z]/.test(formData.password) },
    { label: "Un chiffre", met: /\d/.test(formData.password) },
  ];

  const allRequirementsMet = passwordRequirements.every((req) => req.met);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    if (!allRequirementsMet) {
      setError("Le mot de passe ne respecte pas les critères de sécurité");
      return;
    }

    setLoading(true);

    try {
      const result = await signUp.email({
        email: formData.email,
        password: formData.password,
        name: `${formData.firstName} ${formData.lastName}`,
      });

      if (result.error) {
        setError(result.error.message || "Erreur lors de l'inscription");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Mobile logo */}
      <div className="lg:hidden mb-8 flex justify-center">
        <Logo size="lg" />
      </div>

      <Card className="border-0 shadow-performup-lg">
        <CardHeader className="space-y-1 text-center pb-2">
          <CardTitle className="font-display text-2xl">
            Créer un compte
          </CardTitle>
          <CardDescription>
            Rejoignez PerformUp pour préparer vos candidatures
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-error/10 border border-error/20 p-3 text-sm text-error">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  placeholder="Jean"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  autoComplete="given-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  placeholder="Dupont"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  autoComplete="family-name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="jean.dupont@email.com"
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Créez un mot de passe sécurisé"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>

              {/* Password requirements */}
              {formData.password && (
                <div className="mt-2 space-y-1">
                  {passwordRequirements.map((req, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-2 text-xs ${
                        req.met ? "text-success" : "text-muted-foreground"
                      }`}
                    >
                      {req.met ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <div className="h-3 w-3 rounded-full border border-current" />
                      )}
                      {req.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Confirmez votre mot de passe"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                autoComplete="new-password"
                error={
                  formData.confirmPassword !== "" &&
                  formData.password !== formData.confirmPassword
                }
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={loading}
              disabled={!allRequirementsMet || formData.password !== formData.confirmPassword}
            >
              Créer mon compte
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex justify-center pb-6">
          <p className="text-sm text-muted-foreground">
            Déjà un compte ?{" "}
            <Link
              href="/login"
              className="text-performup-blue font-medium hover:underline"
            >
              Connectez-vous
            </Link>
          </p>
        </CardFooter>
      </Card>

      {/* Footer */}
      <p className="mt-8 text-center text-xs text-muted-foreground">
        En créant un compte, vous acceptez nos{" "}
        <Link href="/terms" className="hover:underline">
          Conditions d&apos;utilisation
        </Link>{" "}
        et notre{" "}
        <Link href="/privacy" className="hover:underline">
          Politique de confidentialité
        </Link>
      </p>
    </>
  );
}

