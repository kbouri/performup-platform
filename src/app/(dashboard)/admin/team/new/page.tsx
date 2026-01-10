"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Users2, GraduationCap, UserCog, Mail, UserPlus, ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExecutiveChef {
  id: string;
  user: {
    firstName?: string;
    lastName?: string;
    name?: string;
  };
}

const STEPS = [
  { id: 1, title: "Type", description: "Choisir le type de collaborateur" },
  { id: 2, title: "Methode", description: "Creer directement ou inviter" },
  { id: 3, title: "Informations", description: "Remplir les details" },
  { id: 4, title: "Configuration", description: "Options supplementaires" },
];

const ROLE_OPTIONS = [
  {
    value: "MENTOR",
    label: "Mentor",
    description: "Accompagne les etudiants sur leurs dossiers et essays",
    icon: Users2,
  },
  {
    value: "PROFESSOR_QUANT",
    label: "Professeur Quant",
    description: "Enseigne les cours quantitatifs (GRE, GMAT, Tage Mage)",
    icon: GraduationCap,
  },
  {
    value: "PROFESSOR_VERBAL",
    label: "Professeur Verbal",
    description: "Enseigne les cours verbaux (GRE, GMAT)",
    icon: GraduationCap,
  },
  {
    value: "EXECUTIVE_CHEF",
    label: "Chef Executif",
    description: "Supervise les mentors et leurs etudiants",
    icon: UserCog,
  },
];

const METHOD_OPTIONS = [
  {
    value: "direct",
    label: "Creer directement",
    description: "Creer le compte avec un mot de passe temporaire",
    icon: UserPlus,
  },
  {
    value: "invitation",
    label: "Envoyer une invitation",
    description: "Le collaborateur creera son compte via un lien email",
    icon: Mail,
  },
];

const SPECIALTIES = [
  "HEC Paris",
  "ESSEC",
  "ESCP",
  "EDHEC",
  "LBS",
  "Imperial",
  "GRE",
  "GMAT",
  "Tage Mage",
  "Essays",
  "CV",
  "Oraux",
];

export default function NewCollaboratorPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [executiveChefs, setExecutiveChefs] = useState<ExecutiveChef[]>([]);

  // Form state
  const [roleType, setRoleType] = useState("");
  const [method, setMethod] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    password: "",
    hourlyRate: "",
    paymentType: "MONTHLY",
    executiveChefId: "",
    specialties: [] as string[],
    bio: "",
  });

  // Fetch executive chefs for mentor assignment
  useEffect(() => {
    const fetchExecutiveChefs = async () => {
      try {
        const res = await fetch("/api/admin/team/executive-chefs");
        if (res.ok) {
          const data = await res.json();
          setExecutiveChefs(data.executiveChefs || []);
        }
      } catch (error) {
        console.error("Error fetching executive chefs:", error);
      }
    };
    fetchExecutiveChefs();
  }, []);

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return !!roleType;
      case 2:
        return !!method;
      case 3:
        if (method === "invitation") {
          return !!formData.email;
        }
        return !!formData.email && !!formData.firstName && !!formData.lastName && !!formData.password;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const toggleSpecialty = (specialty: string) => {
    setFormData((prev) => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter((s) => s !== specialty)
        : [...prev.specialties, specialty],
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      // Determine role and professor type
      let role = roleType;
      let professorType = null;

      if (roleType === "PROFESSOR_QUANT") {
        role = "PROFESSOR";
        professorType = "QUANT";
      } else if (roleType === "PROFESSOR_VERBAL") {
        role = "PROFESSOR";
        professorType = "VERBAL";
      }

      if (method === "invitation") {
        // Create invitation
        const res = await fetch("/api/admin/team/invitations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formData.email,
            role,
            professorType,
            hourlyRate: formData.hourlyRate ? parseInt(formData.hourlyRate) * 100 : null,
            paymentType: formData.paymentType,
            executiveChefId: formData.executiveChefId || null,
            specialties: formData.specialties,
          }),
        });

        if (!res.ok) {
          const error = await res.json();
          alert(error.error || "Erreur lors de l'envoi de l'invitation");
          return;
        }

        alert("Invitation envoyee avec succes!");
        router.push("/admin/team");
      } else {
        // Create directly
        let endpoint = "";
        let body: Record<string, unknown> = {
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          password: formData.password,
          hourlyRate: formData.hourlyRate ? parseInt(formData.hourlyRate) * 100 : null,
        };

        if (role === "MENTOR") {
          endpoint = "/api/admin/team/mentors";
          body = {
            ...body,
            specialties: formData.specialties,
            bio: formData.bio,
            paymentType: formData.paymentType,
            executiveChefId: formData.executiveChefId || null,
          };
        } else if (role === "PROFESSOR") {
          endpoint = "/api/admin/team/professors";
          body = {
            ...body,
            type: professorType,
          };
        } else {
          endpoint = "/api/admin/team/executive-chefs";
        }

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const error = await res.json();
          alert(error.error || "Erreur lors de la creation");
          return;
        }

        alert("Collaborateur cree avec succes!");
        router.push("/admin/team");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  };

  const getChefName = (chef: ExecutiveChef) => {
    if (chef.user.firstName && chef.user.lastName) {
      return `${chef.user.firstName} ${chef.user.lastName}`;
    }
    return chef.user.name || "N/A";
  };

  return (
    <>
      <PageHeader
        title="Nouveau collaborateur"
        description="Ajouter un mentor, professeur ou chef executif"
        breadcrumbs={[
          { label: "Admin" },
          { label: "Equipe", href: "/admin/team" },
          { label: "Nouveau" },
        ]}
      />

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-medium",
                    currentStep === step.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : currentStep > step.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground text-muted-foreground"
                  )}
                >
                  {currentStep > step.id ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    step.id
                  )}
                </div>
                <div className="mt-2 text-center">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      currentStep >= step.id
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground hidden md:block">
                    {step.description}
                  </p>
                </div>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    "mx-4 h-0.5 w-16 md:w-24",
                    currentStep > step.id ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
          <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Step 1: Role Type */}
          {currentStep === 1 && (
            <RadioGroup value={roleType} onValueChange={setRoleType} className="space-y-4">
              {ROLE_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <label
                    key={option.value}
                    className={cn(
                      "flex items-start gap-4 rounded-lg border p-4 cursor-pointer transition-colors",
                      roleType === option.value
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <RadioGroupItem value={option.value} className="mt-1" />
                    <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="font-medium">{option.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {option.description}
                      </p>
                    </div>
                  </label>
                );
              })}
            </RadioGroup>
          )}

          {/* Step 2: Method */}
          {currentStep === 2 && (
            <RadioGroup value={method} onValueChange={setMethod} className="space-y-4">
              {METHOD_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <label
                    key={option.value}
                    className={cn(
                      "flex items-start gap-4 rounded-lg border p-4 cursor-pointer transition-colors",
                      method === option.value
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <RadioGroupItem value={option.value} className="mt-1" />
                    <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="font-medium">{option.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {option.description}
                      </p>
                    </div>
                  </label>
                );
              })}
            </RadioGroup>
          )}

          {/* Step 3: Information */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="collaborateur@email.com"
                />
              </div>

              {method === "direct" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">Prenom *</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) =>
                          setFormData({ ...formData, firstName: e.target.value })
                        }
                        placeholder="Jean"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Nom *</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) =>
                          setFormData({ ...formData, lastName: e.target.value })
                        }
                        placeholder="Dupont"
                      />
                    </div>
                  </div>

                  <div>
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

                  <div>
                    <Label htmlFor="password">Mot de passe temporaire *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      placeholder="Minimum 8 caracteres"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Le collaborateur pourra changer son mot de passe apres connexion
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 4: Configuration */}
          {currentStep === 4 && (
            <div className="space-y-4">
              {(roleType === "MENTOR" ||
                roleType === "PROFESSOR_QUANT" ||
                roleType === "PROFESSOR_VERBAL") && (
                <div>
                  <Label htmlFor="hourlyRate">Taux horaire (EUR/h)</Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    value={formData.hourlyRate}
                    onChange={(e) =>
                      setFormData({ ...formData, hourlyRate: e.target.value })
                    }
                    placeholder="50"
                  />
                </div>
              )}

              {roleType === "MENTOR" && (
                <>
                  <div>
                    <Label>Type de paiement</Label>
                    <Select
                      value={formData.paymentType}
                      onValueChange={(value) =>
                        setFormData({ ...formData, paymentType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MONTHLY">Mensuel</SelectItem>
                        <SelectItem value="PER_MISSION">Par mission</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Chef Executif superviseur</Label>
                    <Select
                      value={formData.executiveChefId}
                      onValueChange={(value) =>
                        setFormData({ ...formData, executiveChefId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selectionner (optionnel)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Aucun</SelectItem>
                        {executiveChefs.map((chef) => (
                          <SelectItem key={chef.id} value={chef.id}>
                            {getChefName(chef)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Specialites</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {SPECIALTIES.map((specialty) => (
                        <Badge
                          key={specialty}
                          variant={
                            formData.specialties.includes(specialty)
                              ? "default"
                              : "outline"
                          }
                          className="cursor-pointer"
                          onClick={() => toggleSpecialty(specialty)}
                        >
                          {specialty}
                          {formData.specialties.includes(specialty) && (
                            <X className="ml-1 h-3 w-3" />
                          )}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {method === "direct" && (
                    <div>
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={formData.bio}
                        onChange={(e) =>
                          setFormData({ ...formData, bio: e.target.value })
                        }
                        placeholder="Courte description du mentor..."
                        rows={3}
                      />
                    </div>
                  )}
                </>
              )}

              {roleType === "EXECUTIVE_CHEF" && (
                <p className="text-sm text-muted-foreground">
                  Aucune configuration supplementaire requise pour un chef executif.
                </p>
              )}
            </div>
          )}
        </CardContent>

        {/* Navigation */}
        <div className="flex justify-between p-6 pt-0">
          <Button
            variant="outline"
            onClick={currentStep === 1 ? () => router.push("/admin/team") : handleBack}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {currentStep === 1 ? "Annuler" : "Retour"}
          </Button>

          {currentStep < 4 ? (
            <Button onClick={handleNext} disabled={!canProceed()}>
              Suivant
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading || !canProceed()}>
              {loading ? "Chargement..." : method === "invitation" ? "Envoyer l'invitation" : "Creer le collaborateur"}
              <Check className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </Card>
    </>
  );
}
