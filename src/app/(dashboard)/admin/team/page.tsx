"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users2,
  GraduationCap,
  UserCog,
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  UserX,
  Mail,
  Clock,
  Wallet,
  RefreshCw,
  X,
} from "lucide-react";

interface Collaborator {
  id: string;
  userId: string;
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    image?: string;
    phone?: string;
  };
  status: string;
  createdAt: string;
}

interface Mentor extends Collaborator {
  specialties: string[];
  hourlyRate?: number;
  paymentType: string;
  executiveChef?: {
    id: string;
    name: string;
  };
  studentsCount: number;
}

interface Professor extends Collaborator {
  type: string;
  professorType?: string;
  hourlyRate?: number;
  studentsCount: number;
  eventsThisMonth: number;
}

interface ExecutiveChef extends Collaborator {
  mentorsCount: number;
  totalStudentsSupervised: number;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  professorType?: string;
  status: string;
  expiresAt: string;
  invitedBy?: {
    name: string;
  };
  createdAt: string;
}

interface Summary {
  totalMentors: number;
  totalProfessors: number;
  totalExecutiveChefs: number;
  totalCollaborators: number;
  estimatedPayroll: number;
}

export default function TeamPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("mentors");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [executiveChefs, setExecutiveChefs] = useState<ExecutiveChef[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);

  const fetchTeamData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch all team data
      const [teamRes, invitationsRes] = await Promise.all([
        fetch("/api/admin/team"),
        fetch("/api/admin/team/invitations?status=PENDING"),
      ]);

      if (teamRes.ok) {
        const teamData = await teamRes.json();
        setMentors(teamData.mentors || []);
        setProfessors(teamData.professors || []);
        setExecutiveChefs(teamData.executiveChefs || []);
        setSummary(teamData.summary || null);
      }

      if (invitationsRes.ok) {
        const invitationsData = await invitationsRes.json();
        setInvitations(invitationsData.invitations || []);
      }
    } catch (error) {
      console.error("Error fetching team data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  const handleDeactivate = async (
    type: "mentor" | "professor" | "executive-chef",
    id: string
  ) => {
    if (!confirm("Etes-vous sur de vouloir desactiver ce collaborateur ?")) {
      return;
    }

    try {
      const endpoint =
        type === "mentor"
          ? `/api/admin/team/mentors/${id}`
          : type === "professor"
            ? `/api/admin/team/professors/${id}`
            : `/api/admin/team/executive-chefs/${id}`;

      const res = await fetch(endpoint, { method: "DELETE" });
      if (res.ok) {
        fetchTeamData();
      }
    } catch (error) {
      console.error("Error deactivating:", error);
    }
  };

  const handleCancelInvitation = async (id: string) => {
    if (!confirm("Etes-vous sur de vouloir annuler cette invitation ?")) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/team/invitations/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchTeamData();
      }
    } catch (error) {
      console.error("Error cancelling invitation:", error);
    }
  };

  const handleResendInvitation = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/team/invitations/${id}`, {
        method: "POST",
      });
      if (res.ok) {
        alert("Invitation renvoyee avec succes");
      }
    } catch (error) {
      console.error("Error resending invitation:", error);
    }
  };

  const handleStartImpersonation = async (userId: string) => {
    try {
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: userId }),
      });

      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (error) {
      console.error("Error starting impersonation:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge variant="default">Actif</Badge>;
      case "INACTIVE":
        return <Badge variant="secondary">Inactif</Badge>;
      case "PENDING":
        return <Badge variant="outline">En attente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filterBySearch = <T extends Collaborator>(items: T[]): T[] => {
    if (!searchQuery) return items;
    const query = searchQuery.toLowerCase();
    return items.filter((item) => {
      const name = item.user.firstName && item.user.lastName
        ? `${item.user.firstName} ${item.user.lastName}`
        : item.user.name || "";
      return (
        name.toLowerCase().includes(query) ||
        item.user.email.toLowerCase().includes(query)
      );
    });
  };

  const filterByStatus = <T extends Collaborator>(items: T[]): T[] => {
    if (statusFilter === "all") return items;
    return items.filter((item) => item.status === statusFilter);
  };

  const filteredMentors = filterByStatus(filterBySearch(mentors));
  const filteredProfessors = filterByStatus(filterBySearch(professors));
  const filteredExecutiveChefs = filterByStatus(filterBySearch(executiveChefs));

  const getUserName = (user: { firstName?: string; lastName?: string; name?: string }) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.name || "N/A";
  };

  return (
    <>
      <PageHeader
        title="Equipe"
        description="Gerez vos mentors, professeurs et chefs executifs"
        breadcrumbs={[{ label: "Admin" }, { label: "Equipe" }]}
        actions={
          <Button onClick={() => router.push("/admin/team/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau collaborateur
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mentors</CardTitle>
            <Users2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalMentors || 0}</div>
            <p className="text-xs text-muted-foreground">actifs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Professeurs</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalProfessors || 0}</div>
            <p className="text-xs text-muted-foreground">actifs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chefs Executifs</CardTitle>
            <UserCog className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalExecutiveChefs || 0}</div>
            <p className="text-xs text-muted-foreground">actifs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Masse salariale</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.estimatedPayroll
                ? `${(summary.estimatedPayroll / 100).toLocaleString("fr-FR")} EUR`
                : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">taux horaires totaux</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="ACTIVE">Actifs</SelectItem>
            <SelectItem value="INACTIVE">Inactifs</SelectItem>
            <SelectItem value="PENDING">En attente</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={fetchTeamData}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="mentors">
            Mentors ({filteredMentors.length})
          </TabsTrigger>
          <TabsTrigger value="professors">
            Professeurs ({filteredProfessors.length})
          </TabsTrigger>
          <TabsTrigger value="executive-chefs">
            Chefs Executifs ({filteredExecutiveChefs.length})
          </TabsTrigger>
          <TabsTrigger value="invitations">
            Invitations ({invitations.length})
          </TabsTrigger>
        </TabsList>

        {/* Mentors Tab */}
        <TabsContent value="mentors" className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Chargement...
            </div>
          ) : filteredMentors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun mentor trouve
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredMentors.map((mentor) => (
                <Card key={mentor.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {getUserName(mentor.user)}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {mentor.user.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(mentor.status)}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(`/admin/team/mentors/${mentor.id}`)
                              }
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Voir le profil
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleStartImpersonation(mentor.userId)
                              }
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Voir son espace
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() =>
                                handleDeactivate("mentor", mentor.id)
                              }
                              className="text-destructive"
                            >
                              <UserX className="mr-2 h-4 w-4" />
                              Desactiver
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {mentor.executiveChef && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Chef: </span>
                        {mentor.executiveChef.name}
                      </div>
                    )}
                    <div className="flex gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Users2 className="h-4 w-4 text-muted-foreground" />
                        {mentor.studentsCount} etudiants
                      </div>
                      {mentor.hourlyRate && (
                        <div className="flex items-center gap-1">
                          <Wallet className="h-4 w-4 text-muted-foreground" />
                          {(mentor.hourlyRate / 100).toFixed(0)} EUR/h
                        </div>
                      )}
                    </div>
                    {mentor.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {mentor.specialties.slice(0, 3).map((s, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Professors Tab */}
        <TabsContent value="professors" className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Chargement...
            </div>
          ) : filteredProfessors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun professeur trouve
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredProfessors.map((professor) => (
                <Card key={professor.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {getUserName(professor.user)}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {professor.user.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            professor.type === "QUANT" ? "default" : "secondary"
                          }
                        >
                          {professor.type}
                        </Badge>
                        {getStatusBadge(professor.status)}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(
                                  `/admin/team/professors/${professor.id}`
                                )
                              }
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Voir le profil
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleStartImpersonation(professor.userId)
                              }
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Voir son espace
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() =>
                                handleDeactivate("professor", professor.id)
                              }
                              className="text-destructive"
                            >
                              <UserX className="mr-2 h-4 w-4" />
                              Desactiver
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Users2 className="h-4 w-4 text-muted-foreground" />
                        {professor.studentsCount} etudiants
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {professor.eventsThisMonth} cours ce mois
                      </div>
                    </div>
                    {professor.hourlyRate && (
                      <div className="flex items-center gap-1 text-sm">
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                        {(professor.hourlyRate / 100).toFixed(0)} EUR/h
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Executive Chefs Tab */}
        <TabsContent value="executive-chefs" className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Chargement...
            </div>
          ) : filteredExecutiveChefs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun chef executif trouve
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredExecutiveChefs.map((chef) => (
                <Card key={chef.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {getUserName(chef.user)}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {chef.user.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(chef.status)}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(
                                  `/admin/team/executive-chefs/${chef.id}`
                                )
                              }
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Voir le profil
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleStartImpersonation(chef.userId)
                              }
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Voir son espace
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() =>
                                handleDeactivate("executive-chef", chef.id)
                              }
                              className="text-destructive"
                            >
                              <UserX className="mr-2 h-4 w-4" />
                              Desactiver
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Users2 className="h-4 w-4 text-muted-foreground" />
                        {chef.mentorsCount} mentors
                      </div>
                      <div className="flex items-center gap-1">
                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                        {chef.totalStudentsSupervised} etudiants supervises
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Invitations Tab */}
        <TabsContent value="invitations" className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Chargement...
            </div>
          ) : invitations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucune invitation en attente
            </div>
          ) : (
            <div className="space-y-4">
              {invitations.map((invitation) => (
                <Card key={invitation.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{invitation.email}</span>
                        <Badge variant="outline">
                          {invitation.role === "PROFESSOR"
                            ? `Professeur ${invitation.professorType}`
                            : invitation.role === "MENTOR"
                              ? "Mentor"
                              : "Chef Executif"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Invitee par {invitation.invitedBy?.name || "N/A"} - Expire
                        le {new Date(invitation.expiresAt).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResendInvitation(invitation.id)}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Renvoyer
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelInvitation(invitation.id)}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Annuler
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
