"use client";

import { useState } from "react";
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
} from "lucide-react";
import Link from "next/link";

// Mock data for students
const studentsData = [
  {
    id: "1",
    name: "Marie Dupont",
    email: "marie.dupont@email.com",
    phone: "+33 6 12 34 56 78",
    status: "EN_COURS",
    mentor: "Sophie Martin",
    pack: "Elite Prep",
    progress: 72,
    schools: ["HEC Paris", "ESSEC", "ESCP"],
    startDate: new Date("2024-09-01"),
    lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000),
    totalPaid: 450000,
    totalDue: 800000,
  },
  {
    id: "2",
    name: "Thomas Bernard",
    email: "thomas.bernard@email.com",
    phone: "+33 6 98 76 54 32",
    status: "EN_DEMARRAGE",
    mentor: "Jean Lefèvre",
    pack: "Premium Access",
    progress: 15,
    schools: ["INSEAD", "LBS"],
    startDate: new Date("2024-11-15"),
    lastActivity: new Date(Date.now() - 24 * 60 * 60 * 1000),
    totalPaid: 200000,
    totalDue: 650000,
  },
  {
    id: "3",
    name: "Julie Chen",
    email: "julie.chen@email.com",
    phone: "+33 6 11 22 33 44",
    status: "FINALISE",
    mentor: "Sophie Martin",
    pack: "Elite Prep + Oral Mastery",
    progress: 100,
    schools: ["HEC Paris", "ESCP", "IE Madrid"],
    startDate: new Date("2024-03-01"),
    lastActivity: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    totalPaid: 950000,
    totalDue: 950000,
  },
  {
    id: "4",
    name: "Alexandre Petit",
    email: "alexandre.petit@email.com",
    phone: "+33 6 55 66 77 88",
    status: "EN_COURS",
    mentor: "Jean Lefèvre",
    pack: "Elite Prep",
    progress: 45,
    schools: ["ESSEC", "EDHEC", "emlyon"],
    startDate: new Date("2024-08-01"),
    lastActivity: new Date(Date.now() - 30 * 60 * 1000),
    totalPaid: 400000,
    totalDue: 800000,
  },
  {
    id: "5",
    name: "Emma Rousseau",
    email: "emma.rousseau@email.com",
    phone: "+33 6 99 88 77 66",
    status: "SUSPENDU",
    mentor: "Sophie Martin",
    pack: "Premium Access",
    progress: 32,
    schools: ["HEC Paris"],
    startDate: new Date("2024-07-01"),
    lastActivity: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    totalPaid: 200000,
    totalDue: 650000,
  },
];

type ViewMode = "grid" | "list";

export default function StudentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [mentorFilter, setMentorFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Filter students
  const filteredStudents = studentsData.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || student.status === statusFilter;
    const matchesMentor = mentorFilter === "all" || student.mentor === mentorFilter;
    return matchesSearch && matchesStatus && matchesMentor;
  });

  const mentors = Array.from(new Set(studentsData.map((s) => s.mentor)));

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
            <div className="text-2xl font-bold font-display text-performup-blue">
              {studentsData.length}
            </div>
            <p className="text-sm text-muted-foreground">Total étudiants</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold font-display text-success">
              {studentsData.filter((s) => s.status === "EN_COURS").length}
            </div>
            <p className="text-sm text-muted-foreground">En cours</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold font-display text-performup-gold">
              {studentsData.filter((s) => s.status === "FINALISE").length}
            </div>
            <p className="text-sm text-muted-foreground">Finalisés</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold font-display">
              {formatCurrency(studentsData.reduce((acc, s) => acc + s.totalPaid, 0))}
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
                <SelectItem key={mentor} value={mentor}>
                  {mentor}
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

      {/* Students grid/list */}
      {viewMode === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredStudents.map((student) => {
            const statusInfo = STUDENT_STATUS_DISPLAY[student.status];
            return (
              <Card key={student.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <UserAvatar name={student.name} size="lg" />
                      <div>
                        <Link
                          href={`/students/${student.id}`}
                          className="font-medium hover:text-performup-blue transition-colors"
                        >
                          {student.name}
                        </Link>
                        <p className="text-sm text-muted-foreground">{student.email}</p>
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
                      <Badge variant={statusInfo.variant as "success" | "warning" | "error" | "secondary"}>
                        {statusInfo.label}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{student.pack}</span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Progression</span>
                      </div>
                      <Progress value={student.progress} showEncouragement={false} size="sm" />
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {student.schools.slice(0, 3).map((school) => (
                        <Badge key={school} variant="outline" className="text-xs">
                          {school}
                        </Badge>
                      ))}
                      {student.schools.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{student.schools.length - 3}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-sm pt-2 border-t">
                      <span className="text-muted-foreground">Mentor: {student.mentor}</span>
                      <span className="text-muted-foreground">
                        {formatCurrency(student.totalPaid)} / {formatCurrency(student.totalDue)}
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
                  {filteredStudents.map((student) => {
                    const statusInfo = STUDENT_STATUS_DISPLAY[student.status];
                    return (
                      <tr key={student.id} className="border-b hover:bg-muted/30">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <UserAvatar name={student.name} size="sm" />
                            <div>
                              <Link
                                href={`/students/${student.id}`}
                                className="font-medium hover:text-performup-blue transition-colors"
                              >
                                {student.name}
                              </Link>
                              <p className="text-sm text-muted-foreground">{student.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant={statusInfo.variant as "success" | "warning" | "error" | "secondary"}>
                            {statusInfo.label}
                          </Badge>
                        </td>
                        <td className="p-4 text-sm">{student.pack}</td>
                        <td className="p-4 text-sm">{student.mentor}</td>
                        <td className="p-4 w-40">
                          <Progress value={student.progress} showEncouragement={false} size="sm" />
                        </td>
                        <td className="p-4 text-sm">
                          {formatCurrency(student.totalPaid)} / {formatCurrency(student.totalDue)}
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

      {filteredStudents.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Aucun étudiant trouvé</p>
        </div>
      )}
    </>
  );
}

