"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/avatar";
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
  Loader2,
  Camera,
} from "lucide-react";

// Types
interface Mentor {
  id: string;
  userId: string;
  name: string;
  email: string;
  specialties: string[];
}

interface Professor {
  id: string;
  userId: string;
  name: string;
  email: string;
  type: string;
}

interface SchoolProgram {
  id: string;
  name: string;
  type: string;
}

interface School {
  id: string;
  name: string;
  country: string;
  programs: SchoolProgram[];
}

interface Pack {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  price: number;
  geography: string | null;
  isAddon: boolean;
}

type Step = 1 | 2 | 3 | 4;

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  nationality: string;
  currentFormation: string;
  linkedinUrl: string;
  imageUrl: string;
  selectedSchools: { schoolId: string; programId: string; priority: number }[];
  selectedPacks: { packId: string; customPrice: number }[];
  mentorId: string;
  professorQuantId: string;
  professorVerbalId: string;
  testType: string;
  internalNotes: string;
}

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Data from API
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [professorsQuant, setProfessorsQuant] = useState<Professor[]>([]);
  const [professorsVerbal, setProfessorsVerbal] = useState<Professor[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);

  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    nationality: "",
    currentFormation: "",
    linkedinUrl: "",
    imageUrl: "",
    selectedSchools: [],
    selectedPacks: [],
    mentorId: "",
    professorQuantId: "",
    professorVerbalId: "",
    testType: "GMAT",
    internalNotes: "",
  });

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("folder", "profiles");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
      });

      if (res.ok) {
        const { url } = await res.json();
        updateFormData({ imageUrl: url });
      }
    } catch (err) {
      console.error("Error uploading image:", err);
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Fetch data on mount
  useEffect(() => {
    async function fetchData() {
      setDataLoading(true);
      try {
        const [mentorsRes, quantRes, verbalRes, schoolsRes, packsRes] =
          await Promise.all([
            fetch("/api/mentors"),
            fetch("/api/professors?type=QUANT"),
            fetch("/api/professors?type=VERBAL"),
            fetch("/api/schools"),
            fetch("/api/packs"),
          ]);

        if (mentorsRes.ok) {
          const data = await mentorsRes.json();
          setMentors(data.mentors || []);
        }
        if (quantRes.ok) {
          const data = await quantRes.json();
          setProfessorsQuant(data.professors || []);
        }
        if (verbalRes.ok) {
          const data = await verbalRes.json();
          setProfessorsVerbal(data.professors || []);
        }
        if (schoolsRes.ok) {
          const data = await schoolsRes.json();
          setSchools(data.schools || []);
        }
        if (packsRes.ok) {
          const data = await packsRes.json();
          setPacks(data.packs || []);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setDataLoading(false);
      }
    }
    fetchData();
  }, []);

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
    // Validate current step
    if (step === 1) {
      if (!formData.email || !formData.firstName || !formData.lastName) {
        setError("Veuillez remplir tous les champs obligatoires");
        return;
      }
    }
    setError(null);
    if (step < 4) setStep((step + 1) as Step);
  };

  const prevStep = () => {
    setError(null);
    if (step > 1) setStep((step - 1) as Step);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/students", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalInfo: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phone: formData.phone,
            dateOfBirth: formData.dateOfBirth || null,
            nationality: formData.nationality,
            currentFormation: formData.currentFormation,
            linkedinUrl: formData.linkedinUrl,
            imageUrl: formData.imageUrl || null,
          },
          packs: formData.selectedPacks.map((p) => ({
            packId: p.packId,
            customPrice: p.customPrice,
            selected: true,
            config: { testType: formData.testType },
          })),
          team: {
            mentorId: formData.mentorId || null,
            professorQuantId: formData.professorQuantId || null,
            professorVerbalId: formData.professorVerbalId || null,
          },
          schools: formData.selectedSchools.map((s) => ({
            schoolId: s.schoolId,
            programId: s.programId,
            priority: s.priority,
          })),
          internalNotes: formData.internalNotes,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erreur lors de la création");
      }

      const data = await response.json();
      router.push(`/students/${data.student.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
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
        selectedPacks: [...formData.selectedPacks, { packId, customPrice: pack.price }],
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

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-performup-blue" />
      </div>
    );
  }

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

      {/* Error message */}
      {error && (
        <div className="mb-4 p-4 rounded-lg bg-error/10 border border-error/20 text-error text-sm">
          {error}
        </div>
      )}

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
              {/* Profile Image Upload */}
              <div className="flex flex-col items-center">
                <Label className="mb-3">Photo de profil</Label>
                <div className="relative group">
                  {formData.imageUrl ? (
                    <img
                      src={formData.imageUrl}
                      alt="Photo de profil"
                      className="h-24 w-24 rounded-full object-cover border-4 border-background shadow-lg"
                    />
                  ) : (
                    <UserAvatar
                      name={formData.firstName || formData.lastName ? `${formData.firstName} ${formData.lastName}` : "?"}
                      size="xl"
                    />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                    {uploadingImage ? (
                      <Loader2 className="h-6 w-6 animate-spin text-white" />
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-full text-white hover:bg-white/20"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Camera className="h-5 w-5" />
                      </Button>
                    )}
                  </div>
                  {formData.imageUrl && !uploadingImage && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-1 -right-1 h-6 w-6 rounded-full shadow-md"
                      onClick={() => updateFormData({ imageUrl: "" })}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
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
                      {formData.imageUrl ? "Changer" : "Ajouter une photo"}
                    </>
                  )}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>

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

              {schools.length === 0 ? (
                <div className="text-center py-8">
                  <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Aucune école disponible</p>
                  <p className="text-sm text-muted-foreground">
                    Ajoutez des écoles depuis le panneau d&apos;administration
                  </p>
                </div>
              ) : (
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
                                  (s) => s.schoolId === school.id && s.programId === program.id
                                );
                                const priority = formData.selectedSchools.find(
                                  (s) => s.schoolId === school.id && s.programId === program.id
                                )?.priority;

                                return (
                                  <Button
                                    key={program.id}
                                    variant={isSelected ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => toggleSchool(school.id, program.id)}
                                    className="relative"
                                  >
                                    {program.name} ({program.type})
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
              )}

              {formData.selectedSchools.length > 0 && (
                <div className="rounded-lg bg-muted p-4">
                  <h4 className="font-medium mb-2">Sélection ({formData.selectedSchools.length})</h4>
                  <div className="flex flex-wrap gap-2">
                    {formData.selectedSchools.map((s, index) => {
                      const school = schools.find((sch) => sch.id === s.schoolId);
                      const program = school?.programs.find((p) => p.id === s.programId);
                      return (
                        <Badge key={`${s.schoolId}-${s.programId}`} variant="secondary" className="gap-2">
                          <span className="font-bold text-performup-gold">{index + 1}</span>
                          {school?.name} - {program?.name}
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
              {/* Elite Prep - Test type */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-1 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded bg-performup-blue text-white text-xs font-bold">1</span>
                    Pack Test (Elite Prep)
                  </h4>
                  <p className="text-sm text-muted-foreground">Préparation aux tests standardisés</p>
                </div>
                {packs.filter((p) => p.name.includes("ELITE_PREP")).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun pack test disponible</p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-3">
                    {packs
                      .filter((p) => p.name.includes("ELITE_PREP"))
                      .map((pack) => {
                        const isSelected = formData.selectedPacks.some((p) => p.packId === pack.id);
                        const selectedPack = formData.selectedPacks.find((p) => p.packId === pack.id);

                        return (
                          <Card
                            key={pack.id}
                            className={cn(
                              "cursor-pointer transition-all hover:border-performup-blue/50",
                              isSelected && "ring-2 ring-performup-blue bg-performup-blue/5"
                            )}
                            onClick={() => togglePack(pack.id)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <Checkbox checked={isSelected} />
                                <div className="flex-1 min-w-0">
                                  <span className="font-medium text-sm">{pack.displayName.replace("Elite Prep - ", "")}</span>
                                  {isSelected && (
                                    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                                      <Label className="text-xs text-muted-foreground">Prix</Label>
                                      <Input
                                        type="number"
                                        value={selectedPack?.customPrice ? selectedPack.customPrice / 100 : ""}
                                        onChange={(e) =>
                                          updatePackPrice(pack.id, Math.round(parseFloat(e.target.value) * 100))
                                        }
                                        className="h-8 text-right"
                                        placeholder="0"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Premium Access - Dossier + Oraux */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-1 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded bg-performup-gold text-white text-xs font-bold">2</span>
                    Pack Dossier (Premium Access)
                  </h4>
                  <p className="text-sm text-muted-foreground">Accompagnement complet dossier et oraux</p>
                </div>
                {packs.filter((p) => p.name.includes("PREMIUM_ACCESS")).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun pack dossier disponible</p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {packs
                      .filter((p) => p.name.includes("PREMIUM_ACCESS"))
                      .map((pack) => {
                        const isSelected = formData.selectedPacks.some((p) => p.packId === pack.id);
                        const selectedPack = formData.selectedPacks.find((p) => p.packId === pack.id);
                        const geoFlags: Record<string, string> = { France: "🇫🇷", UK: "🇬🇧" };

                        return (
                          <Card
                            key={pack.id}
                            className={cn(
                              "cursor-pointer transition-all hover:border-performup-gold/50",
                              isSelected && "ring-2 ring-performup-gold bg-performup-gold/5"
                            )}
                            onClick={() => togglePack(pack.id)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <Checkbox checked={isSelected} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg">{geoFlags[pack.geography || ""] || "🌍"}</span>
                                    <span className="font-medium text-sm">{pack.geography}</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">{pack.description}</p>
                                  {isSelected && (
                                    <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                                      <Label className="text-xs text-muted-foreground">Prix personnalisé</Label>
                                      <Input
                                        type="number"
                                        value={selectedPack?.customPrice ? selectedPack.customPrice / 100 : ""}
                                        onChange={(e) =>
                                          updatePackPrice(pack.id, Math.round(parseFloat(e.target.value) * 100))
                                        }
                                        className="h-8 text-right"
                                        placeholder="0"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Oral Mastery - Oraux seulement */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-1 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded bg-success text-white text-xs font-bold">3</span>
                    Pack Oraux (Oral Mastery)
                  </h4>
                  <p className="text-sm text-muted-foreground">Préparation oraux uniquement</p>
                </div>
                {packs.filter((p) => p.name.includes("ORAL_MASTERY")).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun pack oraux disponible</p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {packs
                      .filter((p) => p.name.includes("ORAL_MASTERY"))
                      .map((pack) => {
                        const isSelected = formData.selectedPacks.some((p) => p.packId === pack.id);
                        const selectedPack = formData.selectedPacks.find((p) => p.packId === pack.id);
                        const geoFlags: Record<string, string> = { France: "🇫🇷", UK: "🇬🇧" };

                        return (
                          <Card
                            key={pack.id}
                            className={cn(
                              "cursor-pointer transition-all hover:border-success/50",
                              isSelected && "ring-2 ring-success bg-success/5"
                            )}
                            onClick={() => togglePack(pack.id)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <Checkbox checked={isSelected} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg">{geoFlags[pack.geography || ""] || "🌍"}</span>
                                    <span className="font-medium text-sm">{pack.geography}</span>
                                  </div>
                                  {isSelected && (
                                    <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                                      <Label className="text-xs text-muted-foreground">Prix personnalisé</Label>
                                      <Input
                                        type="number"
                                        value={selectedPack?.customPrice ? selectedPack.customPrice / 100 : ""}
                                        onChange={(e) =>
                                          updatePackPrice(pack.id, Math.round(parseFloat(e.target.value) * 100))
                                        }
                                        className="h-8 text-right"
                                        placeholder="0"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Add-ons */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-1 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded bg-warning text-white text-xs font-bold">+</span>
                    Add-ons (autres géographies)
                  </h4>
                  <p className="text-sm text-muted-foreground">Compléments pour Espagne, Italie, Suisse</p>
                </div>
                {packs.filter((p) => p.isAddon).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucun add-on disponible</p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-3">
                    {packs
                      .filter((p) => p.isAddon)
                      .map((pack) => {
                        const isSelected = formData.selectedPacks.some((p) => p.packId === pack.id);
                        const selectedPack = formData.selectedPacks.find((p) => p.packId === pack.id);
                        const geoFlags: Record<string, string> = { Espagne: "🇪🇸", Italie: "🇮🇹", Suisse: "🇨🇭" };

                        return (
                          <Card
                            key={pack.id}
                            className={cn(
                              "cursor-pointer transition-all hover:border-warning/50",
                              isSelected && "ring-2 ring-warning bg-warning/5"
                            )}
                            onClick={() => togglePack(pack.id)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <Checkbox checked={isSelected} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg">{geoFlags[pack.geography || ""] || "🌍"}</span>
                                    <span className="font-medium text-sm">{pack.geography}</span>
                                  </div>
                                  {isSelected && (
                                    <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                                      <Label className="text-xs text-muted-foreground">Prix</Label>
                                      <Input
                                        type="number"
                                        value={selectedPack?.customPrice ? selectedPack.customPrice / 100 : ""}
                                        onChange={(e) =>
                                          updatePackPrice(pack.id, Math.round(parseFloat(e.target.value) * 100))
                                        }
                                        className="h-8 text-right"
                                        placeholder="0"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Team */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Mentor</Label>
                  <Select
                    value={formData.mentorId || "_none"}
                    onValueChange={(value) => updateFormData({ mentorId: value === "_none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un mentor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Aucun</SelectItem>
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
                    value={formData.professorQuantId || "_none"}
                    onValueChange={(value) => updateFormData({ professorQuantId: value === "_none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Aucun</SelectItem>
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
                    value={formData.professorVerbalId || "_none"}
                    onValueChange={(value) => updateFormData({ professorVerbalId: value === "_none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Aucun</SelectItem>
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
                      {formData.selectedSchools.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Aucune école sélectionnée</p>
                      ) : (
                        formData.selectedSchools.map((s, index) => {
                          const school = schools.find((sch) => sch.id === s.schoolId);
                          const program = school?.programs.find((p) => p.id === s.programId);
                          return (
                            <div key={`${s.schoolId}-${s.programId}`} className="flex items-center gap-2 text-sm">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-performup-gold text-[10px] font-bold text-white">
                                {index + 1}
                              </span>
                              <span>{school?.name} - {program?.name}</span>
                            </div>
                          );
                        })
                      )}
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
                      {formData.selectedPacks.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Aucun pack sélectionné</p>
                      ) : (
                        <>
                          {formData.selectedPacks.map((p) => {
                            const pack = packs.find((pk) => pk.id === p.packId);
                            return (
                              <div key={p.packId} className="flex items-center justify-between text-sm">
                                <span>{pack?.displayName}</span>
                                <span className="font-medium">{formatCurrency(p.customPrice)}</span>
                              </div>
                            );
                          })}
                          <div className="border-t pt-2 flex items-center justify-between font-medium">
                            <span>Total</span>
                            <span className="text-performup-blue">{formatCurrency(totalPrice)}</span>
                          </div>
                        </>
                      )}
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
                      Compte utilisateur avec rôle Étudiant
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      Profil étudiant avec les informations saisies
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      Attribution des packs et de l&apos;équipe pédagogique
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      Association aux écoles et programmes ciblés
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
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Créer l&apos;étudiant
          </Button>
        )}
      </div>
    </div>
  );
}
