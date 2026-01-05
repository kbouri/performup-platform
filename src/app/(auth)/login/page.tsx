"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/layout/logo";
import { Eye, EyeOff, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn.email({
        email,
        password,
      });

      if (result.error) {
        setError(result.error.message || "Identifiants incorrects");
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
            Bienvenue
          </CardTitle>
          <CardDescription>
            Connectez-vous à votre espace PerformUp
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-error/10 border border-error/20 p-3 text-sm text-error">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Mot de passe</Label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-performup-blue hover:underline"
                >
                  Mot de passe oublié ?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Votre mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
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
            </div>

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Se connecter
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex justify-center pb-6">
          <p className="text-sm text-muted-foreground">
            Pas encore de compte ?{" "}
            <Link
              href="/register"
              className="text-performup-blue font-medium hover:underline"
            >
              Inscrivez-vous
            </Link>
          </p>
        </CardFooter>
      </Card>

      {/* Footer */}
      <p className="mt-8 text-center text-xs text-muted-foreground">
        En vous connectant, vous acceptez nos{" "}
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

