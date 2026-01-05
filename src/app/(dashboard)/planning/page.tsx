"use client";

import { useState } from "react";
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
import { cn, formatDate, EVENT_TYPE_DISPLAY } from "@/lib/utils";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Video,
  Users,
  BookOpen,
  FileText,
  Target,
  MoreHorizontal,
} from "lucide-react";

// Mock events data
const eventsData = [
  {
    id: "1",
    title: "Cours Quantitatif",
    type: "COURS_QUANT",
    startTime: new Date(2025, 0, 6, 10, 0),
    endTime: new Date(2025, 0, 6, 12, 0),
    instructor: "Prof. Martin",
    student: "Marie Dupont",
    meetingUrl: "https://meet.google.com/abc-defg-hij",
  },
  {
    id: "2",
    title: "Session Mentor",
    type: "SESSION_MENTOR",
    startTime: new Date(2025, 0, 6, 14, 0),
    endTime: new Date(2025, 0, 6, 15, 0),
    instructor: "Sophie Martin",
    student: "Thomas Bernard",
    meetingUrl: "https://meet.google.com/xyz-uvwx-rst",
  },
  {
    id: "3",
    title: "Cours Verbal",
    type: "COURS_VERBAL",
    startTime: new Date(2025, 0, 7, 9, 0),
    endTime: new Date(2025, 0, 7, 11, 0),
    instructor: "Prof. Laurent",
    student: "Julie Chen",
    meetingUrl: "https://meet.google.com/lmn-opqr-stu",
  },
  {
    id: "4",
    title: "Test Blanc GMAT",
    type: "TEST_BLANC",
    startTime: new Date(2025, 0, 8, 9, 0),
    endTime: new Date(2025, 0, 8, 13, 0),
    instructor: "Prof. Martin",
    student: "Alexandre Petit",
    meetingUrl: null,
  },
  {
    id: "5",
    title: "Simulation Oral HEC",
    type: "SIMULATION_ORAL",
    startTime: new Date(2025, 0, 9, 15, 0),
    endTime: new Date(2025, 0, 9, 16, 0),
    instructor: "Sophie Martin",
    student: "Marie Dupont",
    meetingUrl: "https://meet.google.com/sim-oral-hec",
  },
];

const timeSlots = [
  "08:00", "09:00", "10:00", "11:00", "12:00", "13:00",
  "14:00", "15:00", "16:00", "17:00", "18:00", "19:00",
];

type ViewMode = "week" | "day" | "list";

export default function PlanningPage() {
  const [currentDate, setCurrentDate] = useState(new Date(2025, 0, 6)); // Jan 6, 2025 (Monday)
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Get week days
  const getWeekDays = (date: Date) => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
    start.setDate(diff);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const weekDays = getWeekDays(currentDate);

  const navigateWeek = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7));
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getEventColor = (type: string) => {
    const colors: Record<string, string> = {
      COURS_QUANT: "bg-calendar-quant/20 border-calendar-quant text-calendar-quant",
      COURS_VERBAL: "bg-calendar-verbal/20 border-calendar-verbal text-calendar-verbal",
      SESSION_MENTOR: "bg-calendar-mentor/20 border-calendar-mentor text-calendar-mentor",
      TEST_BLANC: "bg-calendar-test/20 border-calendar-test text-calendar-test",
      SIMULATION_ORAL: "bg-calendar-oral/20 border-calendar-oral text-calendar-oral",
    };
    return colors[type] || "bg-muted border-border";
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "COURS_QUANT":
        return BookOpen;
      case "COURS_VERBAL":
        return FileText;
      case "SESSION_MENTOR":
        return Users;
      case "TEST_BLANC":
        return Target;
      case "SIMULATION_ORAL":
        return Video;
      default:
        return CalendarIcon;
    }
  };

  const getEventsForDay = (date: Date) => {
    return eventsData.filter((event) => {
      const eventDate = event.startTime;
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear() &&
        (typeFilter === "all" || event.type === typeFilter)
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

  const filteredEvents = eventsData.filter(
    (e) => typeFilter === "all" || e.type === typeFilter
  );

  return (
    <>
      <PageHeader
        title="Planning"
        description="Gérez votre calendrier et planifiez vos sessions"
        breadcrumbs={[{ label: "Planning" }]}
        actions={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau cours
          </Button>
        }
      />

      {/* Controls */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateWeek("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={goToToday}>
            Aujourd&apos;hui
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigateWeek("next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="ml-2 font-medium">
            {formatDate(weekDays[0], { day: "numeric", month: "long" })} -{" "}
            {formatDate(weekDays[6], { day: "numeric", month: "long", year: "numeric" })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Type d'événement" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="COURS_QUANT">Cours Quant</SelectItem>
              <SelectItem value="COURS_VERBAL">Cours Verbal</SelectItem>
              <SelectItem value="SESSION_MENTOR">Session Mentor</SelectItem>
              <SelectItem value="TEST_BLANC">Test Blanc</SelectItem>
              <SelectItem value="SIMULATION_ORAL">Simulation Oral</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex border rounded-lg">
            <Button
              variant={viewMode === "day" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("day")}
              className="rounded-r-none"
            >
              Jour
            </Button>
            <Button
              variant={viewMode === "week" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("week")}
              className="rounded-none border-x"
            >
              Semaine
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="rounded-l-none"
            >
              Liste
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === "week" && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              {/* Header */}
              <div className="grid grid-cols-8 border-b">
                <div className="p-3 border-r" /> {/* Empty corner */}
                {weekDays.map((day, index) => (
                  <div
                    key={index}
                    className={cn(
                      "p-3 text-center border-r last:border-r-0",
                      isToday(day) && "bg-performup-blue/5"
                    )}
                  >
                    <div className="text-sm text-muted-foreground">
                      {formatDate(day, { weekday: "short" })}
                    </div>
                    <div
                      className={cn(
                        "text-lg font-medium",
                        isToday(day) &&
                          "w-8 h-8 mx-auto rounded-full bg-performup-blue text-white flex items-center justify-center"
                      )}
                    >
                      {day.getDate()}
                    </div>
                  </div>
                ))}
              </div>

              {/* Time slots */}
              <div className="grid grid-cols-8">
                {/* Time column */}
                <div className="border-r">
                  {timeSlots.map((time) => (
                    <div key={time} className="h-20 border-b p-2 text-xs text-muted-foreground">
                      {time}
                    </div>
                  ))}
                </div>

                {/* Days columns */}
                {weekDays.map((day, dayIndex) => {
                  const dayEvents = getEventsForDay(day);
                  return (
                    <div
                      key={dayIndex}
                      className={cn("border-r last:border-r-0 relative", isToday(day) && "bg-performup-blue/5")}
                    >
                      {timeSlots.map((time) => (
                        <div key={time} className="h-20 border-b" />
                      ))}

                      {/* Events */}
                      {dayEvents.map((event) => {
                        const startHour = event.startTime.getHours();
                        const startMinutes = event.startTime.getMinutes();
                        const endHour = event.endTime.getHours();
                        const endMinutes = event.endTime.getMinutes();
                        const top = (startHour - 8) * 80 + (startMinutes / 60) * 80;
                        const height =
                          (endHour - startHour) * 80 +
                          ((endMinutes - startMinutes) / 60) * 80;

                        const Icon = getEventIcon(event.type);

                        return (
                          <div
                            key={event.id}
                            className={cn(
                              "absolute left-1 right-1 rounded-lg border p-2 overflow-hidden cursor-pointer transition-transform hover:scale-[1.02] hover:z-10",
                              getEventColor(event.type)
                            )}
                            style={{ top: `${top}px`, height: `${height}px` }}
                          >
                            <div className="flex items-center gap-1 mb-1">
                              <Icon className="h-3 w-3" />
                              <span className="text-xs font-medium truncate">{event.title}</span>
                            </div>
                            <div className="text-[10px] opacity-80 truncate">
                              {event.startTime.getHours().toString().padStart(2, "0")}:
                              {event.startTime.getMinutes().toString().padStart(2, "0")} -{" "}
                              {event.endTime.getHours().toString().padStart(2, "0")}:
                              {event.endTime.getMinutes().toString().padStart(2, "0")}
                            </div>
                            <div className="text-[10px] opacity-80 truncate">{event.student}</div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <div className="space-y-4">
          {weekDays.map((day) => {
            const dayEvents = getEventsForDay(day);
            if (dayEvents.length === 0) return null;

            return (
              <Card key={day.toISOString()}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium">
                    {formatDate(day, { weekday: "long", day: "numeric", month: "long" })}
                    {isToday(day) && (
                      <Badge variant="default" className="ml-2">
                        Aujourd&apos;hui
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {dayEvents.map((event) => {
                      const Icon = getEventIcon(event.type);
                      const typeInfo = EVENT_TYPE_DISPLAY[event.type];

                      return (
                        <div
                          key={event.id}
                          className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <div
                            className={cn(
                              "flex h-10 w-10 items-center justify-center rounded-lg",
                              getEventColor(event.type)
                            )}
                          >
                            <Icon className="h-5 w-5" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{event.title}</span>
                              <Badge
                                variant={
                                  event.type.includes("QUANT")
                                    ? "quant"
                                    : event.type.includes("VERBAL")
                                    ? "verbal"
                                    : event.type.includes("MENTOR")
                                    ? "mentor"
                                    : "secondary"
                                }
                              >
                                {typeInfo?.label || event.type}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {event.startTime.getHours().toString().padStart(2, "0")}:
                                {event.startTime.getMinutes().toString().padStart(2, "0")} -{" "}
                                {event.endTime.getHours().toString().padStart(2, "0")}:
                                {event.endTime.getMinutes().toString().padStart(2, "0")}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {event.student}
                              </span>
                              <span>avec {event.instructor}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {event.meetingUrl && (
                              <Button size="sm" variant="secondary" asChild>
                                <a href={event.meetingUrl} target="_blank" rel="noopener noreferrer">
                                  <Video className="mr-1 h-3 w-3" />
                                  Rejoindre
                                </a>
                              </Button>
                            )}
                            <Button size="icon-sm" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
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

          {filteredEvents.length === 0 && (
            <div className="text-center py-12">
              <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucun événement cette semaine</p>
            </div>
          )}
        </div>
      )}

      {/* Day View */}
      {viewMode === "day" && (
        <Card>
          <CardHeader>
            <CardTitle>
              {formatDate(currentDate, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {getEventsForDay(currentDate).map((event) => {
                const Icon = getEventIcon(event.type);
                const typeInfo = EVENT_TYPE_DISPLAY[event.type];

                return (
                  <div
                    key={event.id}
                    className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-lg",
                        getEventColor(event.type)
                      )}
                    >
                      <Icon className="h-6 w-6" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-lg">{event.title}</span>
                        <Badge
                          variant={
                            event.type.includes("QUANT")
                              ? "quant"
                              : event.type.includes("VERBAL")
                              ? "verbal"
                              : event.type.includes("MENTOR")
                              ? "mentor"
                              : "secondary"
                          }
                        >
                          {typeInfo?.label || event.type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-6 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {event.startTime.getHours().toString().padStart(2, "0")}:
                          {event.startTime.getMinutes().toString().padStart(2, "0")} -{" "}
                          {event.endTime.getHours().toString().padStart(2, "0")}:
                          {event.endTime.getMinutes().toString().padStart(2, "0")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {event.student}
                        </span>
                        <span>Professeur: {event.instructor}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {event.meetingUrl && (
                        <Button variant="default" asChild>
                          <a href={event.meetingUrl} target="_blank" rel="noopener noreferrer">
                            <Video className="mr-2 h-4 w-4" />
                            Rejoindre la session
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}

              {getEventsForDay(currentDate).length === 0 && (
                <div className="text-center py-12">
                  <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Aucun événement ce jour</p>
                  <Button className="mt-4">
                    <Plus className="mr-2 h-4 w-4" />
                    Planifier un cours
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            {Object.entries(EVENT_TYPE_DISPLAY).map(([type, info]) => {
              const Icon = getEventIcon(type);
              return (
                <div key={type} className="flex items-center gap-2">
                  <div className={cn("flex h-6 w-6 items-center justify-center rounded", getEventColor(type))}>
                    <Icon className="h-3 w-3" />
                  </div>
                  <span className="text-sm text-muted-foreground">{info.label}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

