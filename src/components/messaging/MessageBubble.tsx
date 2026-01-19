"use client";

import { useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { FileIcon, ExternalLink, Play, Pause, Volume2 } from "lucide-react";

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

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov|avi|mkv)$/i.test(url);
}

function isAudioUrl(url: string): boolean {
  return /\.(mp3|wav|ogg|webm|m4a|aac)$/i.test(url) || url.includes("vocal_");
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

// Audio Player Component
function AudioPlayer({ src, isOwn }: { src: string; isOwn: boolean }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg p-2 min-w-[200px]",
        isOwn ? "bg-white/10" : "bg-background"
      )}
    >
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />
      <Button
        variant="ghost"
        size="icon"
        onClick={togglePlay}
        className={cn(
          "h-10 w-10 rounded-full flex-shrink-0",
          isOwn
            ? "bg-white/20 hover:bg-white/30 text-white"
            : "bg-performup-blue text-white hover:bg-performup-blue/90"
        )}
      >
        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
      </Button>
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            "h-1 rounded-full overflow-hidden",
            isOwn ? "bg-white/20" : "bg-muted"
          )}
        >
          <div
            className={cn(
              "h-full transition-all",
              isOwn ? "bg-white" : "bg-performup-blue"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1">
          <Volume2 className={cn("h-3 w-3", isOwn ? "text-white/70" : "text-muted-foreground")} />
          <span className={cn("text-xs", isOwn ? "text-white/70" : "text-muted-foreground")}>
            {formatDuration(duration)}
          </span>
        </div>
      </div>
    </div>
  );
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
              /* Image */
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
            ) : isVideoUrl(message.attachmentUrl) ? (
              /* Video */
              <video
                src={message.attachmentUrl}
                controls
                className="max-h-60 w-full rounded-lg"
                playsInline
              />
            ) : isAudioUrl(message.attachmentUrl) ? (
              /* Audio / Voice Message */
              <AudioPlayer src={message.attachmentUrl} isOwn={isOwn} />
            ) : (
              /* Other files */
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
