"use client";

import { useEffect, useState, useMemo } from "react";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Search,
  Package,
  Globe,
  Loader2,
  BookOpen,
  Target,
  PenTool,
  Mic,
  FolderTree,
  ChevronRight,
} from "lucide-react";

interface Pack {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  price: number;
  geography: string | null;
  isAddon: boolean;
}

// Pack type icons and colors
const packTypeConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  ELITE_PREP: { 
    icon: Target, 
    color: "text-performup-blue", 
    bgColor: "bg-performup-blue/10" 
  },
  PREMIUM_ACCESS: { 
    icon: PenTool, 
    color: "text-performup-gold", 
    bgColor: "bg-performup-gold/10" 
  },
  ORAL_MASTERY: { 
    icon: Mic, 
    color: "text-success", 
    bgColor: "bg-success/10" 
  },
  ADDON: { 
    icon: Globe, 
    color: "text-warning", 
    bgColor: "bg-warning/10" 
  },
};

// Geography flags
const geographyFlags: Record<string, string> = {
  France: "🇫🇷",
  UK: "🇬🇧",
  Italie: "🇮🇹",
  Espagne: "🇪🇸",
  Suisse: "🇨🇭",
};

// Get pack type from name
function getPackType(name: string): string {
  if (name.includes("ELITE_PREP")) return "ELITE_PREP";
  if (name.includes("PREMIUM_ACCESS")) return "PREMIUM_ACCESS";
  if (name.includes("ORAL_MASTERY")) return "ORAL_MASTERY";
  if (name.includes("ADDON")) return "ADDON";
  return "ADDON";
}

export default function PacksPage() {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("_all");
  const [geographyFilter, setGeographyFilter] = useState<string>("_all");
  const [selectedPack, setSelectedPack] = useState<Pack | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newPack, setNewPack] = useState({
    name: "",
    displayName: "",
    description: "",
    price: 0,
    geography: "",
    isAddon: false,
  });
  const [submitting, setSubmitting] = useState(false);

  // Fetch packs
  useEffect(() => {
    async function fetchPacks() {
      try {
        const response = await fetch("/api/packs");
        if (response.ok) {
          const data = await response.json();
          setPacks(data.packs || []);
        }
      } catch (error) {
        console.error("Error fetching packs:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchPacks();
  }, []);

  // Get unique geographies
  const geographies = useMemo(() => {
    const uniqueGeographies = Array.from(
      new Set(packs.filter((p) => p.geography).map((p) => p.geography as string))
    );
    return uniqueGeographies.sort();
  }, [packs]);

  // Filter packs
  const filteredPacks = useMemo(() => {
    return packs.filter((pack) => {
      const matchesSearch =
        searchQuery === "" ||
        pack.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pack.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const packType = getPackType(pack.name);
      const matchesType = typeFilter === "_all" || packType === typeFilter;

      const matchesGeography =
        geographyFilter === "_all" ||
        (geographyFilter === "_none" && !pack.geography) ||
        pack.geography === geographyFilter;

      return matchesSearch && matchesType && matchesGeography;
    });
  }, [packs, searchQuery, typeFilter, geographyFilter]);

  // Group packs by type
  const packsByType = useMemo(() => {
    const grouped: Record<string, Pack[]> = {
      ELITE_PREP: [],
      PREMIUM_ACCESS: [],
      ORAL_MASTERY: [],
      ADDON: [],
    };
    filteredPacks.forEach((pack) => {
      const type = getPackType(pack.name);
      if (grouped[type]) {
        grouped[type].push(pack);
      }
    });
    return grouped;
  }, [filteredPacks]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: packs.length,
      elitePrep: packs.filter((p) => p.name.includes("ELITE_PREP")).length,
      premiumAccess: packs.filter((p) => p.name.includes("PREMIUM_ACCESS")).length,
      oralMastery: packs.filter((p) => p.name.includes("ORAL_MASTERY")).length,
      addons: packs.filter((p) => p.isAddon).length,
    };
  }, [packs]);

  // Handle create pack
  const handleCreatePack = async () => {
    if (!newPack.name || !newPack.displayName) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/packs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPack),
      });

      if (response.ok) {
        const data = await response.json();
        setPacks((prev) => [...prev, data.pack]);
        setNewPack({
          name: "",
          displayName: "",
          description: "",
          price: 0,
          geography: "",
          isAddon: false,
        });
        setShowAddDialog(false);
      }
    } catch (error) {
      console.error("Error creating pack:", error);
    } finally {
      setSubmitting(false);
    }
  };

  // Type display names
  const typeDisplayNames: Record<string, string> = {
    ELITE_PREP: "Elite Prep (Test)",
    PREMIUM_ACCESS: "Premium Access (Dossier)",
    ORAL_MASTERY: "Oral Mastery",
    ADDON: "Add-ons",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-performup-blue" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Packs & Formules"
        description="Gérez les packs de préparation proposés aux étudiants"
        actions={
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Créer un pack
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer un nouveau pack</DialogTitle>
                <DialogDescription>
                  Définissez les caractéristiques du nouveau pack
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="pack-name">Identifiant technique *</Label>
                  <Input
                    id="pack-name"
                    placeholder="Ex: PACK_ELITE_PREP_TOEFL"
                    value={newPack.name}
                    onChange={(e) =>
                      setNewPack((prev) => ({
                        ...prev,
                        name: e.target.value.toUpperCase().replace(/\s/g, "_"),
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pack-displayName">Nom affiché *</Label>
                  <Input
                    id="pack-displayName"
                    placeholder="Ex: Elite Prep - TOEFL"
                    value={newPack.displayName}
                    onChange={(e) =>
                      setNewPack((prev) => ({
                        ...prev,
                        displayName: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pack-description">Description</Label>
                  <Textarea
                    id="pack-description"
                    placeholder="Décrivez le contenu du pack..."
                    value={newPack.description}
                    onChange={(e) =>
                      setNewPack((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pack-geography">Géographie</Label>
                  <Select
                    value={newPack.geography || "_none"}
                    onValueChange={(value) =>
                      setNewPack((prev) => ({
                        ...prev,
                        geography: value === "_none" ? "" : value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner (optionnel)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Aucune (test standard)</SelectItem>
                      <SelectItem value="France">🇫🇷 France</SelectItem>
                      <SelectItem value="UK">🇬🇧 Royaume-Uni</SelectItem>
                      <SelectItem value="Italie">🇮🇹 Italie</SelectItem>
                      <SelectItem value="Espagne">🇪🇸 Espagne</SelectItem>
                      <SelectItem value="Suisse">🇨🇭 Suisse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="pack-addon">Add-on</Label>
                    <p className="text-xs text-muted-foreground">
                      Ce pack est-il un complément ?
                    </p>
                  </div>
                  <Switch
                    id="pack-addon"
                    checked={newPack.isAddon}
                    onCheckedChange={(checked) =>
                      setNewPack((prev) => ({ ...prev, isAddon: checked }))
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowAddDialog(false)}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleCreatePack}
                  disabled={
                    !newPack.name || !newPack.displayName || submitting
                  }
                >
                  {submitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Créer le pack
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-performup-blue/10">
                <Target className="h-6 w-6 text-performup-blue" />
              </div>
              <div>
                <div className="text-2xl font-display font-semibold">
                  {stats.elitePrep}
                </div>
                <p className="text-sm text-muted-foreground">Elite Prep</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-performup-gold/10">
                <PenTool className="h-6 w-6 text-performup-gold" />
              </div>
              <div>
                <div className="text-2xl font-display font-semibold">
                  {stats.premiumAccess}
                </div>
                <p className="text-sm text-muted-foreground">Premium Access</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10">
                <Mic className="h-6 w-6 text-success" />
              </div>
              <div>
                <div className="text-2xl font-display font-semibold">
                  {stats.oralMastery}
                </div>
                <p className="text-sm text-muted-foreground">Oral Mastery</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-warning/10">
                <Globe className="h-6 w-6 text-warning" />
              </div>
              <div>
                <div className="text-2xl font-display font-semibold">
                  {stats.addons}
                </div>
                <p className="text-sm text-muted-foreground">Add-ons</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un pack..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Tous les types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Tous les types</SelectItem>
                <SelectItem value="ELITE_PREP">Elite Prep (Test)</SelectItem>
                <SelectItem value="PREMIUM_ACCESS">Premium Access</SelectItem>
                <SelectItem value="ORAL_MASTERY">Oral Mastery</SelectItem>
                <SelectItem value="ADDON">Add-ons</SelectItem>
              </SelectContent>
            </Select>
            <Select value={geographyFilter} onValueChange={setGeographyFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Toutes les géographies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Toutes les géographies</SelectItem>
                <SelectItem value="_none">Sans géographie</SelectItem>
                {geographies.map((geo) => (
                  <SelectItem key={geo} value={geo}>
                    {geographyFlags[geo] || ""} {geo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Packs List */}
      <Tabs defaultValue="list" className="space-y-6">
        <TabsList>
          <TabsTrigger value="list">Liste</TabsTrigger>
          <TabsTrigger value="byType">Par type</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredPacks.map((pack) => {
              const packType = getPackType(pack.name);
              const config = packTypeConfig[packType] || packTypeConfig.ADDON;
              const Icon = config.icon;

              return (
                <Card
                  key={pack.id}
                  className="cursor-pointer hover:border-performup-blue/50 transition-colors"
                  onClick={() => setSelectedPack(pack)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg ${config.bgColor}`}
                      >
                        <Icon className={`h-5 w-5 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">
                          {pack.displayName}
                        </CardTitle>
                        {pack.geography && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            {geographyFlags[pack.geography] || "🌍"}{" "}
                            {pack.geography}
                          </p>
                        )}
                      </div>
                      {pack.isAddon && (
                        <Badge variant="outline" className="shrink-0">
                          Add-on
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {pack.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {pack.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {filteredPacks.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucun pack trouvé</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="byType">
          <div className="space-y-8">
            {Object.entries(packsByType)
              .filter(([, typePacks]) => typePacks.length > 0)
              .map(([type, typePacks]) => {
                const config = packTypeConfig[type] || packTypeConfig.ADDON;
                const Icon = config.icon;

                return (
                  <div key={type}>
                    <h3 className="text-lg font-display font-semibold mb-4 flex items-center gap-2">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg ${config.bgColor}`}
                      >
                        <Icon className={`h-4 w-4 ${config.color}`} />
                      </div>
                      {typeDisplayNames[type]}
                      <Badge variant="secondary">{typePacks.length}</Badge>
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {typePacks.map((pack) => (
                        <Card
                          key={pack.id}
                          className="cursor-pointer hover:border-performup-blue/50 transition-colors"
                          onClick={() => setSelectedPack(pack)}
                        >
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium">{pack.displayName}</h4>
                              {pack.isAddon && (
                                <Badge variant="outline" className="shrink-0">
                                  Add-on
                                </Badge>
                              )}
                            </div>
                            {pack.geography && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                {geographyFlags[pack.geography] || "🌍"}{" "}
                                {pack.geography}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Pack Detail Dialog */}
      <Dialog
        open={!!selectedPack}
        onOpenChange={(open) => !open && setSelectedPack(null)}
      >
        <DialogContent className="max-w-lg">
          {selectedPack && (
            <>
              <DialogHeader>
                {(() => {
                  const packType = getPackType(selectedPack.name);
                  const config = packTypeConfig[packType] || packTypeConfig.ADDON;
                  const Icon = config.icon;

                  return (
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-lg ${config.bgColor}`}
                      >
                        <Icon className={`h-6 w-6 ${config.color}`} />
                      </div>
                      <div>
                        <DialogTitle className="text-xl">
                          {selectedPack.displayName}
                        </DialogTitle>
                        <DialogDescription className="flex items-center gap-2">
                          {selectedPack.geography && (
                            <>
                              <span>
                                {geographyFlags[selectedPack.geography] || "🌍"}{" "}
                                {selectedPack.geography}
                              </span>
                              <span>•</span>
                            </>
                          )}
                          <span>{typeDisplayNames[packType]}</span>
                          {selectedPack.isAddon && (
                            <>
                              <span>•</span>
                              <Badge variant="outline">Add-on</Badge>
                            </>
                          )}
                        </DialogDescription>
                      </div>
                    </div>
                  );
                })()}
              </DialogHeader>

              <div className="py-4 space-y-4">
                {selectedPack.description && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      Description
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedPack.description}
                    </p>
                  </div>
                )}

                <Separator />

                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <FolderTree className="h-4 w-4" />
                    Structure de dossiers
                  </h4>
                  <div className="bg-muted/50 rounded-lg p-4 space-y-1">
                    {selectedPack.name.includes("ELITE_PREP") && (
                      <>
                        <div className="flex items-center gap-2 text-sm">
                          <ChevronRight className="h-3 w-3" />
                          <span>Cours & Supports</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm pl-4 text-muted-foreground">
                          <ChevronRight className="h-3 w-3" />
                          <span>Quantitative / Verbal</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <ChevronRight className="h-3 w-3" />
                          <span>Ressources Globales</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <ChevronRight className="h-3 w-3" />
                          <span>Tests Blancs & Diagnostics</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <ChevronRight className="h-3 w-3" />
                          <span>Sessions Enregistrées</span>
                        </div>
                      </>
                    )}
                    {selectedPack.name.includes("PREMIUM_ACCESS") && (
                      <>
                        <div className="flex items-center gap-2 text-sm">
                          <ChevronRight className="h-3 w-3" />
                          <span>Documents Personnels</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <ChevronRight className="h-3 w-3" />
                          <span>Essays</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <ChevronRight className="h-3 w-3" />
                          <span>CV & Lettres</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <ChevronRight className="h-3 w-3" />
                          <span>Stratégie & Choix Écoles</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <ChevronRight className="h-3 w-3" />
                          <span>Préparation Oraux</span>
                        </div>
                      </>
                    )}
                    {selectedPack.name.includes("ORAL_MASTERY") && (
                      <>
                        <div className="flex items-center gap-2 text-sm">
                          <ChevronRight className="h-3 w-3" />
                          <span>Préparation Discours</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <ChevronRight className="h-3 w-3" />
                          <span>Simulations</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <ChevronRight className="h-3 w-3" />
                          <span>Banque Questions</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <ChevronRight className="h-3 w-3" />
                          <span>Feedback Sessions</span>
                        </div>
                      </>
                    )}
                    {selectedPack.name.includes("ADDON") && (
                      <>
                        <div className="flex items-center gap-2 text-sm">
                          <ChevronRight className="h-3 w-3" />
                          <span>Essays</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <ChevronRight className="h-3 w-3" />
                          <span>Préparation Oraux</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <ChevronRight className="h-3 w-3" />
                          <span>Ressources {selectedPack.geography}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="bg-performup-gold/5 border border-performup-gold/20 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-foreground">Prix personnalisé</strong>
                    <br />
                    Le prix est défini individuellement pour chaque étudiant lors de
                    la création de son dossier.
                  </p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

