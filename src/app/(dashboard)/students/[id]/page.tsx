"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  formatCurrency,
  formatDate,
  formatRelativeTime,
  STUDENT_STATUS_DISPLAY,
} from "@/lib/utils";
import {
  ArrowLeft,
  Calendar,
  FileText,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Briefcase,
  Target,
  CheckCircle2,
  Edit,
  MoreHorizontal,
  PenTool,
  BookOpen,
  MessageSquare,
  Building2,
  ExternalLink,
  Linkedin,
  Loader2,
  CreditCard,
  Users,
  UserX,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface StudentData {
  id: string;
  userId: string;
  status: string;
  startDate: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
  currentFormation: string | null;
  linkedinUrl: string | null;
  programType: string;
  internalNotes: string | null;
  progress: number;
  totalPaid: number;
  totalDue: number;
  user: {
    id: string;
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string;
    phone: string | null;
    image: string | null;
    active: boolean;
  };
  team: {
    mentor: {
      id: string;
      userId: string;
      name: string | null;
      email: string;
      image: string | null;
    } | null;
    professorQuant: {
      id: string;
      userId: string;
      name: string | null;
      email: string;
      image: string | null;
      type: string;
    } | null;
    professorVerbal: {
      id: string;
      userId: string;
      name: string | null;
      email: string;
      image: string | null;
      type: string;
    } | null;
  };
  packs: Array<{
    id: string;
    packId: string;
    customPrice: number;
    progressPercent: number;
    status: string;
    startDate: string | null;
    notes: string | null;
    pack: {
      displayName: string;
      price: number;
    };
  }>;
  schools: Array<{
    id: string;
    priority: number;
    status: string;
    notes: string | null;
    school: {
      id: string;
      name: string;
      country: string;
    };
    program: {
      id: string;
      name: string;
      type: string;
    } | null;
  }>;
  calendarEvents: Array<{
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    eventType: string;
    meetingUrl: string | null;
    instructor: {
      user: {
        name: string | null;
      };
    } | null;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    dueDate: string;
    category: string;
    completed: boolean;
  }>;
  essays: Array<{
    id: string;
    title: string;
    status: string;
    school: {
      name: string;
    };
    program: {
      name: string;
    } | null;
    updatedAt: string;
  }>;
  testScores: Array<{
    id: string;
    testType: string;
    scoreType: string;
    scoreQuant: number | null;
    scoreVerbal: number | null;
    totalScore: number | null;
    testDate: string;
  }>;
  academicExperiences: Array<{
    id: string;
    institution: string;
    degree: string;
    fieldOfStudy: string | null;
    startDate: string;
    endDate: string | null;
    current: boolean;
  }>;
  workExperiences: Array<{
    id: string;
    company: string;
    title: string;
    startDate: string;
    endDate: string | null;
    current: boolean;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    currency: string;
    paymentDate: string;
    paymentMethod: string;
    status: string;
    referenceNumber: string | null;
  }>;
  paymentSchedules: Array<{
    id: string;
    type: string;
    amount: number;
    currency: string;
    dueDate: string;
    status: string;
    paidAmount: number;
  }>;
}

interface MentorOption {
  id: string;
  name: string;
}

interface ProfessorOption {
  id: string;
  name: string;
  type: string;
}

interface Score {
  id: string;
  testType: string;
  scoreType: string;
  scoreQuant: number | null;
  scoreVerbal: number | null;
  scoreAWA: number | null;
  scoreIR: number | null;
  totalScore: number | null;
  testDate: string;
  notes: string | null;
}

interface PackOption {
  id: string;
  name: string;
  displayName: string;
  price: number;
}

interface SchoolOption {
  id: string;
  name: string;
  country: string;
  programs: ProgramOption[];
}

interface ProgramOption {
  id: string;
  name: string;
  type: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  category: string;
  dueDate: string;
  completed: boolean;
  timing: string;
  durationMinutes: number;
}

export default function StudentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [student, setStudent] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Packs state
  const [availablePacks, setAvailablePacks] = useState<PackOption[]>([]);
  const [addPackDialogOpen, setAddPackDialogOpen] = useState(false);
  const [editPackDialogOpen, setEditPackDialogOpen] = useState(false);
  const [currentPack, setCurrentPack] = useState<any>(null);
  const [packForm, setPackForm] = useState({
    packId: "",
    customPrice: "",
    progressPercent: "0",
    status: "active",
    startDate: new Date().toISOString().split('T')[0],
    notes: ""
  });
  const [managingPack, setManagingPack] = useState(false);

  // Schools state
  const [availableSchools, setAvailableSchools] = useState<SchoolOption[]>([]);
  const [addSchoolDialogOpen, setAddSchoolDialogOpen] = useState(false);
  const [editSchoolDialogOpen, setEditSchoolDialogOpen] = useState(false);
  const [currentApplication, setCurrentApplication] = useState<any>(null);
  const [schoolForm, setSchoolForm] = useState({
    schoolId: "",
    programId: "",
    priority: "1",
    status: "interested",
    notes: ""
  });
  const [managingSchool, setManagingSchool] = useState(false);

  // Scores state
  const [scores, setScores] = useState<Score[]>([]);
  const [addScoreDialogOpen, setAddScoreDialogOpen] = useState(false);
  const [editScoreDialogOpen, setEditScoreDialogOpen] = useState(false);
  const [currentScore, setCurrentScore] = useState<Score | null>(null);
  const [scoreForm, setScoreForm] = useState({
    testType: "GMAT",
    scoreType: "PRACTICE",
    scoreQuant: "",
    scoreVerbal: "",
    scoreAWA: "",
    scoreIR: "",
    totalScore: "",
    testDate: new Date().toISOString().split('T')[0],
    notes: ""
  });
  const [managingScore, setManagingScore] = useState(false);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    nationality: "",
    currentFormation: "",
    linkedinUrl: "",
    programType: "MASTER",
    status: "EN_DEMARRAGE",
    mentorId: "",
    professorQuantId: "",
    professorVerbalId: "",
    internalNotes: "",
  });

  // Team options
  const [mentors, setMentors] = useState<MentorOption[]>([]);
  const [professors, setProfessors] = useState<ProfessorOption[]>([]);

  // Deactivate dialog
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  useEffect(() => {
    async function fetchStudent() {
      if (!params.id) return;

      try {
        const response = await fetch(`/api/students/${params.id}`);
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Erreur lors du chargement");
        }
        const data = await response.json();
        setStudent(data.student);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      } finally {
        setLoading(false);
      }
    }

    fetchStudent();
  }, [params.id]);

  // Fetch scores
  useEffect(() => {
    async function fetchScores() {
      if (!params.id) return;
      try {
        const res = await fetch(`/api/students/${params.id}/scores`);
        if (res.ok) {
          const data = await res.json();
          setScores(data);
        }
      } catch (e) {
        console.error("Error fetching scores:", e);
      }
    }
    fetchScores();
  }, [params.id]);

  const handleAddScore = async () => {
    setManagingScore(true);
    try {
      const res = await fetch(`/api/students/${params.id}/scores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...scoreForm,
          scoreQuant: scoreForm.scoreQuant ? parseInt(scoreForm.scoreQuant) : null,
          scoreVerbal: scoreForm.scoreVerbal ? parseInt(scoreForm.scoreVerbal) : null,
          scoreAWA: scoreForm.scoreAWA ? parseFloat(scoreForm.scoreAWA) : null,
          scoreIR: scoreForm.scoreIR ? parseInt(scoreForm.scoreIR) : null,
          totalScore: scoreForm.totalScore ? parseInt(scoreForm.totalScore) : null,
        })
      });

      if (res.ok) {
        const newScore = await res.json();
        setScores([newScore, ...scores]);
        setAddScoreDialogOpen(false);
        setScoreForm({
          testType: "GMAT",
          scoreType: "PRACTICE",
          scoreQuant: "",
          scoreVerbal: "",
          scoreAWA: "",
          scoreIR: "",
          totalScore: "",
          testDate: new Date().toISOString().split('T')[0],
          notes: ""
        });
      }
    } catch (e) {
      console.error(e);
      alert("Erreur lors de l'ajout du score");
    } finally {
      setManagingScore(false);
    }
  };

  const handleEditScore = async () => {
    if (!currentScore) return;
    setManagingScore(true);
    try {
      const res = await fetch(`/api/students/${params.id}/scores/${currentScore.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...scoreForm,
          scoreQuant: scoreForm.scoreQuant ? parseInt(scoreForm.scoreQuant) : null,
          scoreVerbal: scoreForm.scoreVerbal ? parseInt(scoreForm.scoreVerbal) : null,
          scoreAWA: scoreForm.scoreAWA ? parseFloat(scoreForm.scoreAWA) : null,
          scoreIR: scoreForm.scoreIR ? parseInt(scoreForm.scoreIR) : null,
          totalScore: scoreForm.totalScore ? parseInt(scoreForm.totalScore) : null,
        })
      });

      if (res.ok) {
        const updatedScore = await res.json();
        setScores(scores.map(s => s.id === updatedScore.id ? updatedScore : s));
        setEditScoreDialogOpen(false);
        setCurrentScore(null);
      }
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la modification du score");
    } finally {
      setManagingScore(false);
    }
  };

  const handleDeleteScore = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce score ?")) return;
    try {
      const res = await fetch(`/api/students/${params.id}/scores/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setScores(scores.filter(s => s.id !== id));
      }
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la suppression");
    }
  };

  const openEditScoreDialog = (score: Score) => {
    setCurrentScore(score);
    setScoreForm({
      testType: score.testType,
      scoreType: score.scoreType,
      scoreQuant: score.scoreQuant?.toString() || "",
      scoreVerbal: score.scoreVerbal?.toString() || "",
      scoreAWA: score.scoreAWA?.toString() || "",
      scoreIR: score.scoreIR?.toString() || "",
      totalScore: score.totalScore?.toString() || "",
      testDate: new Date(score.testDate).toISOString().split('T')[0],
      notes: score.notes || ""
    });
    setEditScoreDialogOpen(true);
  };

  // Fetch mentors, professors, packs, and schools for forms
  useEffect(() => {
    async function fetchTeamOptions() {
      try {
        const [mentorsRes, professorsRes, packsRes, schoolsRes] = await Promise.all([
          fetch("/api/mentors"),
          fetch("/api/professors"),
          fetch("/api/packs"),
          fetch("/api/schools"),
        ]);

        if (mentorsRes.ok) {
          const data = await mentorsRes.json();
          setMentors(data.mentors || []);
        }

        if (professorsRes.ok) {
          const data = await professorsRes.json();
          setProfessors(data.professors || []);
        }

        if (packsRes.ok) {
          const data = await packsRes.json();
          setAvailablePacks(data.packs || []);
        }

        if (schoolsRes.ok) {
          const data = await schoolsRes.json();
          setAvailableSchools(data.schools || []);
        }
      } catch (error) {
        console.error("Error fetching options:", error);
      }
    }
    fetchTeamOptions();
  }, []);

  const handleAddPack = async () => {
    setManagingPack(true);
    try {
      const res = await fetch(`/api/students/${params.id}/packs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packId: packForm.packId,
          customPrice: parseInt(packForm.customPrice),
          status: packForm.status,
          startDate: packForm.startDate
        })
      });

      if (res.ok) {
        const newPack = await res.json();
        // Update student state locally
        if (student) {
          setStudent({
            ...student,
            packs: [...student.packs, newPack]
          });
        }
        setAddPackDialogOpen(false);
        setPackForm({
          packId: "",
          customPrice: "",
          progressPercent: "0",
          status: "active",
          startDate: new Date().toISOString().split('T')[0],
          notes: ""
        });
      } else {
        const data = await res.json();
        alert(data.error || "Erreur lors de l'ajout du pack");
      }
    } catch (e) {
      console.error(e);
      alert("Erreur lors de l'ajout du pack");
    } finally {
      setManagingPack(false);
    }
  };

  const handleEditPack = async () => {
    if (!currentPack) return;
    setManagingPack(true);
    try {
      const res = await fetch(`/api/students/${params.id}/packs/${currentPack.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customPrice: parseInt(packForm.customPrice),
          progressPercent: parseInt(packForm.progressPercent),
          status: packForm.status,
          startDate: packForm.startDate,
          notes: packForm.notes
        })
      });

      if (res.ok) {
        const updatedPack = await res.json();
        if (student) {
          setStudent({
            ...student,
            packs: student.packs.map(p => p.id === updatedPack.id ? updatedPack : p)
          });
        }
        setEditPackDialogOpen(false);
        setCurrentPack(null);
      }
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la modification");
    } finally {
      setManagingPack(false);
    }
  };

  const handleDeletePack = async (studentPackId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir retirer ce pack ?")) return;
    try {
      const res = await fetch(`/api/students/${params.id}/packs/${studentPackId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        if (student) {
          setStudent({
            ...student,
            packs: student.packs.filter(p => p.id !== studentPackId)
          });
        }
      }
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la suppression");
    }
  };

  const openEditPackDialog = (pack: any) => {
    setCurrentPack(pack);
    setPackForm({
      packId: pack.packId,
      customPrice: pack.customPrice.toString(),
      progressPercent: pack.progressPercent.toString(),
      status: pack.status,
      startDate: pack.startDate ? new Date(pack.startDate).toISOString().split('T')[0] : "",
      notes: pack.notes || ""
    });
    setEditPackDialogOpen(true);
  };

  // School Handlers
  const handleAddSchool = async () => {
    setManagingSchool(true);
    try {
      const res = await fetch(`/api/students/${params.id}/schools`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId: schoolForm.schoolId,
          programId: schoolForm.programId,
          priority: parseInt(schoolForm.priority),
          status: schoolForm.status
        })
      });

      if (res.ok) {
        const newApp = await res.json();
        if (student) {
          setStudent({
            ...student,
            schools: [...student.schools, newApp]
          });
        }
        setAddSchoolDialogOpen(false);
        setSchoolForm({
          schoolId: "",
          programId: "",
          priority: "1",
          status: "interested",
          notes: ""
        });
      } else {
        const data = await res.json();
        alert(data.error || "Erreur lors de l'ajout");
      }
    } catch (e) {
      console.error(e);
      alert("Erreur lors de l'ajout");
    } finally {
      setManagingSchool(false);
    }
  };

  const handleEditSchool = async () => {
    if (!currentApplication) return;
    setManagingSchool(true);
    try {
      const res = await fetch(`/api/students/${params.id}/schools/${currentApplication.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priority: parseInt(schoolForm.priority),
          status: schoolForm.status,
          notes: schoolForm.notes
        })
      });

      if (res.ok) {
        const updatedApp = await res.json();
        if (student) {
          setStudent({
            ...student,
            schools: student.schools.map(s => s.id === updatedApp.id ? updatedApp : s)
          });
        }
        setEditSchoolDialogOpen(false);
        setCurrentApplication(null);
      }
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la modification");
    } finally {
      setManagingSchool(false);
    }
  };

  const handleDeleteSchool = async (appId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette candidature ?")) return;
    try {
      const res = await fetch(`/api/students/${params.id}/schools/${appId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        if (student) {
          setStudent({
            ...student,
            schools: student.schools.filter(s => s.id !== appId)
          });
        }
      }
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la suppression");
    }
  };

  const openEditSchoolDialog = (app: any) => {
    setCurrentApplication(app);
    setSchoolForm({
      schoolId: app.schoolId,
      programId: app.programId,
      priority: app.priority.toString(),
      status: app.status,
      notes: app.notes || ""
    });
    setEditSchoolDialogOpen(true);
  };


  // Tasks state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [addTaskDialogOpen, setAddTaskDialogOpen] = useState(false);
  const [editTaskDialogOpen, setEditTaskDialogOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    category: "GENERAL",
    dueDate: new Date().toISOString().split('T')[0],
    durationMinutes: "60",
    timing: "STANDALONE"
  });
  const [managingTask, setManagingTask] = useState(false);

  // Task Handlers
  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/students/${params.id}/tasks`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (e) {
      console.error(e);
    }
  }, [params.id]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleAddTask = async () => {
    setManagingTask(true);
    try {
      const res = await fetch(`/api/students/${params.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...taskForm,
          durationMinutes: parseInt(taskForm.durationMinutes)
        })
      });

      if (res.ok) {
        fetchTasks();
        setAddTaskDialogOpen(false);
        setTaskForm({
          title: "",
          description: "",
          category: "GENERAL",
          dueDate: new Date().toISOString().split('T')[0],
          durationMinutes: "60",
          timing: "STANDALONE"
        });
      }
    } catch (e) {
      console.error(e);
      alert("Erreur lors de l'ajout");
    } finally {
      setManagingTask(false);
    }
  };

  const handleEditTask = async () => {
    if (!currentTask) return;
    setManagingTask(true);
    try {
      const res = await fetch(`/api/students/${params.id}/tasks/${currentTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...taskForm,
          durationMinutes: parseInt(taskForm.durationMinutes)
        })
      });

      if (res.ok) {
        fetchTasks();
        setEditTaskDialogOpen(false);
        setCurrentTask(null);
      }
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la modification");
    } finally {
      setManagingTask(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Êtes-vous sûr ?")) return;
    try {
      const res = await fetch(`/api/students/${params.id}/tasks/${taskId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setTasks(tasks.filter(t => t.id !== taskId));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    try {
      // Optimistic update
      setTasks(tasks.map(t => t.id === taskId ? { ...t, completed } : t));

      await fetch(`/api/students/${params.id}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed })
      });
    } catch (e) {
      console.error(e);
      fetchTasks(); // Revert on error
    }
  };

  // Payment Schedule State
  const [addScheduleDialogOpen, setAddScheduleDialogOpen] = useState(false);
  const [editScheduleDialogOpen, setEditScheduleDialogOpen] = useState(false);
  const [currentSchedule, setCurrentSchedule] = useState<any>(null);
  const [scheduleForm, setScheduleForm] = useState({
    type: "STUDENT_PAYMENT",
    amount: "",
    dueDate: new Date().toISOString().split('T')[0],
    status: "PENDING",
    currency: "EUR"
  });
  const [managingSchedule, setManagingSchedule] = useState(false);

  // Payment Schedule Handlers
  const handleAddSchedule = async () => {
    setManagingSchedule(true);
    try {
      const res = await fetch(`/api/students/${params.id}/payment-schedules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...scheduleForm,
          amount: parseFloat(scheduleForm.amount) * 100 // Convert to cents
        })
      });

      if (res.ok) {
        const newSchedule = await res.json();
        if (student) {
          setStudent({
            ...student,
            paymentSchedules: [...student.paymentSchedules, newSchedule].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
          });
        }
        setAddScheduleDialogOpen(false);
        setScheduleForm({
          type: "STUDENT_PAYMENT",
          amount: "",
          dueDate: new Date().toISOString().split('T')[0],
          status: "PENDING",
          currency: "EUR"
        });
      }
    } catch (e) {
      console.error(e);
      alert("Erreur lors de l'ajout");
    } finally {
      setManagingSchedule(false);
    }
  };

  const handleEditSchedule = async () => {
    if (!currentSchedule) return;
    setManagingSchedule(true);
    try {
      const res = await fetch(`/api/students/${params.id}/payment-schedules/${currentSchedule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...scheduleForm,
          amount: parseFloat(scheduleForm.amount) * 100 // Convert to cents
        })
      });

      if (res.ok) {
        const updated = await res.json();
        if (student) {
          setStudent({
            ...student,
            paymentSchedules: student.paymentSchedules.map(s => s.id === updated.id ? updated : s).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
          });
        }
        setEditScheduleDialogOpen(false);
        setCurrentSchedule(null);
      }
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la modification");
    } finally {
      setManagingSchedule(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm("Êtes-vous sûr ?")) return;
    try {
      const res = await fetch(`/api/students/${params.id}/payment-schedules/${scheduleId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        if (student) {
          setStudent({
            ...student,
            paymentSchedules: student.paymentSchedules.filter(s => s.id !== scheduleId)
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openEditScheduleDialog = (schedule: any) => {
    setCurrentSchedule(schedule);
    setScheduleForm({
      type: schedule.type,
      amount: (schedule.amount / 100).toString(),
      dueDate: new Date(schedule.dueDate).toISOString().split('T')[0],
      status: schedule.status,
      currency: schedule.currency
    });
    setEditScheduleDialogOpen(true);
  };

  // Essay State
  const [addEssayDialogOpen, setAddEssayDialogOpen] = useState(false);
  const [editEssayDialogOpen, setEditEssayDialogOpen] = useState(false);
  const [currentEssay, setCurrentEssay] = useState<any>(null);
  const [essayForm, setEssayForm] = useState({
    title: "",
    schoolId: "",
    programId: "",
    status: "draft",
    content: ""
  });
  const [managingEssay, setManagingEssay] = useState(false);

  // Essay Handlers
  const handleAddEssay = async () => {
    setManagingEssay(true);
    try {
      const res = await fetch(`/api/students/${params.id}/essays`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(essayForm)
      });

      if (res.ok) {
        const newEssay = await res.json();
        if (student) {
          setStudent({
            ...student,
            essays: [newEssay, ...student.essays]
          });
        }
        setAddEssayDialogOpen(false);
        setEssayForm({
          title: "",
          schoolId: "",
          programId: "",
          status: "draft",
          content: ""
        });
      }
    } catch (e) {
      console.error(e);
      alert("Erreur lors de l'ajout");
    } finally {
      setManagingEssay(false);
    }
  };

  const handleEditEssay = async () => {
    if (!currentEssay) return;
    setManagingEssay(true);
    try {
      const res = await fetch(`/api/students/${params.id}/essays/${currentEssay.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(essayForm)
      });

      if (res.ok) {
        const updated = await res.json();
        if (student) {
          setStudent({
            ...student,
            essays: student.essays.map(e => e.id === updated.id ? updated : e)
          });
        }
        setEditEssayDialogOpen(false);
        setCurrentEssay(null);
      }
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la modification");
    } finally {
      setManagingEssay(false);
    }
  };

  const handleDeleteEssay = async (essayId: string) => {
    if (!confirm("Êtes-vous sûr ?")) return;
    try {
      const res = await fetch(`/api/students/${params.id}/essays/${essayId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        if (student) {
          setStudent({
            ...student,
            essays: student.essays.filter(e => e.id !== essayId)
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openEditEssayDialog = (essay: any) => {
    setCurrentEssay(essay);
    setEssayForm({
      title: essay.title,
      schoolId: essay.schoolId,
      programId: essay.programId || "",
      status: essay.status,
      content: essay.content || ""
    });
    setEditEssayDialogOpen(true);
  };

  const openEditTaskDialog = (task: Task) => {
    setCurrentTask(task);
    setTaskForm({
      title: task.title,
      description: task.description || "",
      category: task.category,
      dueDate: new Date(task.dueDate).toISOString().split('T')[0],
      durationMinutes: task.durationMinutes.toString(),
      timing: task.timing
    });
    setEditTaskDialogOpen(true);
  };

  // Initialize edit form when student data is loaded
  useEffect(() => {
    if (student) {
      setEditForm({
        firstName: student.user.firstName || "",
        lastName: student.user.lastName || "",
        phone: student.user.phone || "",
        nationality: student.nationality || "",
        currentFormation: student.currentFormation || "",
        linkedinUrl: student.linkedinUrl || "",
        programType: student.programType || "MASTER",
        status: student.status || "EN_DEMARRAGE",
        mentorId: student.team.mentor?.id || "",
        professorQuantId: student.team.professorQuant?.id || "",
        professorVerbalId: student.team.professorVerbal?.id || "",
        internalNotes: student.internalNotes || "",
      });
    }
  }, [student]);

  // Handle save student
  const handleSaveStudent = async () => {
    if (!student) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/students/${student.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personalInfo: {
            firstName: editForm.firstName,
            lastName: editForm.lastName,
            phone: editForm.phone,
            nationality: editForm.nationality,
            currentFormation: editForm.currentFormation,
            linkedinUrl: editForm.linkedinUrl,
            programType: editForm.programType,
          },
          team: {
            mentorId: editForm.mentorId || null,
            professorQuantId: editForm.professorQuantId || null,
            professorVerbalId: editForm.professorVerbalId || null,
          },
          status: editForm.status,
          internalNotes: editForm.internalNotes,
        }),
      });

      if (response.ok) {
        // Refresh student data
        const refreshRes = await fetch(`/api/students/${student.id}`);
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          setStudent(data.student);
        }
        setEditDialogOpen(false);
      } else {
        const data = await response.json();
        alert(data.error || "Erreur lors de la sauvegarde");
      }
    } catch (error) {
      console.error("Error saving student:", error);
      alert("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  // Handle deactivate student
  const handleDeactivateStudent = async () => {
    if (!student) return;

    setDeactivating(true);
    try {
      const response = await fetch(`/api/students/${student.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.push("/students");
      } else {
        const data = await response.json();
        alert(data.error || "Erreur lors de la désactivation");
      }
    } catch (error) {
      console.error("Error deactivating student:", error);
      alert("Erreur lors de la désactivation");
    } finally {
      setDeactivating(false);
      setDeactivateDialogOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-performup-blue"></div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-error mb-4">{error || "Étudiant non trouvé"}</p>
        <Button asChild variant="outline">
          <Link href="/students">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux étudiants
          </Link>
        </Button>
      </div>
    );
  }

  const statusInfo = STUDENT_STATUS_DISPLAY[student.status] || {
    label: student.status,
    variant: "secondary",
  };

  return (
    <>
      <PageHeader
        title={student.user.name || student.user.email}
        description={student.currentFormation || "Étudiant PerformUp"}
        breadcrumbs={[
          { label: "Étudiants", href: "/students" },
          { label: student.user.name || "Détail" },
        ]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/planning?studentId=${student.id}`}>
                <Calendar className="mr-2 h-4 w-4" />
                Planning
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/documents?studentId=${student.id}`}>
                <FileText className="mr-2 h-4 w-4" />
                Documents
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Modifier le profil
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={`mailto:${student.user.email}`}>
                    <Mail className="mr-2 h-4 w-4" />
                    Envoyer un email
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-error"
                  onClick={() => setDeactivateDialogOpen(true)}
                >
                  <UserX className="mr-2 h-4 w-4" />
                  Désactiver
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Profile */}
        <div className="space-y-6">
          {/* Profile Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <UserAvatar
                  name={student.user.name || student.user.email}
                  size="xl"
                  className="mb-4"
                />
                <h2 className="text-xl font-display font-semibold">
                  {student.user.name}
                </h2>
                <p className="text-sm text-muted-foreground mb-3">
                  {student.user.email}
                </p>
                <Badge
                  variant={statusInfo.variant as "success" | "warning" | "error" | "secondary"}
                >
                  {statusInfo.label}
                </Badge>
              </div>

              <Separator className="my-6" />

              <div className="space-y-4">
                {student.user.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{student.user.phone}</span>
                  </div>
                )}
                {student.nationality && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{student.nationality}</span>
                  </div>
                )}
                {student.currentFormation && (
                  <div className="flex items-center gap-3">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{student.currentFormation}</span>
                  </div>
                )}
                {student.linkedinUrl && (
                  <div className="flex items-center gap-3">
                    <Linkedin className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={student.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-performup-blue hover:underline flex items-center gap-1"
                    >
                      LinkedIn <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
                {student.startDate && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Inscrit le {formatDate(new Date(student.startDate))}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Team Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Équipe</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {student.team.mentor && (
                <div className="flex items-center gap-3">
                  <UserAvatar name={student.team.mentor.name || "M"} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {student.team.mentor.name}
                    </p>
                    <p className="text-xs text-muted-foreground">Mentor</p>
                  </div>
                  <Button variant="ghost" size="icon-sm">
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {student.team.professorQuant && (
                <div className="flex items-center gap-3">
                  <UserAvatar
                    name={student.team.professorQuant.name || "PQ"}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {student.team.professorQuant.name}
                    </p>
                    <p className="text-xs text-muted-foreground">Prof Quant</p>
                  </div>
                  <Button variant="ghost" size="icon-sm">
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {student.team.professorVerbal && (
                <div className="flex items-center gap-3">
                  <UserAvatar
                    name={student.team.professorVerbal.name || "PV"}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {student.team.professorVerbal.name}
                    </p>
                    <p className="text-xs text-muted-foreground">Prof Verbal</p>
                  </div>
                  <Button variant="ghost" size="icon-sm">
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {!student.team.mentor &&
                !student.team.professorQuant &&
                !student.team.professorVerbal && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucune équipe assignée
                  </p>
                )}
            </CardContent>
          </Card>

          {/* Payment Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Paiements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total dû</span>
                  <span className="font-medium">
                    {formatCurrency(student.totalDue)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Payé</span>
                  <span className="font-medium text-success">
                    {formatCurrency(student.totalPaid)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Reste à payer</span>
                  <span className="font-medium text-warning">
                    {formatCurrency(student.totalDue - student.totalPaid)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Progression globale</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress
                value={student.progress}
                className="mb-4"
                showEncouragement
              />
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="text-2xl font-display font-semibold text-performup-blue">
                    {student.packs.length}
                  </div>
                  <p className="text-sm text-muted-foreground">Packs actifs</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="text-2xl font-display font-semibold text-performup-gold">
                    {student.schools.length}
                  </div>
                  <p className="text-sm text-muted-foreground">Écoles ciblées</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="text-2xl font-display font-semibold text-success">
                    {student.essays.filter((e) => e.status === "finalized").length}
                    /{student.essays.length}
                  </div>
                  <p className="text-sm text-muted-foreground">Essays finalisés</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs for detailed content */}
          <Tabs defaultValue="packs" className="space-y-4">
            <TabsList>
              <TabsTrigger value="packs">Packs</TabsTrigger>
              <TabsTrigger value="schools">Écoles</TabsTrigger>
              <TabsTrigger value="planning">Planning</TabsTrigger>
              <TabsTrigger value="essays">Essays</TabsTrigger>
              <TabsTrigger value="scores">Scores</TabsTrigger>
              <TabsTrigger value="payments">Paiements</TabsTrigger>
            </TabsList>

            <TabsContent value="packs" className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Packs souscrits</h3>
                <Button onClick={() => setAddPackDialogOpen(true)} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter un pack
                </Button>
              </div>

              {student.packs.length > 0 ? (
                student.packs.map((pack) => (
                  <Card key={pack.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-performup-blue/10">
                            <Briefcase className="h-5 w-5 text-performup-blue" />
                          </div>
                          <div>
                            <h3 className="font-medium">{pack.pack.displayName}</h3>
                            <p className="text-sm text-muted-foreground">
                              {formatCurrency(pack.customPrice)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              pack.status === "active"
                                ? "success"
                                : pack.status === "completed"
                                  ? "secondary"
                                  : "warning"
                            }
                          >
                            {pack.status === "active"
                              ? "Actif"
                              : pack.status === "completed"
                                ? "Terminé"
                                : "En pause"}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditPackDialog(pack)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Modifier
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-error"
                                onClick={() => handleDeletePack(pack.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Retirer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Progression</span>
                          <span>{pack.progressPercent}%</span>
                        </div>
                        <Progress
                          value={pack.progressPercent}
                          showEncouragement={false}
                          size="sm"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">Aucun pack assigné</p>
                    <Button onClick={() => setAddPackDialogOpen(true)} variant="outline">
                      Ajouter un pack
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="schools" className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Écoles visées</h3>
                <Button onClick={() => setAddSchoolDialogOpen(true)} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter une école
                </Button>
              </div>

              {student.schools.length > 0 ? (
                student.schools.map((school) => (
                  <Card key={school.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-performup-gold/10">
                            <Building2 className="h-5 w-5 text-performup-gold" />
                          </div>
                          <div>
                            <h3 className="font-medium">{school.school.name}</h3>
                            {school.program && (
                              <p className="text-sm text-muted-foreground">
                                {school.program.name} ({school.program.type})
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Priorité {school.priority}</Badge>
                          <Badge
                            variant={
                              school.status === "admitted"
                                ? "success"
                                : school.status === "rejected"
                                  ? "error"
                                  : "secondary"
                            }
                          >
                            {school.status === "interested" ? "Intéressé" :
                              school.status === "in_progress" ? "En cours" :
                                school.status === "submitted" ? "Soumis" :
                                  school.status === "interview" ? "Entretien" :
                                    school.status === "admitted" ? "Admis" :
                                      school.status === "rejected" ? "Refusé" : school.status}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditSchoolDialog(school)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Modifier
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-error"
                                onClick={() => handleDeleteSchool(school.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      {school.notes && (
                        <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm">
                          <p className="text-muted-foreground">{school.notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">Aucune école sélectionnée</p>
                    <Button onClick={() => setAddSchoolDialogOpen(true)} variant="outline">
                      Ajouter une école
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="tasks" className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Tâches à faire</h3>
                <Button onClick={() => setAddTaskDialogOpen(true)} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter une tâche
                </Button>
              </div>

              <div className="space-y-2">
                {tasks.filter(t => !t.completed).length === 0 && (
                  <p className="text-center text-muted-foreground py-8">Aucune tâche en cours.</p>
                )}
                {tasks.filter(t => !t.completed).map(task => (
                  <Card key={task.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={task.completed}
                          onCheckedChange={(checked) => handleToggleTask(task.id, checked as boolean)}
                        />
                        <div>
                          <p className="font-medium">{task.title}</p>
                          <div className="flex gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-[10px]">{task.category}</Badge>
                            <span>Pour le {new Date(task.dueDate).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditTaskDialog(task)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-error" onClick={() => handleDeleteTask(task.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {tasks.filter(t => t.completed).length > 0 && (
                <div className="mt-8">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Terminées récemment</h4>
                  <div className="space-y-2 opacity-60">
                    {tasks.filter(t => t.completed).slice(0, 5).map(task => (
                      <div key={task.id} className="flex items-center justify-between p-2 border rounded bg-muted/20">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={task.completed}
                            onCheckedChange={(checked) => handleToggleTask(task.id, checked as boolean)}
                          />
                          <span className="line-through text-sm">{task.title}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="planning" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Prochains événements</CardTitle>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/planning?studentId=${student.id}`}>
                        Voir tout
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {student.calendarEvents.length > 0 ? (
                    <div className="space-y-3">
                      {student.calendarEvents.slice(0, 5).map((event) => (
                        <div
                          key={event.id}
                          className="flex items-center gap-4 p-3 rounded-lg border"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-calendar-quant/10">
                            <BookOpen className="h-5 w-5 text-calendar-quant" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{event.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(new Date(event.startTime), {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                              {event.instructor && ` • ${event.instructor.user.name}`}
                            </p>
                          </div>
                          {event.meetingUrl && (
                            <Button variant="secondary" size="sm" asChild>
                              <a
                                href={event.meetingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Rejoindre
                              </a>
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        Aucun événement à venir
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Tâches à faire</CardTitle>
                    <Badge variant="secondary">{student.tasks.length}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {student.tasks.length > 0 ? (
                    <div className="space-y-2">
                      {student.tasks.slice(0, 5).map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                        >
                          <div
                            className={`h-2 w-2 rounded-full ${new Date(task.dueDate) < new Date()
                              ? "bg-error"
                              : "bg-muted-foreground"
                              }`}
                          />
                          <span className="flex-1 text-sm truncate">{task.title}</span>
                          <Badge variant="outline" className="text-xs">
                            {task.category}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <CheckCircle2 className="h-8 w-8 mx-auto text-success mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Toutes les tâches sont complétées !
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="essays" className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Essays</h3>
                <Button onClick={() => setAddEssayDialogOpen(true)} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter un essay
                </Button>
              </div>

              {student.essays.length > 0 ? (
                student.essays.map((essay) => (
                  <Card key={essay.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-performup-blue/10">
                            <PenTool className="h-5 w-5 text-performup-blue" />
                          </div>
                          <div>
                            <h3 className="font-medium">{essay.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {essay.school.name}
                              {essay.program && ` - ${essay.program.name}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(new Date(essay.updatedAt))}
                          </span>
                          <Badge
                            variant={
                              essay.status === "finalized"
                                ? "success"
                                : essay.status === "in_review"
                                  ? "warning"
                                  : "secondary"
                            }
                          >
                            {essay.status === "finalized"
                              ? "Finalisé"
                              : essay.status === "in_review"
                                ? "En révision"
                                : "Brouillon"}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditEssayDialog(essay)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Modifier
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-error" onClick={() => handleDeleteEssay(essay.id)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <PenTool className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Aucun essay créé</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="scores" className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Scores enregistrés</h3>
                <Button onClick={() => setAddScoreDialogOpen(true)} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter un score
                </Button>
              </div>

              {scores.length > 0 ? (
                scores.map((score) => (
                  <Card key={score.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div
                            className={`flex h-12 w-12 items-center justify-center rounded-lg ${score.testType === "GMAT" || score.testType === "GRE"
                              ? "bg-calendar-quant/10"
                              : "bg-calendar-verbal/10"
                              }`}
                          >
                            <Target
                              className={`h-6 w-6 ${score.testType === "GMAT" || score.testType === "GRE"
                                ? "text-calendar-quant"
                                : "text-calendar-verbal"
                                }`}
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              {score.totalScore && (
                                <h4 className="font-semibold text-lg">
                                  {score.totalScore}
                                </h4>
                              )}
                              <Badge variant="outline">{score.testType}</Badge>
                              <Badge variant="secondary">{score.scoreType}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(new Date(score.testDate))}
                            </p>
                            {score.notes && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {score.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditScoreDialog(score)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-error"
                              onClick={() => handleDeleteScore(score.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="grid grid-cols-4 gap-4">
                        {score.scoreQuant !== null && (
                          <div className="text-center p-2 rounded-lg bg-muted/50">
                            <span className="text-xs text-muted-foreground block mb-1">Quant</span>
                            <span className="font-semibold">{score.scoreQuant}</span>
                          </div>
                        )}
                        {score.scoreVerbal !== null && (
                          <div className="text-center p-2 rounded-lg bg-muted/50">
                            <span className="text-xs text-muted-foreground block mb-1">Verbal</span>
                            <span className="font-semibold">{score.scoreVerbal}</span>
                          </div>
                        )}
                        {score.scoreAWA !== null && (
                          <div className="text-center p-2 rounded-lg bg-muted/50">
                            <span className="text-xs text-muted-foreground block mb-1">AWA</span>
                            <span className="font-semibold">{score.scoreAWA}</span>
                          </div>
                        )}
                        {score.scoreIR !== null && (
                          <div className="text-center p-2 rounded-lg bg-muted/50">
                            <span className="text-xs text-muted-foreground block mb-1">IR</span>
                            <span className="font-semibold">{score.scoreIR}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">Aucun score enregistré</p>
                    <Button onClick={() => setAddScoreDialogOpen(true)} variant="outline">
                      Ajouter le premier score
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="payments" className="space-y-4">
              {/* Payment Schedules */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Échéancier de paiement</CardTitle>
                  <Button onClick={() => setAddScheduleDialogOpen(true)} variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" /> Ajouter
                  </Button>
                </CardHeader>
                <CardContent>
                  {student.paymentSchedules && student.paymentSchedules.length > 0 ? (
                    <div className="space-y-3">
                      {student.paymentSchedules.map((schedule) => (
                        <div
                          key={schedule.id}
                          className="flex items-center justify-between p-3 rounded-lg border"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${schedule.status === "PAID" ? "bg-success/10" :
                              schedule.status === "OVERDUE" ? "bg-error/10" : "bg-muted"
                              }`}>
                              <CreditCard className={`h-5 w-5 ${schedule.status === "PAID" ? "text-success" :
                                schedule.status === "OVERDUE" ? "text-error" : "text-muted-foreground"
                                }`} />
                            </div>
                            <div>
                              <p className="font-medium">{schedule.type === 'STUDENT_PAYMENT' ? 'Paiement Étudiant' : schedule.type}</p>
                              <p className="text-sm text-muted-foreground">
                                Échéance: {formatDate(new Date(schedule.dueDate))}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="font-medium">{formatCurrency(schedule.amount, schedule.currency)}</p>
                              <Badge
                                variant={
                                  schedule.status === "PAID"
                                    ? "success"
                                    : schedule.status === "OVERDUE"
                                      ? "error"
                                      : schedule.status === "PARTIAL"
                                        ? "warning"
                                        : "secondary"
                                }
                              >
                                {schedule.status === "PAID" ? "Payé" :
                                  schedule.status === "OVERDUE" ? "En retard" :
                                    schedule.status === "PARTIAL" ? `Partiel (${formatCurrency(schedule.paidAmount, schedule.currency)})` :
                                      "En attente"}
                              </Badge>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon-sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditScheduleDialog(schedule)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Modifier
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-error" onClick={() => handleDeleteSchedule(schedule.id)}>
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Aucun échéancier défini</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment History */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Historique des paiements</CardTitle>
                </CardHeader>
                <CardContent>
                  {student.payments && student.payments.length > 0 ? (
                    <div className="space-y-3">
                      {student.payments.map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between p-3 rounded-lg border"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                              <CheckCircle2 className="h-5 w-5 text-success" />
                            </div>
                            <div>
                              <p className="font-medium">
                                {payment.paymentMethod === "BANK_TRANSFER" ? "Virement" :
                                  payment.paymentMethod === "CARD" ? "Carte" :
                                    payment.paymentMethod === "CASH" ? "Espèces" :
                                      payment.paymentMethod === "CHECK" ? "Chèque" :
                                        payment.paymentMethod}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(new Date(payment.paymentDate))}
                                {payment.referenceNumber && ` • Réf: ${payment.referenceNumber}`}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-success">
                              +{formatCurrency(payment.amount, payment.currency)}
                            </p>
                            <Badge variant={payment.status === "VALIDATED" ? "success" : "secondary"}>
                              {payment.status === "VALIDATED" ? "Validé" : payment.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Aucun paiement enregistré</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Edit Student Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le profil</DialogTitle>
            <DialogDescription>
              Modifiez les informations de l&apos;étudiant
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Personal Info */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Informations personnelles
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prénom</Label>
                  <Input
                    id="firstName"
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom</Label>
                  <Input
                    id="lastName"
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nationality">Nationalité</Label>
                  <Input
                    id="nationality"
                    value={editForm.nationality}
                    onChange={(e) => setEditForm({ ...editForm, nationality: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currentFormation">Formation actuelle</Label>
                  <Input
                    id="currentFormation"
                    value={editForm.currentFormation}
                    onChange={(e) => setEditForm({ ...editForm, currentFormation: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="programType">Type de programme</Label>
                  <Select
                    value={editForm.programType}
                    onValueChange={(value) => setEditForm({ ...editForm, programType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MASTER">Master</SelectItem>
                      <SelectItem value="BACHELOR">Bachelor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedinUrl">LinkedIn</Label>
                <Input
                  id="linkedinUrl"
                  value={editForm.linkedinUrl}
                  onChange={(e) => setEditForm({ ...editForm, linkedinUrl: e.target.value })}
                  placeholder="https://linkedin.com/in/..."
                />
              </div>
            </div>

            <Separator />

            {/* Team */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Équipe
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mentorId">Mentor</Label>
                  <Select
                    value={editForm.mentorId || "_none"}
                    onValueChange={(value) => setEditForm({ ...editForm, mentorId: value === "_none" ? "" : value })}
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="professorQuantId">Professeur Quant</Label>
                    <Select
                      value={editForm.professorQuantId || "_none"}
                      onValueChange={(value) => setEditForm({ ...editForm, professorQuantId: value === "_none" ? "" : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Aucun</SelectItem>
                        {professors.filter(p => p.type === "QUANT").map((prof) => (
                          <SelectItem key={prof.id} value={prof.id}>
                            {prof.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="professorVerbalId">Professeur Verbal</Label>
                    <Select
                      value={editForm.professorVerbalId || "_none"}
                      onValueChange={(value) => setEditForm({ ...editForm, professorVerbalId: value === "_none" ? "" : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Aucun</SelectItem>
                        {professors.filter(p => p.type === "VERBAL").map((prof) => (
                          <SelectItem key={prof.id} value={prof.id}>
                            {prof.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Status */}
            <div className="space-y-4">
              <h3 className="font-medium">Statut</h3>
              <Select
                value={editForm.status}
                onValueChange={(value) => setEditForm({ ...editForm, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EN_DEMARRAGE">En démarrage</SelectItem>
                  <SelectItem value="EN_COURS">En cours</SelectItem>
                  <SelectItem value="FINALISE">Finalisé</SelectItem>
                  <SelectItem value="EN_PAUSE">En pause</SelectItem>
                  <SelectItem value="SUSPENDU">Suspendu</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Internal Notes */}
            <div className="space-y-4">
              <h3 className="font-medium">Notes internes</h3>
              <Textarea
                value={editForm.internalNotes}
                onChange={(e) => setEditForm({ ...editForm, internalNotes: e.target.value })}
                placeholder="Notes visibles uniquement par l'équipe..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveStudent} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation Dialog */}
      <AlertDialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Désactiver cet étudiant ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action désactivera le compte de {student.user.name || student.user.email}.
              L&apos;étudiant ne pourra plus se connecter et son statut sera mis à &quot;Suspendu&quot;.
              Cette action peut être annulée en modifiant le statut de l&apos;étudiant.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivateStudent}
              className="bg-error hover:bg-error/90"
              disabled={deactivating}
            >
              {deactivating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Désactiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Add Score Dialog */}
      <Dialog open={addScoreDialogOpen} onOpenChange={setAddScoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un score</DialogTitle>
            <DialogDescription>Ajoutez un nouveau score pour cet étudiant.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type de test</Label>
                <Select
                  value={scoreForm.testType}
                  onValueChange={(val) => setScoreForm({ ...scoreForm, testType: val })}
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
              <div className="space-y-2">
                <Label>Type de score</Label>
                <Select
                  value={scoreForm.scoreType}
                  onValueChange={(val) => setScoreForm({ ...scoreForm, scoreType: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DIAGNOSTIC">Diagnostic</SelectItem>
                    <SelectItem value="PRACTICE">Entraînement</SelectItem>
                    <SelectItem value="OFFICIAL">Officiel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div className="space-y-2">
                <Label>Quant</Label>
                <Input
                  type="number"
                  value={scoreForm.scoreQuant}
                  onChange={e => setScoreForm({ ...scoreForm, scoreQuant: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Verbal</Label>
                <Input
                  type="number"
                  value={scoreForm.scoreVerbal}
                  onChange={e => setScoreForm({ ...scoreForm, scoreVerbal: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>AWA</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={scoreForm.scoreAWA}
                  onChange={e => setScoreForm({ ...scoreForm, scoreAWA: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Score Total</Label>
              <Input
                type="number"
                value={scoreForm.totalScore}
                onChange={e => setScoreForm({ ...scoreForm, totalScore: e.target.value })}
                placeholder="Ex: 720"
              />
            </div>

            <div className="space-y-2">
              <Label>Date du test</Label>
              <Input
                type="date"
                value={scoreForm.testDate}
                onChange={e => setScoreForm({ ...scoreForm, testDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes (Optionnel)</Label>
              <Textarea
                value={scoreForm.notes}
                onChange={e => setScoreForm({ ...scoreForm, notes: e.target.value })}
                placeholder="Commentaires..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddScoreDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleAddScore} disabled={managingScore}>
              {managingScore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Edit Score Dialog */}
      <Dialog open={editScoreDialogOpen} onOpenChange={setEditScoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le score</DialogTitle>
            <DialogDescription>Modifiez les informations du score existant.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type de test</Label>
                <Select
                  value={scoreForm.testType}
                  onValueChange={(val) => setScoreForm({ ...scoreForm, testType: val })}
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
              <div className="space-y-2">
                <Label>Type de score</Label>
                <Select
                  value={scoreForm.scoreType}
                  onValueChange={(val) => setScoreForm({ ...scoreForm, scoreType: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DIAGNOSTIC">Diagnostic</SelectItem>
                    <SelectItem value="PRACTICE">Entraînement</SelectItem>
                    <SelectItem value="OFFICIAL">Officiel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div className="space-y-2">
                <Label>Quant</Label>
                <Input
                  type="number"
                  value={scoreForm.scoreQuant}
                  onChange={e => setScoreForm({ ...scoreForm, scoreQuant: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Verbal</Label>
                <Input
                  type="number"
                  value={scoreForm.scoreVerbal}
                  onChange={e => setScoreForm({ ...scoreForm, scoreVerbal: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>AWA</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={scoreForm.scoreAWA}
                  onChange={e => setScoreForm({ ...scoreForm, scoreAWA: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>IR</Label>
                <Input
                  type="number"
                  value={scoreForm.scoreIR}
                  onChange={e => setScoreForm({ ...scoreForm, scoreIR: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Score Total</Label>
              <Input
                type="number"
                value={scoreForm.totalScore}
                onChange={e => setScoreForm({ ...scoreForm, totalScore: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Date du test</Label>
              <Input
                type="date"
                value={scoreForm.testDate}
                onChange={e => setScoreForm({ ...scoreForm, testDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={scoreForm.notes}
                onChange={e => setScoreForm({ ...scoreForm, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditScoreDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleEditScore} disabled={managingScore}>
              {managingScore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Add Pack Dialog */}
      <Dialog open={addPackDialogOpen} onOpenChange={setAddPackDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un pack</DialogTitle>
            <DialogDescription>Assigner un nouveau pack à l&apos;étudiant.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Sélectionner un pack</Label>
              <Select
                value={packForm.packId}
                onValueChange={(val) => {
                  const selected = availablePacks.find(p => p.id === val);
                  setPackForm({
                    ...packForm,
                    packId: val,
                    customPrice: selected ? selected.price.toString() : ""
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un pack..." />
                </SelectTrigger>
                <SelectContent>
                  {availablePacks.map(pack => (
                    <SelectItem key={pack.id} value={pack.id}>
                      {pack.displayName} ({formatCurrency(pack.price)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Prix personnalisé (en centimes)</Label>
              <Input
                type="number"
                value={packForm.customPrice}
                onChange={e => setPackForm({ ...packForm, customPrice: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Laissez le prix par défaut ou modifiez-le pour ce client spécifique.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Date de début</Label>
              <Input
                type="date"
                value={packForm.startDate}
                onChange={e => setPackForm({ ...packForm, startDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Statut</Label>
              <Select
                value={packForm.status}
                onValueChange={(val) => setPackForm({ ...packForm, status: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="completed">Terminé</SelectItem>
                  <SelectItem value="cancelled">Annulé</SelectItem>
                  <SelectItem value="on_hold">En pause</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddPackDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleAddPack} disabled={managingPack || !packForm.packId}>
              {managingPack && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Pack Dialog */}
      <Dialog open={editPackDialogOpen} onOpenChange={setEditPackDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le pack</DialogTitle>
            <DialogDescription>Modifiez les détails du pack pour cet étudiant.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prix personnalisé</Label>
                <Input
                  type="number"
                  value={packForm.customPrice}
                  onChange={e => setPackForm({ ...packForm, customPrice: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Progression (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={packForm.progressPercent}
                  onChange={e => setPackForm({ ...packForm, progressPercent: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Date de début</Label>
              <Input
                type="date"
                value={packForm.startDate}
                onChange={e => setPackForm({ ...packForm, startDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Statut</Label>
              <Select
                value={packForm.status}
                onValueChange={(val) => setPackForm({ ...packForm, status: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="completed">Terminé</SelectItem>
                  <SelectItem value="cancelled">Annulé</SelectItem>
                  <SelectItem value="on_hold">En pause</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notes internes</Label>
              <Textarea
                value={packForm.notes}
                onChange={e => setPackForm({ ...packForm, notes: e.target.value })}
                placeholder="Notes sur ce pack..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPackDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleEditPack} disabled={managingPack}>
              {managingPack && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Add School Dialog */}
      <Dialog open={addSchoolDialogOpen} onOpenChange={setAddSchoolDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une école</DialogTitle>
            <DialogDescription>Ajouter une nouvelle candidature pour cet étudiant.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>École</Label>
              <Select
                value={schoolForm.schoolId}
                onValueChange={(val) => setSchoolForm({ ...schoolForm, schoolId: val, programId: "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une école..." />
                </SelectTrigger>
                <SelectContent>
                  {availableSchools.map(school => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.name} ({school.country})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {schoolForm.schoolId && (
              <div className="space-y-2">
                <Label>Programme</Label>
                <Select
                  value={schoolForm.programId}
                  onValueChange={(val) => setSchoolForm({ ...schoolForm, programId: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un programme..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSchools.find(s => s.id === schoolForm.schoolId)?.programs.map(prog => (
                      <SelectItem key={prog.id} value={prog.id}>
                        {prog.name} ({prog.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priorité</Label>
                <Select
                  value={schoolForm.priority}
                  onValueChange={(val) => setSchoolForm({ ...schoolForm, priority: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(p => (
                      <SelectItem key={p} value={p.toString()}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select
                  value={schoolForm.status}
                  onValueChange={(val) => setSchoolForm({ ...schoolForm, status: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="interested">Intéressé</SelectItem>
                    <SelectItem value="in_progress">En cours</SelectItem>
                    <SelectItem value="submitted">Soumis</SelectItem>
                    <SelectItem value="interview">Entretien</SelectItem>
                    <SelectItem value="admitted">Admis</SelectItem>
                    <SelectItem value="rejected">Refusé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddSchoolDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleAddSchool} disabled={managingSchool || !schoolForm.programId}>
              {managingSchool && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit School Dialog */}
      <Dialog open={editSchoolDialogOpen} onOpenChange={setEditSchoolDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la candidature</DialogTitle>
            <DialogDescription>Mettre à jour le statut et les détails.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priorité</Label>
                <Select
                  value={schoolForm.priority}
                  onValueChange={(val) => setSchoolForm({ ...schoolForm, priority: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(p => (
                      <SelectItem key={p} value={p.toString()}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select
                  value={schoolForm.status}
                  onValueChange={(val) => setSchoolForm({ ...schoolForm, status: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="interested">Intéressé</SelectItem>
                    <SelectItem value="in_progress">En cours</SelectItem>
                    <SelectItem value="submitted">Soumis</SelectItem>
                    <SelectItem value="interview">Entretien</SelectItem>
                    <SelectItem value="admitted">Admis</SelectItem>
                    <SelectItem value="rejected">Refusé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={schoolForm.notes}
                onChange={e => setSchoolForm({ ...schoolForm, notes: e.target.value })}
                placeholder="Commentaires..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSchoolDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleEditSchool} disabled={managingSchool}>
              {managingSchool && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Add Task Dialog */}
      <Dialog open={addTaskDialogOpen} onOpenChange={setAddTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle tâche</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input
                value={taskForm.title}
                onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Select
                  value={taskForm.category}
                  onValueChange={val => setTaskForm({ ...taskForm, category: val })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GENERAL">Général</SelectItem>
                    <SelectItem value="QUANT">Quant</SelectItem>
                    <SelectItem value="VERBAL">Verbal</SelectItem>
                    <SelectItem value="ESSAY">Essay</SelectItem>
                    <SelectItem value="CV">CV</SelectItem>
                    <SelectItem value="ORAL">Oral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date limite</Label>
                <Input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={taskForm.description}
                onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddTaskDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleAddTask} disabled={managingTask || !taskForm.title}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={editTaskDialogOpen} onOpenChange={setEditTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la tâche</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input
                value={taskForm.title}
                onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Select
                  value={taskForm.category}
                  onValueChange={val => setTaskForm({ ...taskForm, category: val })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GENERAL">Général</SelectItem>
                    <SelectItem value="QUANT">Quant</SelectItem>
                    <SelectItem value="VERBAL">Verbal</SelectItem>
                    <SelectItem value="ESSAY">Essay</SelectItem>
                    <SelectItem value="CV">CV</SelectItem>
                    <SelectItem value="ORAL">Oral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date limite</Label>
                <Input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={taskForm.description}
                onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTaskDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleEditTask} disabled={managingTask}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Payment Schedule Dialogs */}
      <Dialog open={addScheduleDialogOpen} onOpenChange={setAddScheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle échéance</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={scheduleForm.type}
                onValueChange={val => setScheduleForm({ ...scheduleForm, type: val })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="STUDENT_PAYMENT">Paiement Étudiant</SelectItem>
                  <SelectItem value="MENTOR_PAYMENT">Paiement Mentor</SelectItem>
                  <SelectItem value="PROFESSOR_PAYMENT">Paiement Professeur</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Montant (EUR)</Label>
                <Input
                  type="number"
                  value={scheduleForm.amount}
                  onChange={e => setScheduleForm({ ...scheduleForm, amount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Date d'échéance</Label>
                <Input
                  type="date"
                  value={scheduleForm.dueDate}
                  onChange={e => setScheduleForm({ ...scheduleForm, dueDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddScheduleDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleAddSchedule} disabled={managingSchedule || !scheduleForm.amount}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editScheduleDialogOpen} onOpenChange={setEditScheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'échéance</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={scheduleForm.type}
                onValueChange={val => setScheduleForm({ ...scheduleForm, type: val })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="STUDENT_PAYMENT">Paiement Étudiant</SelectItem>
                  <SelectItem value="MENTOR_PAYMENT">Paiement Mentor</SelectItem>
                  <SelectItem value="PROFESSOR_PAYMENT">Paiement Professeur</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Montant (EUR)</Label>
                <Input
                  type="number"
                  value={scheduleForm.amount}
                  onChange={e => setScheduleForm({ ...scheduleForm, amount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Date d'échéance</Label>
                <Input
                  type="date"
                  value={scheduleForm.dueDate}
                  onChange={e => setScheduleForm({ ...scheduleForm, dueDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select
                value={scheduleForm.status}
                onValueChange={val => setScheduleForm({ ...scheduleForm, status: val })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">En attente</SelectItem>
                  <SelectItem value="PARTIAL">Partiel</SelectItem>
                  <SelectItem value="PAID">Payé</SelectItem>
                  <SelectItem value="OVERDUE">En retard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditScheduleDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleEditSchedule} disabled={managingSchedule}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Essay Dialogs */}
      <Dialog open={addEssayDialogOpen} onOpenChange={setAddEssayDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nouvel essay</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input
                value={essayForm.title}
                onChange={e => setEssayForm({ ...essayForm, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>École</Label>
                <Select
                  value={essayForm.schoolId}
                  onValueChange={val => setEssayForm({ ...essayForm, schoolId: val })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {availableSchools.map(school => (
                      <SelectItem key={school.id} value={school.id}>{school.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Programme (Optionnel)</Label>
                <Select
                  value={essayForm.programId}
                  onValueChange={val => setEssayForm({ ...essayForm, programId: val === "none" ? "" : val })}
                >
                  <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {essayForm.schoolId && availableSchools.find(s => s.id === essayForm.schoolId)?.programs.map(prog => (
                      <SelectItem key={prog.id} value={prog.id}>{prog.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Contenu</Label>
              <Textarea
                value={essayForm.content}
                onChange={e => setEssayForm({ ...essayForm, content: e.target.value })}
                className="min-h-[200px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddEssayDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleAddEssay} disabled={managingEssay || !essayForm.title || !essayForm.schoolId}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editEssayDialogOpen} onOpenChange={setEditEssayDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifier l'essay</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input
                value={essayForm.title}
                onChange={e => setEssayForm({ ...essayForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select
                value={essayForm.status}
                onValueChange={val => setEssayForm({ ...essayForm, status: val })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Brouillon</SelectItem>
                  <SelectItem value="in_review">En révision</SelectItem>
                  <SelectItem value="finalized">Finalisé</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Contenu</Label>
              <Textarea
                value={essayForm.content}
                onChange={e => setEssayForm({ ...essayForm, content: e.target.value })}
                className="min-h-[200px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditEssayDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleEditEssay} disabled={managingEssay}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
