"use client";

import { useEffect, useRef } from "react";
import { ArrowLeft, Users, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageBubble, DateSeparator } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { cn } from "@/lib/utils";

interface Participant {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string | null;
}

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

interface ConversationDetailProps {
  conversationId: string;
  title: string;
  participants: Participant[];
  messages: Message[];
  onSendMessage: (content: string, attachmentUrl?: string) => Promise<void>;
  onBack?: () => void;
  isLoading?: boolean;
  isMobile?: boolean;
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

function getRoleLabel(role: string | null): string {
  switch (role) {
    case "ADMIN":
      return "Admin";
    case "MENTOR":
      return "Mentor";
    case "PROFESSOR":
      return "Professeur";
    case "EXECUTIVE_CHEF":
      return "Executive Chef";
    case "STUDENT":
      return "Étudiant";
    default:
      return "";
  }
}

function isSameDay(date1: string, date2: string): boolean {
  return new Date(date1).toDateString() === new Date(date2).toDateString();
}

export function ConversationDetail({
  conversationId,
  title,
  participants,
  messages,
  onSendMessage,
  onBack,
  isLoading,
  isMobile,
}: ConversationDetailProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Group messages by date and consecutive sender
  const groupedMessages: Array<{
    type: "date" | "message";
    date?: string;
    message?: Message;
    showAvatar?: boolean;
    showName?: boolean;
  }> = [];

  let lastDate = "";
  let lastSenderId = "";

  messages.forEach((message, index) => {
    const messageDate = new Date(message.createdAt).toDateString();

    // Add date separator if needed
    if (messageDate !== lastDate) {
      groupedMessages.push({ type: "date", date: message.createdAt });
      lastDate = messageDate;
      lastSenderId = "";
    }

    // Determine if we should show avatar and name
    const isConsecutive = message.createdBy.id === lastSenderId;
    const showAvatar = !isConsecutive;
    const showName = !isConsecutive && participants.length > 1;

    groupedMessages.push({
      type: "message",
      message,
      showAvatar,
      showName,
    });

    lastSenderId = message.createdBy.id;
  });

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        {isMobile && onBack && (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}

        {/* Avatar(s) */}
        {participants.length === 1 ? (
          <Avatar className="h-10 w-10">
            <AvatarImage src={participants[0].image || undefined} />
            <AvatarFallback
              className={cn("text-white", getRoleColor(participants[0].role))}
            >
              {getInitials(participants[0].name)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="relative h-10 w-10">
            <Avatar className="absolute left-0 top-0 h-7 w-7 border-2 border-card">
              <AvatarImage src={participants[0]?.image || undefined} />
              <AvatarFallback
                className={cn("text-xs text-white", getRoleColor(participants[0]?.role))}
              >
                {getInitials(participants[0]?.name || "?")}
              </AvatarFallback>
            </Avatar>
            <Avatar className="absolute bottom-0 right-0 h-7 w-7 border-2 border-card">
              <AvatarImage src={participants[1]?.image || undefined} />
              <AvatarFallback
                className={cn("text-xs text-white", getRoleColor(participants[1]?.role))}
              >
                {participants.length > 2
                  ? `+${participants.length - 1}`
                  : getInitials(participants[1]?.name || "?")}
              </AvatarFallback>
            </Avatar>
          </div>
        )}

        {/* Title and participants */}
        <div className="flex-1 min-w-0">
          <h3 className="truncate font-medium">{title}</h3>
          <p className="truncate text-xs text-muted-foreground">
            {participants.length === 1
              ? getRoleLabel(participants[0].role)
              : `${participants.length} participants`}
          </p>
        </div>

        {/* Actions */}
        {participants.length > 1 && (
          <Button variant="ghost" size="icon">
            <Users className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-performup-blue border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Commencez la conversation en envoyant un message
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {groupedMessages.map((item, index) =>
              item.type === "date" ? (
                <DateSeparator key={`date-${index}`} date={item.date!} />
              ) : (
                <MessageBubble
                  key={item.message!.id}
                  message={item.message!}
                  showAvatar={item.showAvatar}
                  showName={item.showName}
                />
              )
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <MessageInput onSend={onSendMessage} />
    </div>
  );
}
