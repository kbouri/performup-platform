"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";

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

export default function PlanningPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [newEventDialogOpen, setNewEventDialogOpen] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [creating, setCreating] = useState(false);

  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    eventType: "COURS_QUANT",
    studentId: "",
    instructorId: "",
    meetingUrl: "",
  });

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

  // Stable string keys for dependencies
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
  }, [weekStartKey, weekEndKey]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

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
          studentId: "",
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

  // Get events for a specific day
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

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8AM to 7PM

  return (
    <>
      <PageHeader
        title="Planning"
        description="Gérez les cours et sessions"
        breadcrumbs={[{ label: "Planning" }]}
        actions={
          <Button onClick={() => setNewEventDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvel événement
          </Button>
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
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                {/* Header */}
                <div className="grid grid-cols-8 border-b">
                  <div className="p-3 text-center text-sm font-medium text-muted-foreground">
                    Heure
                  </div>
                  {weekDates.map((date) => (
                    <div
                      key={date.toISOString()}
                      className={`p-3 text-center border-l ${
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

                {/* Time grid */}
                <div className="relative">
                  {hours.map((hour) => (
                    <div key={hour} className="grid grid-cols-8 border-b h-16">
                      <div className="p-2 text-xs text-muted-foreground text-right pr-3">
                        {hour}:00
                      </div>
                      {weekDates.map((date) => {
                        const dayEvents = getEventsForDay(date).filter((e) => {
                          const eventHour = new Date(e.startTime).getHours();
                          return eventHour === hour;
                        });
                        return (
                          <div
                            key={`${date.toISOString()}-${hour}`}
                            className={`border-l relative ${
                              isToday(date) ? "bg-performup-blue/5" : ""
                            }`}
                          >
                            {dayEvents.map((event) => {
                              const EventIcon = getEventIcon(event.eventType);
                              return (
                                <div
                                  key={event.id}
                                  className={`absolute inset-x-1 top-1 p-1 rounded text-xs ${getEventColor(
                                    event.eventType
                                  )}`}
                                  style={{
                                    height: `${
                                      ((new Date(event.endTime).getTime() -
                                        new Date(event.startTime).getTime()) /
                                        (60 * 60 * 1000)) *
                                      64
                                    }px`,
                                  }}
                                >
                                  <div className="flex items-center gap-1 font-medium truncate">
                                    <EventIcon className="h-3 w-3" />
                                    {event.title}
                                  </div>
                                  <div className="text-[10px] opacity-90">
                                    {event.student.name}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {weekDates.map((date) => {
            const dayEvents = getEventsForDay(date);
            if (dayEvents.length === 0) return null;

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
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {events.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucun événement cette semaine</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* New Event Dialog */}
      <Dialog open={newEventDialogOpen} onOpenChange={setNewEventDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouvel événement</DialogTitle>
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
                <Label htmlFor="startTime">Début *</Label>
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
              <Label htmlFor="eventType">Type d&apos;événement *</Label>
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
              <Label htmlFor="student">Étudiant *</Label>
              <Select
                value={newEvent.studentId}
                onValueChange={(value) =>
                  setNewEvent((prev) => ({ ...prev, studentId: value }))
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

            <div className="space-y-2">
              <Label htmlFor="instructor">Professeur</Label>
              <Select
                value={newEvent.instructorId || "_none"}
                onValueChange={(value) =>
                  setNewEvent((prev) => ({ ...prev, instructorId: value === "_none" ? "" : value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un professeur" />
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
              <Label htmlFor="meetingUrl">Lien de réunion</Label>
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
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
