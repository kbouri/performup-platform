"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ClipboardCheck,
  Plus,
  FileText,
  Video,
  Calendar,
  Trophy,
  Target,
  TrendingUp,
  GraduationCap,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface TestScore {
  id: string;
  testType: string;
  scoreType: string;
  scoreQuant: number | null;
  scoreVerbal: number | null;
  scoreAWA: number | null;
  scoreIR: number | null;
  totalScore: number | null;
  scoreString: string | null;
  testDate: string;
  validUntil: string | null;
  notes: string | null;
  document: { id: string; name: string; fileUrl: string } | null;
  createdBy: { id: string; name: string } | null;
  createdAt: string;
}

interface TestBlanc {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  completed: boolean;
  notes: string | null;
  instructor: { id: string; name: string } | null;
}

interface Simulation {
  id: string;
  title: string;
  school: { id: string; name: string; logoUrl: string | null } | null;
  date: string;
  score: number | null;
  notes: string | null;
  videoUrl: string | null;
  completed: boolean;
  createdAt: string;
}

const TEST_TYPES = [
  { value: "GMAT", label: "GMAT" },
  { value: "GRE", label: "GRE" },
  { value: "TAGE_MAGE", label: "TAGE MAGE" },
];

const SCORE_TYPES = [
  { value: "DIAGNOSTIC", label: "Diagnostic" },
  { value: "PRACTICE", label: "Entraînement" },
  { value: "OFFICIAL", label: "Officiel" },
];

function getScoreTypeColor(type: string) {
  switch (type) {
    case "OFFICIAL":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
    case "PRACTICE":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
    case "DIAGNOSTIC":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function getTestTypeLabel(type: string) {
  return TEST_TYPES.find((t) => t.value === type)?.label || type;
}

function getScoreTypeLabel(type: string) {
  return SCORE_TYPES.find((t) => t.value === type)?.label || type;
}

export default function TestsPage() {
  const [activeTab, setActiveTab] = useState("scores");
  const [scores, setScores] = useState<TestScore[]>([]);
  const [testsBlancs, setTestsBlancs] = useState<TestBlanc[]>([]);
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddScore, setShowAddScore] = useState(false);
  const [showAddSimulation, setShowAddSimulation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state for new score
  const [scoreForm, setScoreForm] = useState({
    testType: "",
    scoreType: "",
    scoreQuant: "",
    scoreVerbal: "",
    scoreAWA: "",
    scoreIR: "",
    totalScore: "",
    testDate: "",
    notes: "",
  });

  // Form state for new simulation
  const [simForm, setSimForm] = useState({
    title: "",
    date: "",
    score: "",
    notes: "",
    videoUrl: "",
  });

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch("/api/tests");
      if (response.ok) {
        const data = await response.json();
        setScores(data.scores);
        setTestsBlancs(data.testsBlancs);
        setSimulations(data.simulations);
      }
    } catch (error) {
      console.error("Error fetching tests:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddScore = async () => {
    if (!scoreForm.testType || !scoreForm.scoreType || !scoreForm.testDate) {
      alert("Type de test, type de score et date sont requis");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scoreForm),
      });

      if (response.ok) {
        setShowAddScore(false);
        setScoreForm({
          testType: "",
          scoreType: "",
          scoreQuant: "",
          scoreVerbal: "",
          scoreAWA: "",
          scoreIR: "",
          totalScore: "",
          testDate: "",
          notes: "",
        });
        fetchData();
      }
    } catch (error) {
      console.error("Error adding score:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSimulation = async () => {
    if (!simForm.title || !simForm.date) {
      alert("Titre et date sont requis");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/tests/simulations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(simForm),
      });

      if (response.ok) {
        setShowAddSimulation(false);
        setSimForm({
          title: "",
          date: "",
          score: "",
          notes: "",
          videoUrl: "",
        });
        fetchData();
      }
    } catch (error) {
      console.error("Error adding simulation:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate stats
  const latestGMAT = scores.find((s) => s.testType === "GMAT" && s.scoreType === "OFFICIAL");
  const latestGRE = scores.find((s) => s.testType === "GRE" && s.scoreType === "OFFICIAL");
  const completedSimulations = simulations.filter((s) => s.completed).length;
  const upcomingTestsBlancs = testsBlancs.filter(
    (t) => new Date(t.startTime) > new Date() && !t.completed
  ).length;

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tests & Simulations"
        description="Gérez vos scores de tests et simulations orales"
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-performup-blue/10 p-3">
              <Trophy className="h-6 w-6 text-performup-blue" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Meilleur GMAT</p>
              <p className="text-2xl font-bold">
                {latestGMAT?.totalScore || "—"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-green-500/10 p-3">
              <Target className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Meilleur GRE</p>
              <p className="text-2xl font-bold">
                {latestGRE?.totalScore || "—"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-orange-500/10 p-3">
              <Calendar className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tests blancs à venir</p>
              <p className="text-2xl font-bold">{upcomingTestsBlancs}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-purple-500/10 p-3">
              <GraduationCap className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Simulations orales</p>
              <p className="text-2xl font-bold">{completedSimulations}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="scores" className="gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Scores ({scores.length})
          </TabsTrigger>
          <TabsTrigger value="blancs" className="gap-2">
            <FileText className="h-4 w-4" />
            Tests Blancs ({testsBlancs.length})
          </TabsTrigger>
          <TabsTrigger value="simulations" className="gap-2">
            <Video className="h-4 w-4" />
            Simulations ({simulations.length})
          </TabsTrigger>
        </TabsList>

        {/* Scores Tab */}
        <TabsContent value="scores" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Historique des scores</CardTitle>
              <Button onClick={() => setShowAddScore(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un score
              </Button>
            </CardHeader>
            <CardContent>
              {scores.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ClipboardCheck className="mb-4 h-12 w-12 text-muted-foreground/50" />
                  <p className="text-muted-foreground">Aucun score enregistré</p>
                  <Button
                    variant="link"
                    onClick={() => setShowAddScore(true)}
                    className="mt-2"
                  >
                    Ajouter votre premier score
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Test</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Quant</TableHead>
                      <TableHead>Verbal</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scores.map((score) => (
                      <TableRow key={score.id}>
                        <TableCell className="font-medium">
                          {getTestTypeLabel(score.testType)}
                        </TableCell>
                        <TableCell>
                          <Badge className={getScoreTypeColor(score.scoreType)}>
                            {getScoreTypeLabel(score.scoreType)}
                          </Badge>
                        </TableCell>
                        <TableCell>{score.scoreQuant ?? "—"}</TableCell>
                        <TableCell>{score.scoreVerbal ?? "—"}</TableCell>
                        <TableCell className="font-bold">
                          {score.totalScore ?? score.scoreString ?? "—"}
                        </TableCell>
                        <TableCell>
                          {format(new Date(score.testDate), "d MMM yyyy", { locale: fr })}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {score.notes || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tests Blancs Tab */}
        <TabsContent value="blancs" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Tests Blancs</CardTitle>
            </CardHeader>
            <CardContent>
              {testsBlancs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="mb-4 h-12 w-12 text-muted-foreground/50" />
                  <p className="text-muted-foreground">Aucun test blanc planifié</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Rendez-vous sur la page Planning pour réserver un test blanc
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {testsBlancs.map((test) => {
                    const isPast = new Date(test.endTime) < new Date();
                    return (
                      <div
                        key={test.id}
                        className={cn(
                          "flex items-center justify-between rounded-lg border p-4",
                          test.completed && "bg-green-50 dark:bg-green-900/10"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={cn(
                              "rounded-lg p-3",
                              test.completed
                                ? "bg-green-100 dark:bg-green-900"
                                : isPast
                                  ? "bg-gray-100 dark:bg-gray-800"
                                  : "bg-orange-100 dark:bg-orange-900"
                            )}
                          >
                            <FileText
                              className={cn(
                                "h-5 w-5",
                                test.completed
                                  ? "text-green-600"
                                  : isPast
                                    ? "text-gray-500"
                                    : "text-orange-600"
                              )}
                            />
                          </div>
                          <div>
                            <p className="font-medium">{test.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(test.startTime), "EEEE d MMMM yyyy 'à' HH:mm", {
                                locale: fr,
                              })}
                            </p>
                            {test.instructor && (
                              <p className="text-sm text-muted-foreground">
                                Avec {test.instructor.name}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {test.completed ? (
                            <Badge className="bg-green-100 text-green-800">Terminé</Badge>
                          ) : isPast ? (
                            <Badge variant="secondary">Passé</Badge>
                          ) : (
                            <Badge className="bg-orange-100 text-orange-800">À venir</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Simulations Tab */}
        <TabsContent value="simulations" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Simulations Orales</CardTitle>
              <Button onClick={() => setShowAddSimulation(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter une simulation
              </Button>
            </CardHeader>
            <CardContent>
              {simulations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Video className="mb-4 h-12 w-12 text-muted-foreground/50" />
                  <p className="text-muted-foreground">Aucune simulation enregistrée</p>
                  <Button
                    variant="link"
                    onClick={() => setShowAddSimulation(true)}
                    className="mt-2"
                  >
                    Ajouter votre première simulation
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {simulations.map((sim) => (
                    <Card key={sim.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{sim.title}</p>
                            {sim.school && (
                              <p className="text-sm text-muted-foreground">
                                {sim.school.name}
                              </p>
                            )}
                          </div>
                          {sim.score !== null && (
                            <Badge variant="secondary" className="text-lg font-bold">
                              {sim.score}/20
                            </Badge>
                          )}
                        </div>

                        <p className="mt-2 text-sm text-muted-foreground">
                          {format(new Date(sim.date), "d MMMM yyyy", { locale: fr })}
                        </p>

                        {sim.notes && (
                          <p className="mt-2 line-clamp-2 text-sm">{sim.notes}</p>
                        )}

                        {sim.videoUrl && (
                          <a
                            href={sim.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 flex items-center gap-2 text-sm text-performup-blue hover:underline"
                          >
                            <Video className="h-4 w-4" />
                            Voir la vidéo
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}

                        <div className="mt-3">
                          {sim.completed ? (
                            <Badge className="bg-green-100 text-green-800">Terminée</Badge>
                          ) : (
                            <Badge variant="secondary">En cours</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Score Dialog */}
      <Dialog open={showAddScore} onOpenChange={setShowAddScore}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter un score</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type de test *</Label>
                <Select
                  value={scoreForm.testType}
                  onValueChange={(v) => setScoreForm((p) => ({ ...p, testType: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {TEST_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type de score *</Label>
                <Select
                  value={scoreForm.scoreType}
                  onValueChange={(v) => setScoreForm((p) => ({ ...p, scoreType: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {SCORE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Score Quant</Label>
                <Input
                  type="number"
                  value={scoreForm.scoreQuant}
                  onChange={(e) => setScoreForm((p) => ({ ...p, scoreQuant: e.target.value }))}
                  placeholder="ex: 49"
                />
              </div>
              <div className="space-y-2">
                <Label>Score Verbal</Label>
                <Input
                  type="number"
                  value={scoreForm.scoreVerbal}
                  onChange={(e) => setScoreForm((p) => ({ ...p, scoreVerbal: e.target.value }))}
                  placeholder="ex: 40"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Score Total</Label>
                <Input
                  type="number"
                  value={scoreForm.totalScore}
                  onChange={(e) => setScoreForm((p) => ({ ...p, totalScore: e.target.value }))}
                  placeholder="ex: 720"
                />
              </div>
              <div className="space-y-2">
                <Label>AWA</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={scoreForm.scoreAWA}
                  onChange={(e) => setScoreForm((p) => ({ ...p, scoreAWA: e.target.value }))}
                  placeholder="ex: 5.5"
                />
              </div>
              <div className="space-y-2">
                <Label>IR</Label>
                <Input
                  type="number"
                  value={scoreForm.scoreIR}
                  onChange={(e) => setScoreForm((p) => ({ ...p, scoreIR: e.target.value }))}
                  placeholder="ex: 7"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Date du test *</Label>
              <Input
                type="date"
                value={scoreForm.testDate}
                onChange={(e) => setScoreForm((p) => ({ ...p, testDate: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={scoreForm.notes}
                onChange={(e) => setScoreForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Notes additionnelles..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddScore(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddScore} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Simulation Dialog */}
      <Dialog open={showAddSimulation} onOpenChange={setShowAddSimulation}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter une simulation orale</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Titre *</Label>
              <Input
                value={simForm.title}
                onChange={(e) => setSimForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="ex: Simulation HEC Paris"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={simForm.date}
                  onChange={(e) => setSimForm((p) => ({ ...p, date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Score /20</Label>
                <Input
                  type="number"
                  min="0"
                  max="20"
                  value={simForm.score}
                  onChange={(e) => setSimForm((p) => ({ ...p, score: e.target.value }))}
                  placeholder="ex: 15"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>URL de la vidéo</Label>
              <Input
                type="url"
                value={simForm.videoUrl}
                onChange={(e) => setSimForm((p) => ({ ...p, videoUrl: e.target.value }))}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={simForm.notes}
                onChange={(e) => setSimForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Points forts, axes d'amélioration..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSimulation(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddSimulation} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
