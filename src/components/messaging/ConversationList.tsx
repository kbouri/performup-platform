"use client";

import { useState } from "react";
import { Search, Plus, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface Participant {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string | null;
}

interface Conversation {
  id: string;
  title: string;
  participants: Participant[];
  lastMessage: {
    id: string;
    content: string;
    createdAt: string;
    createdBy: { id: string; name: string };
    isOwn: boolean;
  } | null;
  unreadCount: number;
  updatedAt: string;
}

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNewConversation: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  isLoading?: boolean;
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

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  onNewConversation,
  search,
  onSearchChange,
  isLoading,
}: ConversationListProps) {
  return (
    <div className="flex h-full flex-col border-r border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-4">
        <h2 className="font-display text-lg font-semibold">Messages</h2>
        <Button size="sm" onClick={onNewConversation}>
          <Plus className="mr-1 h-4 w-4" />
          Nouveau
        </Button>
      </div>

      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-performup-blue border-t-transparent" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="mb-3 h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {search ? "Aucune conversation trouvée" : "Aucune conversation"}
            </p>
            <Button
              variant="link"
              size="sm"
              onClick={onNewConversation}
              className="mt-2"
            >
              Démarrer une conversation
            </Button>
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => onSelect(conversation.id)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors",
                  "hover:bg-accent",
                  selectedId === conversation.id && "bg-accent"
                )}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {conversation.participants.length === 1 ? (
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={conversation.participants[0].image || undefined} />
                      <AvatarFallback
                        className={cn(
                          "text-white",
                          getRoleColor(conversation.participants[0].role)
                        )}
                      >
                        {getInitials(conversation.participants[0].name)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="relative h-12 w-12">
                      <Avatar className="absolute left-0 top-0 h-8 w-8 border-2 border-card">
                        <AvatarImage src={conversation.participants[0]?.image || undefined} />
                        <AvatarFallback
                          className={cn(
                            "text-xs text-white",
                            getRoleColor(conversation.participants[0]?.role)
                          )}
                        >
                          {getInitials(conversation.participants[0]?.name || "?")}
                        </AvatarFallback>
                      </Avatar>
                      <Avatar className="absolute bottom-0 right-0 h-8 w-8 border-2 border-card">
                        <AvatarImage src={conversation.participants[1]?.image || undefined} />
                        <AvatarFallback
                          className={cn(
                            "text-xs text-white",
                            getRoleColor(conversation.participants[1]?.role)
                          )}
                        >
                          {conversation.participants.length > 2
                            ? `+${conversation.participants.length - 1}`
                            : getInitials(conversation.participants[1]?.name || "?")}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  )}
                  {conversation.unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-performup-blue text-[10px] font-bold text-white">
                      {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={cn(
                        "truncate text-sm font-medium",
                        conversation.unreadCount > 0 && "font-semibold"
                      )}
                    >
                      {conversation.title}
                    </p>
                    {conversation.lastMessage && (
                      <span className="flex-shrink-0 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(conversation.lastMessage.createdAt), {
                          addSuffix: false,
                          locale: fr,
                        })}
                      </span>
                    )}
                  </div>
                  {conversation.lastMessage && (
                    <p
                      className={cn(
                        "mt-0.5 truncate text-sm text-muted-foreground",
                        conversation.unreadCount > 0 && "font-medium text-foreground"
                      )}
                    >
                      {conversation.lastMessage.isOwn && "Vous: "}
                      {conversation.lastMessage.content}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
