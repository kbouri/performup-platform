"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { formatRelativeTime, TASK_CATEGORY_DISPLAY } from "@/lib/utils";
import {
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Circle,
  Loader2,
  Calendar,
  User,
  AlertCircle,
  Clock,
} from "lucide-react";

interface TaskData {
  id: string;
  title: string;
  description: string | null;
  timing: string;
  dueDate: string;
  category: string;
  completed: boolean;
  completedAt: string | null;
  isRecurring: boolean;
  student: {
    id: string;
    name: string | null;
    email: string;
  };
  calendarEvent: {
    id: string;
    title: string;
    startTime: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface Student {
  id: string;
  name: string | null;
  email: string;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [completedFilter, setCompletedFilter] = useState("all");
  const [newTaskDialogOpen, setNewTaskDialogOpen] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [creating, setCreating] = useState(false);

  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    dueDate: "",
    category: "GENERAL",
    studentId: "",
  });

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (completedFilter !== "all") params.set("completed", completedFilter);

      const response = await fetch(`/api/tasks?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, completedFilter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Fetch students for new task form
  useEffect(() => {
    async function fetchStudents() {
      try {
        const response = await fetch("/api/students?limit=100");
        if (response.ok) {
          const data = await response.json();
          setStudents(
            data.students?.map((s: { id: string; name: string | null; email: string }) => ({
              id: s.id,
              name: s.name,
              email: s.email,
            })) || []
          );
        }
      } catch (error) {
        console.error("Error fetching students:", error);
      }
    }
    fetchStudents();
  }, []);

  const handleToggleComplete = async (taskId: string, completed: boolean) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });

      if (response.ok) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? { ...t, completed, completedAt: completed ? new Date().toISOString() : null }
              : t
          )
        );
      }
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const handleCreateTask = async () => {
    if (!newTask.title || !newTask.dueDate || !newTask.studentId) {
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTask),
      });

      if (response.ok) {
        setNewTaskDialogOpen(false);
        setNewTask({
          title: "",
          description: "",
          dueDate: "",
          category: "GENERAL",
          studentId: "",
        });
        fetchTasks();
      }
    } catch (error) {
      console.error("Error creating task:", error);
    } finally {
      setCreating(false);
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      !searchQuery ||
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.student.name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Group tasks by status
  const overdueTasks = filteredTasks.filter(
    (t) => !t.completed && new Date(t.dueDate) < new Date()
  );
  const todayTasks = filteredTasks.filter((t) => {
    const dueDate = new Date(t.dueDate);
    const today = new Date();
    return (
      !t.completed &&
      dueDate >= today &&
      dueDate.toDateString() === today.toDateString()
    );
  });
  const upcomingTasks = filteredTasks.filter((t) => {
    const dueDate = new Date(t.dueDate);
    const today = new Date();
    return !t.completed && dueDate > today && dueDate.toDateString() !== today.toDateString();
  });
  const completedTasks = filteredTasks.filter((t) => t.completed);

  // Stats
  const stats = {
    total: tasks.length,
    completed: completedTasks.length,
    pending: tasks.filter((t) => !t.completed).length,
    overdue: overdueTasks.length,
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "QUANT":
        return "bg-calendar-quant/10 text-calendar-quant";
      case "VERBAL":
        return "bg-calendar-verbal/10 text-calendar-verbal";
      case "ESSAY":
        return "bg-performup-blue/10 text-performup-blue";
      case "CV":
        return "bg-performup-gold/10 text-performup-gold";
      case "ORAL":
        return "bg-calendar-oral/10 text-calendar-oral";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const renderTaskList = (taskList: TaskData[], title: string, icon: React.ReactNode) => {
    if (taskList.length === 0) return null;

    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            {icon}
            {title}
            <Badge variant="secondary">{taskList.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
                {taskList.map((task) => {
                  const categoryLabel = TASK_CATEGORY_DISPLAY[task.category] || task.category;
                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        checked={task.completed}
                        onCheckedChange={(checked) =>
                          handleToggleComplete(task.id, checked as boolean)
                        }
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-medium ${
                              task.completed ? "line-through text-muted-foreground" : ""
                            }`}
                          >
                            {task.title}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-xs ${getCategoryColor(task.category)}`}
                          >
                            {categoryLabel}
                          </Badge>
                        </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {task.student.name || task.student.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatRelativeTime(new Date(task.dueDate))}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <PageHeader
        title="Tâches"
        description="Gérez les tâches et exercices"
        breadcrumbs={[{ label: "Tâches" }]}
        actions={
          <Button onClick={() => setNewTaskDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle tâche
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold font-display text-performup-blue">
              {stats.total}
            </div>
            <p className="text-sm text-muted-foreground">Total tâches</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold font-display text-warning">
              {stats.pending}
            </div>
            <p className="text-sm text-muted-foreground">En attente</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold font-display text-error">
              {stats.overdue}
            </div>
            <p className="text-sm text-muted-foreground">En retard</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold font-display text-success">
              {stats.completed}
            </div>
            <p className="text-sm text-muted-foreground">Terminées</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher une tâche..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="QUANT">Quant</SelectItem>
            <SelectItem value="VERBAL">Verbal</SelectItem>
            <SelectItem value="ESSAY">Essay</SelectItem>
            <SelectItem value="CV">CV</SelectItem>
            <SelectItem value="ORAL">Oral</SelectItem>
            <SelectItem value="GENERAL">Général</SelectItem>
          </SelectContent>
        </Select>

        <Select value={completedFilter} onValueChange={setCompletedFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="false">En attente</SelectItem>
            <SelectItem value="true">Terminées</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Task lists */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-performup-blue" />
        </div>
      ) : filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Aucune tâche trouvée</p>
            <Button onClick={() => setNewTaskDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Créer une tâche
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {renderTaskList(
            overdueTasks,
            "En retard",
            <AlertCircle className="h-4 w-4 text-error" />
          )}
          {renderTaskList(
            todayTasks,
            "Aujourd'hui",
            <Calendar className="h-4 w-4 text-warning" />
          )}
          {renderTaskList(
            upcomingTasks,
            "À venir",
            <Circle className="h-4 w-4 text-muted-foreground" />
          )}
          {renderTaskList(
            completedTasks,
            "Terminées",
            <CheckCircle2 className="h-4 w-4 text-success" />
          )}
        </div>
      )}

      {/* New Task Dialog */}
      <Dialog open={newTaskDialogOpen} onOpenChange={setNewTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle tâche</DialogTitle>
            <DialogDescription>
              Créez une nouvelle tâche pour un étudiant
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titre *</Label>
              <Input
                id="title"
                value={newTask.title}
                onChange={(e) =>
                  setNewTask((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Ex: Exercices Quant Chapitre 5"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={newTask.description}
                onChange={(e) =>
                  setNewTask((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Instructions détaillées..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dueDate">Date limite *</Label>
                <Input
                  id="dueDate"
                  type="datetime-local"
                  value={newTask.dueDate}
                  onChange={(e) =>
                    setNewTask((prev) => ({ ...prev, dueDate: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Catégorie *</Label>
                <Select
                  value={newTask.category}
                  onValueChange={(value) =>
                    setNewTask((prev) => ({ ...prev, category: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="QUANT">Quant</SelectItem>
                    <SelectItem value="VERBAL">Verbal</SelectItem>
                    <SelectItem value="ESSAY">Essay</SelectItem>
                    <SelectItem value="CV">CV</SelectItem>
                    <SelectItem value="ORAL">Oral</SelectItem>
                    <SelectItem value="GENERAL">Général</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="student">Étudiant *</Label>
              <Select
                value={newTask.studentId}
                onValueChange={(value) =>
                  setNewTask((prev) => ({ ...prev, studentId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un étudiant" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name || student.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewTaskDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleCreateTask}
              disabled={
                creating ||
                !newTask.title ||
                !newTask.dueDate ||
                !newTask.studentId
              }
            >
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

