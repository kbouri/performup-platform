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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Search,
  Building2,
  MapPin,
  GraduationCap,
  ExternalLink,
  Loader2,
  Globe,
  BookOpen,
} from "lucide-react";

interface Program {
  id: string;
  name: string;
  type: string;
  duration: string | null;
  degree: string | null;
}

interface School {
  id: string;
  name: string;
  country: string;
  city: string | null;
  website: string | null;
  logoUrl: string | null;
  programs: Program[];
}

// Country flags
const countryFlags: Record<string, string> = {
  France: "🇫🇷",
  UK: "🇬🇧",
  Italie: "🇮🇹",
  Espagne: "🇪🇸",
  Suisse: "🇨🇭",
};

// Program type colors
const programTypeColors: Record<string, string> = {
  MiM: "bg-performup-blue/10 text-performup-blue border-performup-blue/20",
  MIF: "bg-performup-gold/10 text-performup-gold border-performup-gold/20",
  MSc: "bg-success/10 text-success border-success/20",
  MBA: "bg-warning/10 text-warning border-warning/20",
  LLM: "bg-error/10 text-error border-error/20",
};

export default function SchoolsPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState<string>("_all");
  const [programTypeFilter, setProgramTypeFilter] = useState<string>("_all");
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newSchool, setNewSchool] = useState({
    name: "",
    country: "",
    city: "",
    website: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Fetch schools
  useEffect(() => {
    async function fetchSchools() {
      try {
        const response = await fetch("/api/schools");
        if (response.ok) {
          const data = await response.json();
          setSchools(data.schools || []);
        }
      } catch (error) {
        console.error("Error fetching schools:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchSchools();
  }, []);

  // Get unique countries
  const countries = useMemo(() => {
    const uniqueCountries = Array.from(new Set(schools.map((s) => s.country)));
    return uniqueCountries.sort();
  }, [schools]);

  // Get unique program types
  const programTypes = useMemo(() => {
    const types = new Set<string>();
    schools.forEach((s) => {
      s.programs.forEach((p) => types.add(p.type));
    });
    return Array.from(types).sort();
  }, [schools]);

  // Filter schools
  const filteredSchools = useMemo(() => {
    return schools.filter((school) => {
      const matchesSearch =
        searchQuery === "" ||
        school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        school.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        school.programs.some((p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase())
        );

      const matchesCountry =
        countryFilter === "_all" || school.country === countryFilter;

      const matchesProgramType =
        programTypeFilter === "_all" ||
        school.programs.some((p) => p.type === programTypeFilter);

      return matchesSearch && matchesCountry && matchesProgramType;
    });
  }, [schools, searchQuery, countryFilter, programTypeFilter]);

  // Group schools by country
  const schoolsByCountry = useMemo(() => {
    const grouped: Record<string, School[]> = {};
    filteredSchools.forEach((school) => {
      if (!grouped[school.country]) {
        grouped[school.country] = [];
      }
      grouped[school.country].push(school);
    });
    return grouped;
  }, [filteredSchools]);

  // Stats
  const stats = useMemo(() => {
    const totalPrograms = schools.reduce((acc, s) => acc + s.programs.length, 0);
    return {
      totalSchools: schools.length,
      totalPrograms,
      totalCountries: countries.length,
    };
  }, [schools, countries]);

  // Handle create school
  const handleCreateSchool = async () => {
    if (!newSchool.name || !newSchool.country) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSchool),
      });

      if (response.ok) {
        const data = await response.json();
        setSchools((prev) => [...prev, { ...data.school, programs: [] }]);
        setNewSchool({ name: "", country: "", city: "", website: "" });
        setShowAddDialog(false);
      }
    } catch (error) {
      console.error("Error creating school:", error);
    } finally {
      setSubmitting(false);
    }
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
        title="Écoles & Programmes"
        description="Gérez les écoles partenaires et leurs programmes de master"
        actions={
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter une école
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter une école</DialogTitle>
                <DialogDescription>
                  Ajoutez une nouvelle école partenaire à la plateforme
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="school-name">Nom de l&apos;école *</Label>
                  <Input
                    id="school-name"
                    placeholder="Ex: HEC Paris"
                    value={newSchool.name}
                    onChange={(e) =>
                      setNewSchool((prev) => ({ ...prev, name: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school-country">Pays *</Label>
                  <Select
                    value={newSchool.country || "_none"}
                    onValueChange={(value) =>
                      setNewSchool((prev) => ({
                        ...prev,
                        country: value === "_none" ? "" : value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un pays" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Sélectionner...</SelectItem>
                      <SelectItem value="France">🇫🇷 France</SelectItem>
                      <SelectItem value="UK">🇬🇧 Royaume-Uni</SelectItem>
                      <SelectItem value="Italie">🇮🇹 Italie</SelectItem>
                      <SelectItem value="Espagne">🇪🇸 Espagne</SelectItem>
                      <SelectItem value="Suisse">🇨🇭 Suisse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school-city">Ville</Label>
                  <Input
                    id="school-city"
                    placeholder="Ex: Paris"
                    value={newSchool.city}
                    onChange={(e) =>
                      setNewSchool((prev) => ({ ...prev, city: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school-website">Site web</Label>
                  <Input
                    id="school-website"
                    placeholder="https://www.example.com"
                    value={newSchool.website}
                    onChange={(e) =>
                      setNewSchool((prev) => ({
                        ...prev,
                        website: e.target.value,
                      }))
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
                  onClick={handleCreateSchool}
                  disabled={!newSchool.name || !newSchool.country || submitting}
                >
                  {submitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Créer l&apos;école
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-performup-blue/10">
                <Building2 className="h-6 w-6 text-performup-blue" />
              </div>
              <div>
                <div className="text-2xl font-display font-semibold">
                  {stats.totalSchools}
                </div>
                <p className="text-sm text-muted-foreground">Écoles</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-performup-gold/10">
                <GraduationCap className="h-6 w-6 text-performup-gold" />
              </div>
              <div>
                <div className="text-2xl font-display font-semibold">
                  {stats.totalPrograms}
                </div>
                <p className="text-sm text-muted-foreground">Programmes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10">
                <Globe className="h-6 w-6 text-success" />
              </div>
              <div>
                <div className="text-2xl font-display font-semibold">
                  {stats.totalCountries}
                </div>
                <p className="text-sm text-muted-foreground">Pays</p>
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
                placeholder="Rechercher une école ou un programme..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Tous les pays" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Tous les pays</SelectItem>
                {countries.map((country) => (
                  <SelectItem key={country} value={country}>
                    {countryFlags[country] || ""} {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={programTypeFilter} onValueChange={setProgramTypeFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Tous les types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Tous les types</SelectItem>
                {programTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Schools List */}
      <Tabs defaultValue="list" className="space-y-6">
        <TabsList>
          <TabsTrigger value="list">Liste</TabsTrigger>
          <TabsTrigger value="byCountry">Par pays</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredSchools.map((school) => (
              <Card
                key={school.id}
                className="cursor-pointer hover:border-performup-blue/50 transition-colors"
                onClick={() => setSelectedSchool(school)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-performup-blue/10 text-lg">
                        {countryFlags[school.country] || "🏫"}
                      </div>
                      <div>
                        <CardTitle className="text-base">{school.name}</CardTitle>
                        {school.city && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {school.city}
                          </p>
                        )}
                      </div>
                    </div>
                    {school.website && (
                      <a
                        href={school.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-performup-blue"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {school.programs.length} programme
                      {school.programs.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {Array.from(new Set(school.programs.map((p) => p.type)))
                      .slice(0, 4)
                      .map((type) => (
                        <Badge
                          key={type}
                          variant="outline"
                          className={programTypeColors[type] || ""}
                        >
                          {type}
                        </Badge>
                      ))}
                    {new Set(school.programs.map((p) => p.type)).size > 4 && (
                      <Badge variant="outline">
                        +{new Set(school.programs.map((p) => p.type)).size - 4}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {filteredSchools.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucune école trouvée</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="byCountry">
          <div className="space-y-8">
            {Object.entries(schoolsByCountry)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([country, countrySchools]) => (
                <div key={country}>
                  <h3 className="text-lg font-display font-semibold mb-4 flex items-center gap-2">
                    <span className="text-2xl">{countryFlags[country] || "🌍"}</span>
                    {country}
                    <Badge variant="secondary">{countrySchools.length}</Badge>
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {countrySchools.map((school) => (
                      <Card
                        key={school.id}
                        className="cursor-pointer hover:border-performup-blue/50 transition-colors"
                        onClick={() => setSelectedSchool(school)}
                      >
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{school.name}</h4>
                            {school.website && (
                              <a
                                href={school.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-performup-blue"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                          {school.city && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                              <MapPin className="h-3 w-3" />
                              {school.city}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            {school.programs.length} programme
                            {school.programs.length !== 1 ? "s" : ""}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* School Detail Dialog */}
      <Dialog
        open={!!selectedSchool}
        onOpenChange={(open) => !open && setSelectedSchool(null)}
      >
        <DialogContent className="max-w-2xl">
          {selectedSchool && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-performup-blue/10 text-2xl">
                    {countryFlags[selectedSchool.country] || "🏫"}
                  </div>
                  <div>
                    <DialogTitle className="text-xl">
                      {selectedSchool.name}
                    </DialogTitle>
                    <DialogDescription className="flex items-center gap-2">
                      {selectedSchool.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {selectedSchool.city}
                        </span>
                      )}
                      <span>•</span>
                      <span>{selectedSchool.country}</span>
                      {selectedSchool.website && (
                        <>
                          <span>•</span>
                          <a
                            href={selectedSchool.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-performup-blue hover:underline flex items-center gap-1"
                          >
                            Site web <ExternalLink className="h-3 w-3" />
                          </a>
                        </>
                      )}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="py-4">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  Programmes ({selectedSchool.programs.length})
                </h4>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-2">
                    {selectedSchool.programs.map((program) => (
                      <div
                        key={program.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {program.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {program.degree}
                            {program.duration && ` • ${program.duration}`}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={programTypeColors[program.type] || ""}
                        >
                          {program.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

