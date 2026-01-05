"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatRelativeTime } from "@/lib/utils";
import {
  Plus,
  Search,
  PenTool,
  FileText,
  CheckCircle2,
  Clock,
  Eye,
  Edit,
  MessageSquare,
  Building2,
} from "lucide-react";

// Mock essays data
const essaysData = [
  {
    id: "1",
    school: "HEC Paris",
    program: "MiM",
    question: "What is your career objective and how will the HEC MiM help you achieve it?",
    wordLimit: 500,
    status: "IN_REVIEW",
    progress: 85,
    wordCount: 478,
    lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000),
    student: "Marie Dupont",
    mentorComments: 3,
    version: 2,
  },
  {
    id: "2",
    school: "HEC Paris",
    program: "MiM",
    question: "Describe a situation where you demonstrated leadership skills.",
    wordLimit: 400,
    status: "DRAFT",
    progress: 45,
    wordCount: 180,
    lastUpdated: new Date(Date.now() - 24 * 60 * 60 * 1000),
    student: "Marie Dupont",
    mentorComments: 0,
    version: 1,
  },
  {
    id: "3",
    school: "ESSEC",
    program: "MiM",
    question: "What makes you unique and what will you bring to the ESSEC community?",
    wordLimit: 600,
    status: "FINALIZED",
    progress: 100,
    wordCount: 592,
    lastUpdated: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    student: "Marie Dupont",
    mentorComments: 5,
    version: 4,
  },
  {
    id: "4",
    school: "ESCP",
    program: "MiM",
    question: "Explain your academic and professional background and your future plans.",
    wordLimit: 500,
    status: "NOT_STARTED",
    progress: 0,
    wordCount: 0,
    lastUpdated: null,
    student: "Marie Dupont",
    mentorComments: 0,
    version: 0,
  },
  {
    id: "5",
    school: "INSEAD",
    program: "MBA",
    question: "Describe the achievement of which you are most proud and explain why.",
    wordLimit: 300,
    status: "DRAFT",
    progress: 60,
    wordCount: 185,
    lastUpdated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    student: "Thomas Bernard",
    mentorComments: 1,
    version: 1,
  },
];

const statusConfig: Record<
  string,
  { label: string; color: string; icon: React.ElementType; variant: "success" | "warning" | "error" | "secondary" }
> = {
  NOT_STARTED: { label: "Non commencé", color: "text-muted-foreground", icon: Clock, variant: "secondary" },
  DRAFT: { label: "Brouillon", color: "text-warning", icon: Edit, variant: "warning" },
  IN_REVIEW: { label: "En révision", color: "text-performup-blue", icon: MessageSquare, variant: "secondary" },
  FINALIZED: { label: "Finalisé", color: "text-success", icon: CheckCircle2, variant: "success" },
};

export default function EssaysPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [schoolFilter, setSchoolFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("all");

  // Get unique schools
  const schools = Array.from(new Set(essaysData.map((e) => e.school)));

  // Filter essays
  const filteredEssays = essaysData.filter((essay) => {
    const matchesSearch =
      essay.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      essay.school.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSchool = schoolFilter === "all" || essay.school === schoolFilter;
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "in_progress" && ["DRAFT", "IN_REVIEW"].includes(essay.status)) ||
      (activeTab === "completed" && essay.status === "FINALIZED") ||
      (activeTab === "not_started" && essay.status === "NOT_STARTED");
    return matchesSearch && matchesSchool && matchesTab;
  });

  // Calculate stats
  const stats = {
    total: essaysData.length,
    completed: essaysData.filter((e) => e.status === "FINALIZED").length,
    inProgress: essaysData.filter((e) => ["DRAFT", "IN_REVIEW"].includes(e.status)).length,
    notStarted: essaysData.filter((e) => e.status === "NOT_STARTED").length,
  };

  return (
    <>
      <PageHeader
        title="Essays"
        description="Gérez et suivez vos essays de candidature"
        breadcrumbs={[{ label: "Essays" }]}
        actions={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nouvel essay
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-performup-blue/10">
                <FileText className="h-6 w-6 text-performup-blue" />
              </div>
              <div>
                <div className="text-2xl font-bold font-display">{stats.total}</div>
                <p className="text-sm text-muted-foreground">Total essays</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10">
                <CheckCircle2 className="h-6 w-6 text-success" />
              </div>
              <div>
                <div className="text-2xl font-bold font-display">{stats.completed}</div>
                <p className="text-sm text-muted-foreground">Finalisés</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-warning/10">
                <Edit className="h-6 w-6 text-warning" />
              </div>
              <div>
                <div className="text-2xl font-bold font-display">{stats.inProgress}</div>
                <p className="text-sm text-muted-foreground">En cours</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                <Clock className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <div className="text-2xl font-bold font-display">{stats.notStarted}</div>
                <p className="text-sm text-muted-foreground">Non commencés</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs & Filters */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="all">Tous</TabsTrigger>
            <TabsTrigger value="in_progress">En cours</TabsTrigger>
            <TabsTrigger value="completed">Finalisés</TabsTrigger>
            <TabsTrigger value="not_started">Non commencés</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-4">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={schoolFilter} onValueChange={setSchoolFilter}>
              <SelectTrigger className="w-[150px]">
                <Building2 className="mr-2 h-4 w-4" />
                <SelectValue placeholder="École" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les écoles</SelectItem>
                {schools.map((school) => (
                  <SelectItem key={school} value={school}>
                    {school}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Tabs>

      {/* Essays grouped by school */}
      <div className="space-y-6">
        {schools
          .filter((school) => schoolFilter === "all" || school === schoolFilter)
          .map((school) => {
            const schoolEssays = filteredEssays.filter((e) => e.school === school);
            if (schoolEssays.length === 0) return null;

            const completedCount = schoolEssays.filter((e) => e.status === "FINALIZED").length;
            const overallProgress = Math.round(
              schoolEssays.reduce((acc, e) => acc + e.progress, 0) / schoolEssays.length
            );

            return (
              <Card key={school}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <CardTitle>{school}</CardTitle>
                        <CardDescription>
                          {completedCount}/{schoolEssays.length} essays finalisés
                        </CardDescription>
                      </div>
                    </div>
                    <div className="w-32">
                      <Progress value={overallProgress} showEncouragement={false} size="sm" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {schoolEssays.map((essay) => {
                      const status = statusConfig[essay.status];
                      const StatusIcon = status.icon;

                      return (
                        <div
                          key={essay.id}
                          className="flex items-start gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <div
                            className={cn(
                              "flex h-10 w-10 items-center justify-center rounded-lg shrink-0",
                              essay.status === "FINALIZED"
                                ? "bg-success/10"
                                : essay.status === "IN_REVIEW"
                                ? "bg-performup-blue/10"
                                : essay.status === "DRAFT"
                                ? "bg-warning/10"
                                : "bg-muted"
                            )}
                          >
                            <StatusIcon
                              className={cn(
                                "h-5 w-5",
                                essay.status === "FINALIZED"
                                  ? "text-success"
                                  : essay.status === "IN_REVIEW"
                                  ? "text-performup-blue"
                                  : essay.status === "DRAFT"
                                  ? "text-warning"
                                  : "text-muted-foreground"
                              )}
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline">{essay.program}</Badge>
                              <Badge variant={status.variant}>{status.label}</Badge>
                              {essay.mentorComments > 0 && (
                                <Badge variant="secondary" className="gap-1">
                                  <MessageSquare className="h-3 w-3" />
                                  {essay.mentorComments}
                                </Badge>
                              )}
                            </div>
                            <p className="font-medium line-clamp-2 mb-2">{essay.question}</p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>
                                {essay.wordCount}/{essay.wordLimit} mots
                              </span>
                              {essay.version > 0 && <span>v{essay.version}</span>}
                              {essay.lastUpdated && (
                                <span>Modifié {formatRelativeTime(essay.lastUpdated)}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <div className="w-20">
                              <Progress value={essay.progress} showEncouragement={false} size="sm" />
                            </div>
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>

      {filteredEssays.length === 0 && (
        <div className="text-center py-12">
          <PenTool className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">Aucun essay trouvé</p>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Créer un essay
          </Button>
        </div>
      )}
    </>
  );
}

