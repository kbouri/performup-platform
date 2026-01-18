"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate, EVENT_TYPE_DISPLAY } from "@/lib/utils";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  User,
  Video,
  Loader2,
  BookOpen,
  MessageSquare,
  Target,
  Mic,
  LayoutGrid,
  List,
  ArrowLeft,
  GripVertical,
  CheckCircle,
  Circle,
  FileText,
  PenTool,
  ChevronDown,
  ChevronUp,
  X,
  Trash2,
  MoreVertical,
  Repeat,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

interface StudentInfo {
  id: string;
  name: string | null;
  email: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  eventType: string;
  meetingUrl: string | null;
  completed: boolean;
  student: {
    id: string;
    userId: string;
    name: string | null;
    email: string;
  };
  instructor: {
    id: string;
    userId: string;
    name: string | null;
    type: string;
  } | null;
}

interface TaskSchedule {
  id: string;
  scheduledFor: string;
  completed: boolean;
  completedAt: string | null;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  timing: string;
  dueDate: string;
  category: string;
  completed: boolean;
  completedAt: string | null;
  scheduledAt: string | null;
  durationMinutes: number;
  schedules: TaskSchedule[];
  scheduleCount: number;
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
}

interface Student {
  id: string;
  name: string | null;
  email: string;
}

interface Professor {
  id: string;
  name: string;
  type: string;
}

type ViewMode = "week" | "list";

// Drag and drop types
interface DragItem {
  type: "task";
  task: Task;
}

const HOUR_HEIGHT = 60; // pixels per hour
const TASK_CATEGORIES = {
  QUANT: { label: "Quant", color: "bg-blue-500", icon: BookOpen },
  VERBAL: { label: "Verbal", color: "bg-purple-500", icon: BookOpen },
  ESSAY: { label: "Essay", color: "bg-green-500", icon: PenTool },
  CV: { label: "CV", color: "bg-orange-500", icon: FileText },
  ORAL: { label: "Oral", color: "bg-pink-500", icon: Mic },
  GENERAL: { label: "General", color: "bg-gray-500", icon: Target },
};

interface MentorInfo {
  id: string;
  userId: string;
  name: string | null;
  email: string;
}

interface ProfessorInfo {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  type: string;
}

export default function PlanningPage() {
  const searchParams = useSearchParams();
  const studentIdParam = searchParams.get("studentId");
  const mentorIdParam = searchParams.get("mentorId");
  const professorIdParam = searchParams.get("professorId");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [newEventDialogOpen, setNewEventDialogOpen] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [creating, setCreating] = useState(false);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [mentorInfo, setMentorInfo] = useState<MentorInfo | null>(null);
  const [professorInfo, setProfessorInfo] = useState<ProfessorInfo | null>(null);
  const [tasksPanelExpanded, setTasksPanelExpanded] = useState(true);

  // Drag state
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dropTarget, setDropTarget] = useState<{ date: Date; hour: number } | null>(null);

  // Delete task dialog
  const [deleteTaskDialog, setDeleteTaskDialog] = useState<{ open: boolean; task: Task | null }>({
    open: false,
    task: null,
  });
  const [deleting, setDeleting] = useState(false);

  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    eventType: "COURS_QUANT",
    studentId: studentIdParam || "",
    instructorId: "",
    meetingUrl: "",
  });

  // Fetch student/mentor/professor info based on URL params
  useEffect(() => {
    async function fetchUserInfo() {
      // Reset all info
      setStudentInfo(null);
      setMentorInfo(null);
      setProfessorInfo(null);

      if (studentIdParam) {
        try {
          const response = await fetch(`/api/students/${studentIdParam}`);
          if (response.ok) {
            const data = await response.json();
            setStudentInfo({
              id: data.student.id,
              name: data.student.user.name,
              email: data.student.user.email,
            });
            setNewEvent(prev => ({ ...prev, studentId: studentIdParam }));
          }
        } catch (error) {
          console.error("Error fetching student info:", error);
        }
      } else if (mentorIdParam) {
        try {
          const response = await fetch(`/api/admin/team/mentors/${mentorIdParam}`);
          if (response.ok) {
            const data = await response.json();
            const mentor = data.mentor;
            setMentorInfo({
              id: mentor.id,
              userId: mentor.userId,
              name: mentor.user.firstName && mentor.user.lastName
                ? `${mentor.user.firstName} ${mentor.user.lastName}`
                : mentor.user.name,
              email: mentor.user.email,
            });
          }
        } catch (error) {
          console.error("Error fetching mentor info:", error);
        }
      } else if (professorIdParam) {
        try {
          const response = await fetch(`/api/admin/team/professors/${professorIdParam}`);
          if (response.ok) {
            const data = await response.json();
            const professor = data.professor;
            setProfessorInfo({
              id: professor.id,
              userId: professor.userId,
              name: professor.user.firstName && professor.user.lastName
                ? `${professor.user.firstName} ${professor.user.lastName}`
                : professor.user.name,
              email: professor.user.email,
              type: professor.type,
            });
          }
        } catch (error) {
          console.error("Error fetching professor info:", error);
        }
      }
    }
    fetchUserInfo();
  }, [studentIdParam, mentorIdParam, professorIdParam]);

  // Get week dates
  const getWeekDates = (date: Date) => {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay() + 1); // Monday
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const weekDates = getWeekDates(currentDate);
  const weekStart = weekDates[0];
  const weekEnd = weekDates[6];

  const weekStartKey = weekStart.toISOString().split("T")[0];
  const weekEndKey = weekEnd.toISOString().split("T")[0];

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const startDate = new Date(weekStartKey);
      const endDate = new Date(weekEndKey);
      endDate.setDate(endDate.getDate() + 1);

      const params = new URLSearchParams();
      params.set("startDate", startDate.toISOString());
      params.set("endDate", endDate.toISOString());
      if (studentIdParam) {
        params.set("studentId", studentIdParam);
      }
      if (mentorIdParam) {
        params.set("mentorId", mentorIdParam);
      }
      if (professorIdParam) {
        params.set("professorId", professorIdParam);
      }

      const response = await fetch(`/api/calendar-events?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  }, [weekStartKey, weekEndKey, studentIdParam, mentorIdParam, professorIdParam]);

  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (studentIdParam) {
        params.set("studentId", studentIdParam);
      }
      params.set("completed", "false");

      const response = await fetch(`/api/tasks?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  }, [studentIdParam]);

  useEffect(() => {
    fetchEvents();
    fetchTasks();
  }, [fetchEvents, fetchTasks]);

  // Fetch students and professors for new event form
  useEffect(() => {
    async function fetchData() {
      try {
        const [studentsRes, professorsRes] = await Promise.all([
          fetch("/api/students?limit=100"),
          fetch("/api/professors"),
        ]);

        if (studentsRes.ok) {
          const data = await studentsRes.json();
          setStudents(
            data.students?.map((s: { id: string; name: string | null; email: string }) => ({
              id: s.id,
              name: s.name,
              email: s.email,
            })) || []
          );
        }

        if (professorsRes.ok) {
          const data = await professorsRes.json();
          setProfessors(data.professors || []);
        }
      } catch (error) {
        console.error("Error fetching form data:", error);
      }
    }
    fetchData();
  }, []);

  // Scroll to current time on mount
  useEffect(() => {
    if (scrollContainerRef.current && viewMode === "week") {
      const now = new Date();
      const currentHour = now.getHours();
      // Scroll to current hour minus 2 hours for context
      const scrollPosition = Math.max(0, (currentHour - 2) * HOUR_HEIGHT);
      scrollContainerRef.current.scrollTop = scrollPosition;
    }
  }, [viewMode, loading]);

  const navigateWeek = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + direction * 7);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.startTime || !newEvent.endTime || !newEvent.studentId) {
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/calendar-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEvent),
      });

      if (response.ok) {
        setNewEventDialogOpen(false);
        setNewEvent({
          title: "",
          description: "",
          startTime: "",
          endTime: "",
          eventType: "COURS_QUANT",
          studentId: studentIdParam || "",
          instructorId: "",
          meetingUrl: "",
        });
        fetchEvents();
      }
    } catch (error) {
      console.error("Error creating event:", error);
    } finally {
      setCreating(false);
    }
  };

  // Schedule a task on the calendar (creates a new schedule session)
  const handleScheduleTask = async (task: Task, date: Date, hour: number) => {
    try {
      const scheduledFor = new Date(date);
      scheduledFor.setHours(hour, 0, 0, 0);

      const response = await fetch(`/api/tasks/${task.id}/schedules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledFor: scheduledFor.toISOString(),
        }),
      });

      if (response.ok) {
        fetchTasks();
      }
    } catch (error) {
      console.error("Error scheduling task:", error);
    }
  };

  // Remove a scheduled session from the calendar
  const handleUnscheduleTask = async (taskId: string, scheduleId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/schedules/${scheduleId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchTasks();
      }
    } catch (error) {
      console.error("Error unscheduling task:", error);
    }
  };

  // Delete a task entirely
  const handleDeleteTask = async () => {
    if (!deleteTaskDialog.task) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/tasks/${deleteTaskDialog.task.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setDeleteTaskDialog({ open: false, task: null });
        fetchTasks();
      }
    } catch (error) {
      console.error("Error deleting task:", error);
    } finally {
      setDeleting(false);
    }
  };

  // Mark a schedule session as completed
  const handleCompleteSchedule = async (taskId: string, scheduleId: string, completed: boolean) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/schedules/${scheduleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });

      if (response.ok) {
        fetchTasks();
      }
    } catch (error) {
      console.error("Error completing schedule:", error);
    }
  };

  // Drag handlers
  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  const handleDragEnd = () => {
    if (draggedTask && dropTarget) {
      handleScheduleTask(draggedTask, dropTarget.date, dropTarget.hour);
    }
    setDraggedTask(null);
    setDropTarget(null);
  };

  const handleDragOver = (e: React.DragEvent, date: Date, hour: number) => {
    e.preventDefault();
    setDropTarget({ date, hour });
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "COURS_QUANT":
        return BookOpen;
      case "COURS_VERBAL":
        return BookOpen;
      case "SESSION_MENTOR":
        return MessageSquare;
      case "TEST_BLANC":
        return Target;
      case "SIMULATION_ORAL":
        return Mic;
      default:
        return CalendarIcon;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case "COURS_QUANT":
        return "bg-calendar-quant text-white";
      case "COURS_VERBAL":
        return "bg-calendar-verbal text-white";
      case "SESSION_MENTOR":
        return "bg-calendar-mentor text-white";
      case "TEST_BLANC":
        return "bg-calendar-test text-white";
      case "SIMULATION_ORAL":
        return "bg-calendar-oral text-white";
      default:
        return "bg-muted text-foreground";
    }
  };

  const getEventsForDay = (date: Date) => {
    return events.filter((event) => {
      const eventDate = new Date(event.startTime);
      return (
        eventDate.getFullYear() === date.getFullYear() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getDate() === date.getDate()
      );
    });
  };

  // Get scheduled sessions for a specific day (returns task + schedule info)
  const getScheduledSessionsForDay = (date: Date) => {
    const sessions: Array<{ task: Task; schedule: TaskSchedule }> = [];

    tasks.forEach((task) => {
      task.schedules.forEach((schedule) => {
        const scheduleDate = new Date(schedule.scheduledFor);
        if (
          scheduleDate.getFullYear() === date.getFullYear() &&
          scheduleDate.getMonth() === date.getMonth() &&
          scheduleDate.getDate() === date.getDate()
        ) {
          sessions.push({ task, schedule });
        }
      });
    });

    return sessions;
  };

  // Tasks can still be dragged even if they have schedules (for multi-session tasks)
  const getUnscheduledTasks = () => {
    return tasks.filter((task) => !task.completed);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Full day hours (0-23)
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Build breadcrumbs and page info based on view type
  const getBreadcrumbs = () => {
    if (studentInfo) {
      return [
        { label: "Etudiants", href: "/students" },
        { label: studentInfo.name || studentInfo.email, href: `/students/${studentInfo.id}` },
        { label: "Planning" },
      ];
    }
    if (mentorInfo) {
      return [
        { label: "Admin" },
        { label: "Equipe", href: "/admin/team" },
        { label: mentorInfo.name || mentorInfo.email, href: `/admin/team/mentors/${mentorInfo.id}` },
        { label: "Planning" },
      ];
    }
    if (professorInfo) {
      return [
        { label: "Admin" },
        { label: "Equipe", href: "/admin/team" },
        { label: professorInfo.name || professorInfo.email, href: `/admin/team/professors/${professorInfo.id}` },
        { label: "Planning" },
      ];
    }
    return [{ label: "Planning" }];
  };

  const getPageTitle = () => {
    if (studentInfo) {
      return `Planning de ${studentInfo.name || studentInfo.email}`;
    }
    if (mentorInfo) {
      return `Planning de ${mentorInfo.name || mentorInfo.email}`;
    }
    if (professorInfo) {
      return `Planning de ${professorInfo.name || professorInfo.email}`;
    }
    return "Planning";
  };

  const getPageDescription = () => {
    if (studentInfo) {
      return "Cours et sessions de cet etudiant";
    }
    if (mentorInfo) {
      return "Sessions et disponibilites de ce mentor";
    }
    if (professorInfo) {
      return `Cours ${professorInfo.type === "QUANT" ? "Quantitatif" : "Verbal"} de ce professeur`;
    }
    return "Gerez les cours et sessions";
  };

  const getBackLink = () => {
    if (studentInfo) {
      return { href: `/students/${studentInfo.id}`, label: "Retour a la fiche" };
    }
    if (mentorInfo) {
      return { href: `/admin/team/mentors/${mentorInfo.id}`, label: "Retour a la fiche" };
    }
    if (professorInfo) {
      return { href: `/admin/team/professors/${professorInfo.id}`, label: "Retour a la fiche" };
    }
    return null;
  };

  const unscheduledTasks = getUnscheduledTasks();
  const backLink = getBackLink();

  return (
    <>
      <PageHeader
        title={getPageTitle()}
        description={getPageDescription()}
        breadcrumbs={getBreadcrumbs()}
        actions={
          <div className="flex gap-2">
            {backLink && (
              <Button variant="outline" asChild>
                <Link href={backLink.href}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {backLink.label}
                </Link>
              </Button>
            )}
            <Button onClick={() => setNewEventDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvel evenement
            </Button>
          </div>
        }
      />

      {/* Navigation and view controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateWeek(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={goToToday}>
            Aujourd&apos;hui
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigateWeek(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="ml-4 text-lg font-medium">
            {formatDate(weekStart, { day: "numeric", month: "long" })} -{" "}
            {formatDate(weekEnd, { day: "numeric", month: "long", year: "numeric" })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "week" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("week")}
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

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-performup-blue" />
        </div>
      ) : viewMode === "week" ? (
        <div className="flex gap-4">
          {/* Main Calendar */}
          <Card className="flex-1">
            <CardContent className="p-0">
              <div className="flex flex-col">
                {/* Sticky Header */}
                <div className="sticky top-0 z-20 bg-background border-b">
                  <div className="grid grid-cols-8 min-w-[900px]">
                    <div className="p-3 text-center text-sm font-medium text-muted-foreground border-r w-16">
                      Heure
                    </div>
                    {weekDates.map((date) => (
                      <div
                        key={date.toISOString()}
                        className={`p-3 text-center border-r last:border-r-0 ${
                          isToday(date) ? "bg-performup-blue/5" : ""
                        }`}
                      >
                        <div className="text-sm text-muted-foreground">
                          {formatDate(date, { weekday: "short" })}
                        </div>
                        <div
                          className={`text-lg font-semibold ${
                            isToday(date) ? "text-performup-blue" : ""
                          }`}
                        >
                          {date.getDate()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Scrollable Time Grid */}
                <div
                  ref={scrollContainerRef}
                  className="overflow-y-auto overflow-x-auto"
                  style={{ maxHeight: "calc(100vh - 320px)" }}
                >
                  <div className="relative min-w-[900px]">
                    {hours.map((hour) => (
                      <div key={hour} className="grid grid-cols-8" style={{ height: `${HOUR_HEIGHT}px` }}>
                        <div className="p-2 text-xs text-muted-foreground text-right pr-3 border-r border-b w-16 flex-shrink-0">
                          {hour.toString().padStart(2, "0")}:00
                        </div>
                        {weekDates.map((date) => {
                          const dayEvents = getEventsForDay(date).filter((e) => {
                            const eventHour = new Date(e.startTime).getHours();
                            return eventHour === hour;
                          });
                          const daySessions = getScheduledSessionsForDay(date).filter(({ schedule }) => {
                            const scheduleHour = new Date(schedule.scheduledFor).getHours();
                            return scheduleHour === hour;
                          });
                          const isDropTarget =
                            dropTarget &&
                            dropTarget.date.toDateString() === date.toDateString() &&
                            dropTarget.hour === hour;

                          return (
                            <div
                              key={`${date.toISOString()}-${hour}`}
                              className={`border-r border-b last:border-r-0 relative transition-colors ${
                                isToday(date) ? "bg-performup-blue/5" : ""
                              } ${isDropTarget ? "bg-performup-blue/20" : ""}`}
                              onDragOver={(e) => handleDragOver(e, date, hour)}
                              onDragLeave={handleDragLeave}
                              onDrop={handleDragEnd}
                            >
                              {/* Events */}
                              {dayEvents.map((event) => {
                                const EventIcon = getEventIcon(event.eventType);
                                const startMinutes = new Date(event.startTime).getMinutes();
                                const duration =
                                  (new Date(event.endTime).getTime() -
                                    new Date(event.startTime).getTime()) /
                                  (60 * 1000);
                                const height = (duration / 60) * HOUR_HEIGHT;
                                const top = (startMinutes / 60) * HOUR_HEIGHT;

                                return (
                                  <div
                                    key={event.id}
                                    className={`absolute left-1 right-1 p-1 rounded text-xs ${getEventColor(
                                      event.eventType
                                    )} overflow-hidden cursor-pointer hover:opacity-90 shadow-sm z-10`}
                                    style={{
                                      top: `${top}px`,
                                      height: `${Math.max(height, 20)}px`,
                                    }}
                                  >
                                    <div className="flex items-center gap-1 font-medium truncate">
                                      <EventIcon className="h-3 w-3 flex-shrink-0" />
                                      <span className="truncate">{event.title}</span>
                                    </div>
                                    {height > 30 && (
                                      <div className="text-[10px] opacity-90 truncate">
                                        {event.student.name}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}

                              {/* Scheduled Task Sessions */}
                              {daySessions.map(({ task, schedule }) => {
                                const category = TASK_CATEGORIES[task.category as keyof typeof TASK_CATEGORIES] || TASK_CATEGORIES.GENERAL;
                                const TaskIcon = category.icon;
                                const startMinutes = new Date(schedule.scheduledFor).getMinutes();
                                const height = (task.durationMinutes / 60) * HOUR_HEIGHT;
                                const top = (startMinutes / 60) * HOUR_HEIGHT;

                                return (
                                  <div
                                    key={schedule.id}
                                    className={`absolute left-1 right-1 p-1 rounded text-xs ${category.color} text-white overflow-hidden shadow-sm z-10 border-2 border-dashed border-white/50 group ${
                                      schedule.completed ? "opacity-60" : ""
                                    }`}
                                    style={{
                                      top: `${top}px`,
                                      height: `${Math.max(height, 20)}px`,
                                    }}
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <div className="flex items-center gap-1 font-medium truncate flex-1 min-w-0">
                                        <TaskIcon className="h-3 w-3 flex-shrink-0" />
                                        <span className="truncate">{task.title}</span>
                                        {task.scheduleCount > 1 && (
                                          <span className="text-[10px] opacity-75">
                                            ({task.schedules.findIndex(s => s.id === schedule.id) + 1}/{task.scheduleCount})
                                          </span>
                                        )}
                                      </div>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleUnscheduleTask(task.id, schedule.id);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-white/20 rounded"
                                        title="Retirer du planning"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </div>
                                    {height > 30 && (
                                      <div className="flex items-center gap-1 mt-0.5">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleCompleteSchedule(task.id, schedule.id, !schedule.completed);
                                          }}
                                          className="p-0.5 hover:bg-white/20 rounded"
                                          title={schedule.completed ? "Marquer non complete" : "Marquer complete"}
                                        >
                                          {schedule.completed ? (
                                            <CheckCircle className="h-3 w-3" />
                                          ) : (
                                            <Circle className="h-3 w-3" />
                                          )}
                                        </button>
                                        <span className="text-[10px] opacity-90 truncate">
                                          {task.student.name || task.student.email}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    ))}

                    {/* Current time indicator */}
                    {weekDates.some((d) => isToday(d)) && (
                      <div
                        className="absolute left-16 right-0 border-t-2 border-red-500 z-30 pointer-events-none"
                        style={{
                          top: `${
                            (new Date().getHours() + new Date().getMinutes() / 60) * HOUR_HEIGHT
                          }px`,
                        }}
                      >
                        <div className="absolute -left-2 -top-1.5 w-3 h-3 rounded-full bg-red-500" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tasks Sidebar */}
          <Card className="w-80 flex-shrink-0">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Taches
                  {unscheduledTasks.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {unscheduledTasks.length}
                    </Badge>
                  )}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setTasksPanelExpanded(!tasksPanelExpanded)}
                >
                  {tasksPanelExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Glissez-deposez sur le calendrier (plusieurs fois possible)
              </p>
            </CardHeader>
            {tasksPanelExpanded && (
              <CardContent className="p-2 max-h-[calc(100vh-400px)] overflow-y-auto">
                {unscheduledTasks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Aucune tache</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {unscheduledTasks.map((task) => {
                      const category =
                        TASK_CATEGORIES[task.category as keyof typeof TASK_CATEGORIES] ||
                        TASK_CATEGORIES.GENERAL;
                      const TaskIcon = category.icon;

                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={() => handleDragStart(task)}
                          onDragEnd={handleDragEnd}
                          className={`p-3 rounded-lg border cursor-move hover:shadow-md transition-shadow ${
                            draggedTask?.id === task.id ? "opacity-50" : ""
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div
                                    className={`p-1 rounded ${category.color} text-white flex-shrink-0`}
                                  >
                                    <TaskIcon className="h-3 w-3" />
                                  </div>
                                  <span className="font-medium text-sm truncate">
                                    {task.title}
                                  </span>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
                                      <MoreVertical className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={() => setDeleteTaskDialog({ open: true, task })}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Supprimer la tache
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                <User className="h-3 w-3" />
                                <span className="truncate">
                                  {task.student.name || task.student.email}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <Badge variant="outline" className="text-xs">
                                  {category.label}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {task.durationMinutes} min
                                </span>
                                {task.scheduleCount > 0 && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Repeat className="h-2.5 w-2.5 mr-1" />
                                    {task.scheduleCount} session{task.scheduleCount > 1 ? "s" : ""}
                                  </Badge>
                                )}
                              </div>
                              {task.dueDate && (
                                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  Echeance: {formatDate(new Date(task.dueDate), { day: "numeric", month: "short" })}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          {weekDates.map((date) => {
            const dayEvents = getEventsForDay(date);
            const daySessions = getScheduledSessionsForDay(date);
            if (dayEvents.length === 0 && daySessions.length === 0) return null;

            return (
              <Card key={date.toISOString()}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    {formatDate(date, {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                    {isToday(date) && (
                      <Badge variant="secondary" className="ml-2">
                        Aujourd&apos;hui
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Events */}
                    {dayEvents.map((event) => {
                      const EventIcon = getEventIcon(event.eventType);
                      const eventInfo =
                        EVENT_TYPE_DISPLAY[event.eventType] || {
                          label: event.eventType,
                        };
                      return (
                        <div
                          key={event.id}
                          className="flex items-center gap-4 p-3 rounded-lg border"
                        >
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-lg ${getEventColor(
                              event.eventType
                            )}`}
                          >
                            <EventIcon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{event.title}</span>
                              <Badge variant="outline" className="text-xs">
                                {eventInfo.label}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDate(new Date(event.startTime), {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}{" "}
                                -{" "}
                                {formatDate(new Date(event.endTime), {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {event.student.name || event.student.email}
                              </span>
                            </div>
                          </div>
                          {event.meetingUrl && (
                            <Button variant="secondary" size="sm" asChild>
                              <a
                                href={event.meetingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Video className="mr-2 h-4 w-4" />
                                Rejoindre
                              </a>
                            </Button>
                          )}
                        </div>
                      );
                    })}

                    {/* Scheduled Task Sessions */}
                    {daySessions.map(({ task, schedule }) => {
                      const category =
                        TASK_CATEGORIES[task.category as keyof typeof TASK_CATEGORIES] ||
                        TASK_CATEGORIES.GENERAL;
                      const TaskIcon = category.icon;
                      return (
                        <div
                          key={schedule.id}
                          className={`flex items-center gap-4 p-3 rounded-lg border border-dashed ${
                            schedule.completed ? "opacity-60" : ""
                          }`}
                        >
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-lg ${category.color} text-white`}
                          >
                            <TaskIcon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{task.title}</span>
                              <Badge variant="outline" className="text-xs">
                                Tache - {category.label}
                              </Badge>
                              {task.scheduleCount > 1 && (
                                <Badge variant="secondary" className="text-xs">
                                  Session {task.schedules.findIndex(s => s.id === schedule.id) + 1}/{task.scheduleCount}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDate(new Date(schedule.scheduledFor), {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                                {" - "}
                                {task.durationMinutes} min
                              </span>
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {task.student.name || task.student.email}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCompleteSchedule(task.id, schedule.id, !schedule.completed)}
                              title={schedule.completed ? "Marquer non complete" : "Marquer complete"}
                            >
                              {schedule.completed ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              ) : (
                                <Circle className="h-5 w-5" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleUnscheduleTask(task.id, schedule.id)}
                              title="Retirer du planning"
                            >
                              <X className="h-5 w-5" />
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
          {events.length === 0 && tasks.every((t) => t.schedules.length === 0) && (
            <Card>
              <CardContent className="py-12 text-center">
                <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucun evenement cette semaine</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* New Event Dialog */}
      <Dialog open={newEventDialogOpen} onOpenChange={setNewEventDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouvel evenement</DialogTitle>
            <DialogDescription>
              Planifiez un nouveau cours ou session
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titre *</Label>
              <Input
                id="title"
                value={newEvent.title}
                onChange={(e) =>
                  setNewEvent((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Ex: Cours Quant #12"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Debut *</Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={newEvent.startTime}
                  onChange={(e) =>
                    setNewEvent((prev) => ({ ...prev, startTime: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">Fin *</Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={newEvent.endTime}
                  onChange={(e) =>
                    setNewEvent((prev) => ({ ...prev, endTime: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="eventType">Type d&apos;evenement *</Label>
              <Select
                value={newEvent.eventType}
                onValueChange={(value) =>
                  setNewEvent((prev) => ({ ...prev, eventType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COURS_QUANT">Cours Quant</SelectItem>
                  <SelectItem value="COURS_VERBAL">Cours Verbal</SelectItem>
                  <SelectItem value="SESSION_MENTOR">Session Mentor</SelectItem>
                  <SelectItem value="TEST_BLANC">Test blanc</SelectItem>
                  <SelectItem value="SIMULATION_ORAL">Simulation oral</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="student">Etudiant *</Label>
              <Select
                value={newEvent.studentId}
                onValueChange={(value) =>
                  setNewEvent((prev) => ({ ...prev, studentId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selectionner un etudiant" />
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

            <div className="space-y-2">
              <Label htmlFor="instructor">Professeur</Label>
              <Select
                value={newEvent.instructorId || "_none"}
                onValueChange={(value) =>
                  setNewEvent((prev) => ({ ...prev, instructorId: value === "_none" ? "" : value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selectionner un professeur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Aucun</SelectItem>
                  {professors.map((prof) => (
                    <SelectItem key={prof.id} value={prof.id}>
                      {prof.name} ({prof.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="meetingUrl">Lien de reunion</Label>
              <Input
                id="meetingUrl"
                type="url"
                value={newEvent.meetingUrl}
                onChange={(e) =>
                  setNewEvent((prev) => ({ ...prev, meetingUrl: e.target.value }))
                }
                placeholder="https://meet.google.com/..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewEventDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleCreateEvent}
              disabled={
                creating ||
                !newEvent.title ||
                !newEvent.startTime ||
                !newEvent.endTime ||
                !newEvent.studentId
              }
            >
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Creer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Task Dialog */}
      <AlertDialog
        open={deleteTaskDialog.open}
        onOpenChange={(open) => setDeleteTaskDialog({ open, task: open ? deleteTaskDialog.task : null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette tache ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irreversible. La tache &quot;{deleteTaskDialog.task?.title}&quot; sera
              definitivement supprimee, ainsi que toutes ses planifications.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTask}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Suppression...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
