"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { FileIcon, ImageIcon, ExternalLink } from "lucide-react";

interface Message {
  id: string;
  content: string;
  attachmentUrl: string | null;
  createdAt: string;
  isOwn: boolean;
  createdBy: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    role: string | null;
  };
}

interface MessageBubbleProps {
  message: Message;
  showAvatar?: boolean;
  showName?: boolean;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getRoleColor(role: string | null): string {
  switch (role) {
    case "ADMIN":
      return "bg-purple-500";
    case "MENTOR":
      return "bg-performup-blue";
    case "PROFESSOR":
      return "bg-green-500";
    case "EXECUTIVE_CHEF":
      return "bg-orange-500";
    case "STUDENT":
      return "bg-performup-gold";
    default:
      return "bg-gray-500";
  }
}

function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
}

function getFileName(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    return pathname.split("/").pop() || "Fichier";
  } catch {
    return url.split("/").pop() || "Fichier";
  }
}

export function MessageBubble({ message, showAvatar = true, showName = true }: MessageBubbleProps) {
  const isOwn = message.isOwn;

  return (
    <div
      className={cn(
        "flex gap-2",
        isOwn ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      {showAvatar && !isOwn && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={message.createdBy.image || undefined} />
          <AvatarFallback
            className={cn("text-xs text-white", getRoleColor(message.createdBy.role))}
          >
            {getInitials(message.createdBy.name)}
          </AvatarFallback>
        </Avatar>
      )}
      {!showAvatar && !isOwn && <div className="w-8 flex-shrink-0" />}

      {/* Bubble */}
      <div
        className={cn(
          "max-w-[70%] rounded-2xl px-4 py-2",
          isOwn
            ? "rounded-br-md bg-performup-blue text-white"
            : "rounded-bl-md bg-muted"
        )}
      >
        {/* Sender name */}
        {showName && !isOwn && (
          <p className="mb-1 text-xs font-medium text-performup-blue">
            {message.createdBy.name}
          </p>
        )}

        {/* Attachment */}
        {message.attachmentUrl && (
          <div className="mb-2">
            {isImageUrl(message.attachmentUrl) ? (
              <a
                href={message.attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block overflow-hidden rounded-lg"
              >
                <img
                  src={message.attachmentUrl}
                  alt="Image jointe"
                  className="max-h-60 w-full object-cover transition-opacity hover:opacity-90"
                />
              </a>
            ) : (
              <a
                href={message.attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex items-center gap-2 rounded-lg p-2 transition-colors",
                  isOwn
                    ? "bg-white/10 hover:bg-white/20"
                    : "bg-background hover:bg-accent"
                )}
              >
                <FileIcon className="h-5 w-5" />
                <span className="flex-1 truncate text-sm">
                  {getFileName(message.attachmentUrl)}
                </span>
                <ExternalLink className="h-4 w-4 flex-shrink-0" />
              </a>
            )}
          </div>
        )}

        {/* Content */}
        {message.content && (
          <p className="whitespace-pre-wrap break-words text-sm">
            {message.content}
          </p>
        )}

        {/* Time */}
        <p
          className={cn(
            "mt-1 text-right text-[10px]",
            isOwn ? "text-white/70" : "text-muted-foreground"
          )}
        >
          {format(new Date(message.createdAt), "HH:mm", { locale: fr })}
        </p>
      </div>
    </div>
  );
}

interface DateSeparatorProps {
  date: string;
}

export function DateSeparator({ date }: DateSeparatorProps) {
  const dateObj = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let label: string;

  if (dateObj.toDateString() === today.toDateString()) {
    label = "Aujourd'hui";
  } else if (dateObj.toDateString() === yesterday.toDateString()) {
    label = "Hier";
  } else {
    label = format(dateObj, "d MMMM yyyy", { locale: fr });
  }

  return (
    <div className="flex items-center justify-center py-4">
      <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
        {label}
      </span>
    </div>
  );
}
