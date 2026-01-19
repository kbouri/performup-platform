"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, Check, CheckCheck, Trash2, MessageSquare, ClipboardList, Calendar, FileText, GraduationCap, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  read: boolean;
  createdAt: string;
}

const typeIcons: Record<string, React.ElementType> = {
  NEW_MESSAGE: MessageSquare,
  TASK_ASSIGNED: ClipboardList,
  TASK_DUE: ClipboardList,
  TASK_COMPLETED: ClipboardList,
  COURSE_REMINDER: Calendar,
  EVENT_INVITATION: Calendar,
  EVENT_REMINDER: Calendar,
  DOCUMENT_SHARED: FileText,
  ESSAY_FEEDBACK: FileText,
  ESSAY_SUBMITTED: FileText,
  PAYMENT_RECEIVED: Wallet,
  PAYMENT_DUE: Wallet,
  SCORE_ADDED: GraduationCap,
  SCHOOL_APPLICATION: GraduationCap,
  GENERAL: Bell,
};

const typeColors: Record<string, string> = {
  NEW_MESSAGE: "text-blue-500",
  TASK_ASSIGNED: "text-orange-500",
  TASK_DUE: "text-red-500",
  TASK_COMPLETED: "text-green-500",
  COURSE_REMINDER: "text-purple-500",
  EVENT_INVITATION: "text-indigo-500",
  EVENT_REMINDER: "text-indigo-500",
  DOCUMENT_SHARED: "text-cyan-500",
  ESSAY_FEEDBACK: "text-yellow-500",
  ESSAY_SUBMITTED: "text-yellow-500",
  PAYMENT_RECEIVED: "text-emerald-500",
  PAYMENT_DUE: "text-red-500",
  SCORE_ADDED: "text-performup-gold",
  SCHOOL_APPLICATION: "text-performup-blue",
  GENERAL: "text-gray-500",
};

function getNotificationLink(notification: Notification): string | null {
  const data = notification.data as Record<string, string> | null;
  if (!data) return null;
  
  switch (notification.type) {
    case "NEW_MESSAGE":
      return data.conversationId ? `/messages?id=${data.conversationId}` : "/messages";
    case "TASK_ASSIGNED":
    case "TASK_DUE":
    case "TASK_COMPLETED":
      return "/tasks";
    case "COURSE_REMINDER":
    case "EVENT_INVITATION":
    case "EVENT_REMINDER":
      return "/planning";
    case "DOCUMENT_SHARED":
      return "/documents";
    case "ESSAY_FEEDBACK":
    case "ESSAY_SUBMITTED":
      return data.essayId ? `/essays/${data.essayId}` : "/essays";
    case "PAYMENT_RECEIVED":
    case "PAYMENT_DUE":
      return "/student/accounting";
    case "SCORE_ADDED":
      return "/tests";
    case "SCHOOL_APPLICATION":
      return "/schools";
    default:
      return null;
  }
}

export function NotificationDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications?limit=20");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  }, []);

  // Initial fetch and polling
  useEffect(() => {
    fetchNotifications();
    
    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Fetch when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // Mark single notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds: [notificationId] }),
      });
      
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications?id=${notificationId}`, {
        method: "DELETE",
      });
      
      const notification = notifications.find((n) => n.id === notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      if (notification && !notification.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-error text-[10px] font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-auto py-1 px-2 text-xs text-performup-blue hover:text-performup-blue/80"
            >
              <CheckCheck className="mr-1 h-3 w-3" />
              Tout marquer comme lu
            </Button>
          )}
        </div>

        {/* Notifications list */}
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="mb-2 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Aucune notification</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const Icon = typeIcons[notification.type] || Bell;
                const iconColor = typeColors[notification.type] || "text-gray-500";
                const link = getNotificationLink(notification);

                const content = (
                  <div
                    className={cn(
                      "flex gap-3 p-4 hover:bg-muted/50 transition-colors cursor-pointer",
                      !notification.read && "bg-performup-blue/5"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    {/* Icon */}
                    <div className={cn("mt-0.5 flex-shrink-0", iconColor)}>
                      <Icon className="h-5 w-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm", !notification.read && "font-medium")}>
                        {notification.title.replace(/^[^ ]+ /, "")}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          title="Marquer comme lu"
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-error"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        title="Supprimer"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );

                if (link) {
                  return (
                    <Link key={notification.id} href={link} onClick={() => setIsOpen(false)}>
                      {content}
                    </Link>
                  );
                }

                return <div key={notification.id}>{content}</div>;
              })}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
