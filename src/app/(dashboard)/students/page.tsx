"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency, STUDENT_STATUS_DISPLAY } from "@/lib/utils";
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Mail,
  Calendar,
  FileText,
  LayoutGrid,
  List,
  ArrowUpDown,
  Loader2,
  Users,
} from "lucide-react";
import Link from "next/link";

interface StudentData {
  id: string;
  userId: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  image: string | null;
  active: boolean;
  status: string;
  startDate: string | null;
  programType: string;
  nationality: string | null;
  currentFormation: string | null;
  mentor: {
    id: string;
    name: string;
  } | null;
  packs: Array<{
    id: string;
    packId: string;
    displayName: string;
    progress: number;
    status: string;
    customPrice: number;
  }>;
  schools: Array<{
    id: string;
    name: string;
    priority: number;
    status: string;
  }>;
  totalPaid: number;
  totalDue: number;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type ViewMode = "grid" | "list";

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentData[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [mentorFilter, setMentorFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [mentors, setMentors] = useState<Array<{ id: string; name: string }>>([]);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (mentorFilter !== "all") params.set("mentorId", mentorFilter);
      params.set("page", pagination.page.toString());
      params.set("limit", pagination.limit.toString());

      const response = await fetch(`/api/students?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setStudents(data.students);
        setPagination(data.pagination);

        // Extract unique mentors for filter
        const uniqueMentors = new Map<string, string>();
        data.students.forEach((s: StudentData) => {
          if (s.mentor) {
            uniqueMentors.set(s.mentor.id, s.mentor.name);
          }
        });
        setMentors(
          Array.from(uniqueMentors, ([id, name]) => ({ id, name }))
        );
      }
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, mentorFilter, pagination.page, pagination.limit]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchStudents();
    }, 300);
    return () => clearTimeout(debounce);
  }, [fetchStudents]);

  // Calculate stats
  const stats = {
    total: pagination.total,
    enCours: students.filter((s) => s.status === "EN_COURS").length,
    finalise: students.filter((s) => s.status === "FINALISE").length,
    totalRevenue: students.reduce((acc, s) => acc + s.totalPaid, 0),
  };

  return (
    <>
      <PageHeader
        title="Étudiants"
        description="Gérez vos étudiants et suivez leur progression"
        breadcrumbs={[{ label: "Étudiants" }]}
        actions={
          <Button asChild>
            <Link href="/students/new">
              <Plus className="mr-2 h-4 w-4" />
              Nouvel étudiant
            </Link>
          </Button>
        }
      />

      {/* Stats summary */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-performup-blue/10">
                <Users className="h-6 w-6 text-performup-blue" />
              </div>
              <div>
                <div className="text-2xl font-bold font-display text-performup-blue">
                  {stats.total}
                </div>
                <p className="text-sm text-muted-foreground">Total étudiants</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold font-display text-success">
              {stats.enCours}
            </div>
            <p className="text-sm text-muted-foreground">En cours</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold font-display text-performup-gold">
              {stats.finalise}
            </div>
            <p className="text-sm text-muted-foreground">Finalisés</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold font-display">
              {formatCurrency(stats.totalRevenue)}
            </div>
            <p className="text-sm text-muted-foreground">Revenus totaux</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher un étudiant..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="EN_DEMARRAGE">En démarrage</SelectItem>
              <SelectItem value="EN_COURS">En cours</SelectItem>
              <SelectItem value="FINALISE">Finalisé</SelectItem>
              <SelectItem value="SUSPENDU">Suspendu</SelectItem>
              <SelectItem value="EN_PAUSE">En pause</SelectItem>
            </SelectContent>
          </Select>

          <Select value={mentorFilter} onValueChange={setMentorFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Mentor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les mentors</SelectItem>
              {mentors.map((mentor) => (
                <SelectItem key={mentor.id} value={mentor.id}>
                  {mentor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-performup-blue" />
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">Aucun étudiant trouvé</p>
          <Button asChild>
            <Link href="/students/new">
              <Plus className="mr-2 h-4 w-4" />
              Créer un étudiant
            </Link>
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {students.map((student) => {
            const statusInfo = STUDENT_STATUS_DISPLAY[student.status] || {
              label: student.status,
              variant: "secondary",
            };
            return (
              <Card key={student.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        name={student.name || student.email}
                        size="lg"
                      />
                      <div>
                        <Link
                          href={`/students/${student.id}`}
                          className="font-medium hover:text-performup-blue transition-colors"
                        >
                          {student.name || student.email}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {student.email}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={`/students/${student.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            Voir le profil
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Mail className="mr-2 h-4 w-4" />
                          Envoyer un email
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Calendar className="mr-2 h-4 w-4" />
                          Planifier un cours
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <FileText className="mr-2 h-4 w-4" />
                          Voir les documents
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge
                        variant={
                          statusInfo.variant as
                            | "success"
                            | "warning"
                            | "error"
                            | "secondary"
                        }
                      >
                        {statusInfo.label}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {student.packs.map((p) => p.displayName).join(", ") ||
                          "Aucun pack"}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-muted-foreground">
                          Progression
                        </span>
                      </div>
                      <Progress
                        value={student.progress}
                        showEncouragement={false}
                        size="sm"
                      />
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {student.schools.slice(0, 3).map((school) => (
                        <Badge
                          key={school.id}
                          variant="outline"
                          className="text-xs"
                        >
                          {school.name}
                        </Badge>
                      ))}
                      {student.schools.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{student.schools.length - 3}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-sm pt-2 border-t">
                      <span className="text-muted-foreground">
                        {student.mentor
                          ? `Mentor: ${student.mentor.name}`
                          : "Pas de mentor"}
                      </span>
                      <span className="text-muted-foreground">
                        {formatCurrency(student.totalPaid)} /{" "}
                        {formatCurrency(student.totalDue)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">
                      <Button variant="ghost" size="sm" className="-ml-3">
                        Étudiant <ArrowUpDown className="ml-1 h-3 w-3" />
                      </Button>
                    </th>
                    <th className="text-left p-4 font-medium">Statut</th>
                    <th className="text-left p-4 font-medium">Pack</th>
                    <th className="text-left p-4 font-medium">Mentor</th>
                    <th className="text-left p-4 font-medium">Progression</th>
                    <th className="text-left p-4 font-medium">Paiements</th>
                    <th className="text-right p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const statusInfo = STUDENT_STATUS_DISPLAY[student.status] || {
                      label: student.status,
                      variant: "secondary",
                    };
                    return (
                      <tr key={student.id} className="border-b hover:bg-muted/30">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <UserAvatar
                              name={student.name || student.email}
                              size="sm"
                            />
                            <div>
                              <Link
                                href={`/students/${student.id}`}
                                className="font-medium hover:text-performup-blue transition-colors"
                              >
                                {student.name || student.email}
                              </Link>
                              <p className="text-sm text-muted-foreground">
                                {student.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge
                            variant={
                              statusInfo.variant as
                                | "success"
                                | "warning"
                                | "error"
                                | "secondary"
                            }
                          >
                            {statusInfo.label}
                          </Badge>
                        </td>
                        <td className="p-4 text-sm">
                          {student.packs.map((p) => p.displayName).join(", ") ||
                            "-"}
                        </td>
                        <td className="p-4 text-sm">
                          {student.mentor?.name || "-"}
                        </td>
                        <td className="p-4 w-40">
                          <Progress
                            value={student.progress}
                            showEncouragement={false}
                            size="sm"
                          />
                        </td>
                        <td className="p-4 text-sm">
                          {formatCurrency(student.totalPaid)} /{" "}
                          {formatCurrency(student.totalDue)}
                        </td>
                        <td className="p-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/students/${student.id}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Voir le profil
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Mail className="mr-2 h-4 w-4" />
                                Envoyer un email
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Calendar className="mr-2 h-4 w-4" />
                                Planifier un cours
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() =>
              setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
            }
          >
            Précédent
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {pagination.page} sur {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() =>
              setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
            }
          >
            Suivant
          </Button>
        </div>
      )}
    </>
  );
}
