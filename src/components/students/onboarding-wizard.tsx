"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatCurrency } from "@/lib/utils";
import {
  User,
  GraduationCap,
  Package,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  X,
  Building2,
} from "lucide-react";

// Mock data
const mentors = [
  { id: "1", name: "Sophie Martin", specialties: ["HEC", "ESSEC", "ESCP"] },
  { id: "2", name: "Jean Lefèvre", specialties: ["INSEAD", "LBS", "MBA"] },
  { id: "3", name: "Marie Dubois", specialties: ["MiM", "MIF", "Sciences Po"] },
];

const professorsQuant = [
  { id: "1", name: "Prof. Martin", availability: "Lun-Mer-Ven" },
  { id: "2", name: "Prof. Durand", availability: "Mar-Jeu" },
];

const professorsVerbal = [
  { id: "1", name: "Prof. Laurent", availability: "Lun-Mer" },
  { id: "2", name: "Prof. Petit", availability: "Mar-Jeu-Sam" },
];

const schools = [
  { id: "1", name: "HEC Paris", country: "France", programs: ["MiM", "MIF", "MBA"] },
  { id: "2", name: "ESSEC", country: "France", programs: ["MiM", "MIF"] },
  { id: "3", name: "ESCP", country: "France", programs: ["MiM", "MIF", "MEB"] },
  { id: "4", name: "INSEAD", country: "France", programs: ["MBA"] },
  { id: "5", name: "London Business School", country: "UK", programs: ["MiM", "MIF", "MBA"] },
  { id: "6", name: "IE Business School", country: "Spain", programs: ["MiM", "MIF"] },
];

const packs = [
  {
    id: "ELITE_PREP",
    name: "Elite Prep",
    description: "Préparation complète aux tests (GMAT/GRE/TAGE MAGE)",
    basePrice: 500000, // In cents
    includes: ["Cours Quant", "Cours Verbal", "Tests blancs", "Suivi mentor"],
    isAddon: false,
  },
  {
    id: "PREMIUM_ACCESS",
    name: "Premium Access",
    description: "Accompagnement dossier complet + préparation oraux",
    basePrice: 650000,
    includes: ["Essays", "CV", "Lettres de motivation", "Prep oraux", "Suivi mentor"],
    isAddon: false,
  },
  {
    id: "ORAL_MASTERY",
    name: "Oral Mastery",
    description: "Préparation intensive aux entretiens d'admission",
    basePrice: 200000,
    includes: ["Simulations d'oraux", "Coaching individuel", "Feedback personnalisé"],
    isAddon: true,
  },
];

type Step = 1 | 2 | 3 | 4;

interface FormData {
  // Step 1: Personal info
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  nationality: string;
  currentFormation: string;
  linkedinUrl: string;

  // Step 2: Schools
  selectedSchools: { schoolId: string; programId: string; priority: number }[];

  // Step 3: Packs & Team
  selectedPacks: { packId: string; customPrice: number }[];
  mentorId: string;
  professorQuantId: string;
  professorVerbalId: string;
  testType: string;

  // Step 4: Review
  internalNotes: string;
}

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    nationality: "",
    currentFormation: "",
    linkedinUrl: "",
    selectedSchools: [],
    selectedPacks: [],
    mentorId: "",
    professorQuantId: "",
    professorVerbalId: "",
    testType: "GMAT",
    internalNotes: "",
  });

  const steps = [
    { number: 1, title: "Informations", icon: User },
    { number: 2, title: "Écoles cibles", icon: GraduationCap },
    { number: 3, title: "Pack & Équipe", icon: Package },
    { number: 4, title: "Confirmation", icon: CheckCircle2 },
  ];

  const updateFormData = (updates: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    if (step < 4) setStep((step + 1) as Step);
  };

  const prevStep = () => {
    if (step > 1) setStep((step - 1) as Step);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // API call to create student
      console.log("Creating student:", formData);
      
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      router.push("/students");
    } catch (error) {
      console.error("Error creating student:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSchool = (schoolId: string, programId: string) => {
    const exists = formData.selectedSchools.find(
      (s) => s.schoolId === schoolId && s.programId === programId
    );

    if (exists) {
      updateFormData({
        selectedSchools: formData.selectedSchools.filter(
          (s) => !(s.schoolId === schoolId && s.programId === programId)
        ),
      });
    } else {
      updateFormData({
        selectedSchools: [
          ...formData.selectedSchools,
          { schoolId, programId, priority: formData.selectedSchools.length + 1 },
        ],
      });
    }
  };

  const togglePack = (packId: string) => {
    const pack = packs.find((p) => p.id === packId);
    if (!pack) return;

    const exists = formData.selectedPacks.find((p) => p.packId === packId);

    if (exists) {
      updateFormData({
        selectedPacks: formData.selectedPacks.filter((p) => p.packId !== packId),
      });
    } else {
      updateFormData({
        selectedPacks: [...formData.selectedPacks, { packId, customPrice: pack.basePrice }],
      });
    }
  };

  const updatePackPrice = (packId: string, customPrice: number) => {
    updateFormData({
      selectedPacks: formData.selectedPacks.map((p) =>
        p.packId === packId ? { ...p, customPrice } : p
      ),
    });
  };

  const totalPrice = formData.selectedPacks.reduce((acc, p) => acc + p.customPrice, 0);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {steps.map((s, index) => {
            const Icon = s.icon;
            const isActive = step === s.number;
            const isCompleted = step > s.number;

            return (
              <div key={s.number} className="flex items-center">
                <div
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all",
                    isActive && "border-performup-blue bg-performup-blue text-white",
                    isCompleted && "border-success bg-success text-white",
                    !isActive && !isCompleted && "border-muted-foreground/30 text-muted-foreground"
                  )}
                >
                  {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "w-full h-0.5 mx-2 min-w-[60px]",
                      isCompleted ? "bg-success" : "bg-muted-foreground/30"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-sm">
          {steps.map((s) => (
            <span
              key={s.number}
              className={cn(
                "font-medium",
                step === s.number ? "text-performup-blue" : "text-muted-foreground"
              )}
            >
              {s.title}
            </span>
          ))}
        </div>
      </div>

      {/* Step content */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display">
            {step === 1 && "Informations personnelles"}
            {step === 2 && "Écoles cibles"}
            {step === 3 && "Pack et équipe pédagogique"}
            {step === 4 && "Confirmation et création"}
          </CardTitle>
          <CardDescription>
            {step === 1 && "Renseignez les informations de base de l'étudiant"}
            {step === 2 && "Sélectionnez les écoles et programmes visés"}
            {step === 3 && "Choisissez le pack et assignez l'équipe"}
            {step === 4 && "Vérifiez les informations avant de créer le profil"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Step 1: Personal Info */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prénom *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => updateFormData({ firstName: e.target.value })}
                    placeholder="Jean"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => updateFormData({ lastName: e.target.value })}
                    placeholder="Dupont"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateFormData({ email: e.target.value })}
                    placeholder="jean.dupont@email.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateFormData({ phone: e.target.value })}
                    placeholder="+33 6 12 34 56 78"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date de naissance</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => updateFormData({ dateOfBirth: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nationality">Nationalité</Label>
                  <Input
                    id="nationality"
                    value={formData.nationality}
                    onChange={(e) => updateFormData({ nationality: e.target.value })}
                    placeholder="Française"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currentFormation">Formation actuelle</Label>
                <Input
                  id="currentFormation"
                  value={formData.currentFormation}
                  onChange={(e) => updateFormData({ currentFormation: e.target.value })}
                  placeholder="Master 1 Finance - Université Paris Dauphine"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkedinUrl">Profil LinkedIn</Label>
                <Input
                  id="linkedinUrl"
                  type="url"
                  value={formData.linkedinUrl}
                  onChange={(e) => updateFormData({ linkedinUrl: e.target.value })}
                  placeholder="https://linkedin.com/in/jean-dupont"
                />
              </div>
            </div>
          )}

          {/* Step 2: Schools */}
          {step === 2 && (
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">
                Sélectionnez les écoles et programmes que l&apos;étudiant vise. L&apos;ordre de sélection
                détermine la priorité.
              </p>

              <div className="grid gap-4">
                {schools.map((school) => (
                  <Card key={school.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                          <Building2 className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium">{school.name}</span>
                            <Badge variant="outline">{school.country}</Badge>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {school.programs.map((program) => {
                              const isSelected = formData.selectedSchools.some(
                                (s) => s.schoolId === school.id && s.programId === program
                              );
                              const priority = formData.selectedSchools.find(
                                (s) => s.schoolId === school.id && s.programId === program
                              )?.priority;

                              return (
                                <Button
                                  key={program}
                                  variant={isSelected ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => toggleSchool(school.id, program)}
                                  className="relative"
                                >
                                  {program}
                                  {isSelected && priority && (
                                    <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-performup-gold text-[10px] font-bold text-white">
                                      {priority}
                                    </span>
                                  )}
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {formData.selectedSchools.length > 0 && (
                <div className="rounded-lg bg-muted p-4">
                  <h4 className="font-medium mb-2">Sélection ({formData.selectedSchools.length})</h4>
                  <div className="flex flex-wrap gap-2">
                    {formData.selectedSchools.map((s, index) => {
                      const school = schools.find((sch) => sch.id === s.schoolId);
                      return (
                        <Badge key={`${s.schoolId}-${s.programId}`} variant="secondary" className="gap-2">
                          <span className="font-bold text-performup-gold">{index + 1}</span>
                          {school?.name} - {s.programId}
                          <button
                            onClick={() => toggleSchool(s.schoolId, s.programId)}
                            className="hover:text-error"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Pack & Team */}
          {step === 3 && (
            <div className="space-y-8">
              {/* Test type */}
              <div className="space-y-2">
                <Label>Type de test</Label>
                <Select
                  value={formData.testType}
                  onValueChange={(value) => updateFormData({ testType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GMAT">GMAT</SelectItem>
                    <SelectItem value="GRE">GRE</SelectItem>
                    <SelectItem value="TAGE_MAGE">TAGE MAGE</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Packs */}
              <div className="space-y-4">
                <Label>Packs</Label>
                <div className="grid gap-4">
                  {packs.map((pack) => {
                    const isSelected = formData.selectedPacks.some((p) => p.packId === pack.id);
                    const selectedPack = formData.selectedPacks.find((p) => p.packId === pack.id);

                    return (
                      <Card
                        key={pack.id}
                        className={cn(
                          "cursor-pointer transition-all",
                          isSelected && "ring-2 ring-performup-blue"
                        )}
                        onClick={() => togglePack(pack.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <Checkbox checked={isSelected} />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{pack.name}</span>
                                {pack.isAddon && <Badge variant="gold">Add-on</Badge>}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {pack.description}
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {pack.includes.map((item) => (
                                  <Badge key={item} variant="outline" className="text-xs">
                                    {item}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div className="text-right">
                              {isSelected ? (
                                <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                                  <Label className="text-xs">Prix personnalisé</Label>
                                  <Input
                                    type="number"
                                    value={selectedPack?.customPrice ? selectedPack.customPrice / 100 : ""}
                                    onChange={(e) =>
                                      updatePackPrice(pack.id, Math.round(parseFloat(e.target.value) * 100))
                                    }
                                    className="w-24 text-right"
                                  />
                                </div>
                              ) : (
                                <span className="text-lg font-bold">
                                  {formatCurrency(pack.basePrice)}
                                </span>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Team */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Mentor</Label>
                  <Select
                    value={formData.mentorId}
                    onValueChange={(value) => updateFormData({ mentorId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un mentor" />
                    </SelectTrigger>
                    <SelectContent>
                      {mentors.map((mentor) => (
                        <SelectItem key={mentor.id} value={mentor.id}>
                          {mentor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Professeur Quant</Label>
                  <Select
                    value={formData.professorQuantId}
                    onValueChange={(value) => updateFormData({ professorQuantId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {professorsQuant.map((prof) => (
                        <SelectItem key={prof.id} value={prof.id}>
                          {prof.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Professeur Verbal</Label>
                  <Select
                    value={formData.professorVerbalId}
                    onValueChange={(value) => updateFormData({ professorVerbalId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {professorsVerbal.map((prof) => (
                        <SelectItem key={prof.id} value={prof.id}>
                          {prof.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Total */}
              {formData.selectedPacks.length > 0 && (
                <div className="rounded-lg bg-muted p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Total</span>
                    <span className="text-2xl font-bold font-display text-performup-blue">
                      {formatCurrency(totalPrice)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Confirmation */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Personal Info Summary */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Informations personnelles
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Nom complet</dt>
                        <dd className="font-medium">{formData.firstName} {formData.lastName}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Email</dt>
                        <dd className="font-medium">{formData.email}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Téléphone</dt>
                        <dd className="font-medium">{formData.phone || "-"}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Formation</dt>
                        <dd className="font-medium">{formData.currentFormation || "-"}</dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>

                {/* Schools Summary */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Écoles cibles ({formData.selectedSchools.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {formData.selectedSchools.map((s, index) => {
                        const school = schools.find((sch) => sch.id === s.schoolId);
                        return (
                          <div key={`${s.schoolId}-${s.programId}`} className="flex items-center gap-2 text-sm">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-performup-gold text-[10px] font-bold text-white">
                              {index + 1}
                            </span>
                            <span>{school?.name} - {s.programId}</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Packs Summary */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Packs sélectionnés
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {formData.selectedPacks.map((p) => {
                        const pack = packs.find((pk) => pk.id === p.packId);
                        return (
                          <div key={p.packId} className="flex items-center justify-between text-sm">
                            <span>{pack?.name}</span>
                            <span className="font-medium">{formatCurrency(p.customPrice)}</span>
                          </div>
                        );
                      })}
                      <div className="border-t pt-2 flex items-center justify-between font-medium">
                        <span>Total</span>
                        <span className="text-performup-blue">{formatCurrency(totalPrice)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Team Summary */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Équipe pédagogique
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Mentor</dt>
                        <dd className="font-medium">
                          {mentors.find((m) => m.id === formData.mentorId)?.name || "-"}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Prof. Quant</dt>
                        <dd className="font-medium">
                          {professorsQuant.find((p) => p.id === formData.professorQuantId)?.name || "-"}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Prof. Verbal</dt>
                        <dd className="font-medium">
                          {professorsVerbal.find((p) => p.id === formData.professorVerbalId)?.name || "-"}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Type de test</dt>
                        <dd className="font-medium">{formData.testType}</dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
              </div>

              {/* Notes internes */}
              <div className="space-y-2">
                <Label htmlFor="internalNotes">Notes internes (optionnel)</Label>
                <textarea
                  id="internalNotes"
                  className="w-full min-h-[100px] rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  value={formData.internalNotes}
                  onChange={(e) => updateFormData({ internalNotes: e.target.value })}
                  placeholder="Ajoutez des notes visibles uniquement par l'équipe..."
                />
              </div>

              {/* What will happen */}
              <Card className="bg-performup-blue/5 border-performup-blue/20">
                <CardContent className="pt-6">
                  <h4 className="font-medium mb-3 text-performup-blue">
                    Ce qui sera créé automatiquement :
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      Compte utilisateur avec mot de passe temporaire
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      Drive étudiant avec structure de dossiers personnalisée
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      Documents automatiquement déployés selon le pack
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      Permissions configurées pour l&apos;équipe pédagogique
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      Email d&apos;invitation envoyé à l&apos;étudiant
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between mt-6">
        <Button variant="outline" onClick={prevStep} disabled={step === 1}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Précédent
        </Button>

        {step < 4 ? (
          <Button onClick={nextStep}>
            Suivant
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} loading={loading}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Créer l&apos;étudiant
          </Button>
        )}
      </div>
    </div>
  );
}

