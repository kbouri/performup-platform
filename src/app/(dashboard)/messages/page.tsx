"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { ConversationList } from "@/components/messaging/ConversationList";
import { ConversationDetail } from "@/components/messaging/ConversationDetail";
import { NewConversationDialog } from "@/components/messaging/NewConversationDialog";
import { cn } from "@/lib/utils";

interface Participant {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string | null;
}

interface ConversationListItem {
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

interface ConversationDetail {
  id: string;
  title: string;
  participants: Participant[];
  studentId: string | null;
}

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationId = searchParams.get("id");

  // State
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [search, setSearch] = useState("");
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);

      const response = await fetch(`/api/messages?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setIsLoadingList(false);
    }
  }, [search]);

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(async (convId: string) => {
    setIsLoadingMessages(true);
    try {
      const response = await fetch(`/api/messages/${convId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedConversation(data.conversation);
        setMessages(data.messages);

        // Mark as read
        await fetch(`/api/messages/${convId}/read`, { method: "PATCH" });

        // Update unread count in list
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c))
        );
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Fetch messages when conversation is selected
  useEffect(() => {
    if (conversationId) {
      fetchMessages(conversationId);
    } else {
      setSelectedConversation(null);
      setMessages([]);
    }
  }, [conversationId, fetchMessages]);

  // Poll for new messages every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations();
      if (conversationId) {
        fetchMessages(conversationId);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [conversationId, fetchConversations, fetchMessages]);

  // Handle conversation selection
  const handleSelectConversation = (id: string) => {
    router.push(`/messages?id=${id}`);
  };

  // Handle back (mobile)
  const handleBack = () => {
    router.push("/messages");
  };

  // Handle send message
  const handleSendMessage = async (content: string, attachmentUrl?: string) => {
    if (!conversationId) return;

    try {
      const response = await fetch(`/api/messages/${conversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, attachmentUrl }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessages((prev) => [...prev, data.message]);

        // Update conversation list
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  lastMessage: {
                    id: data.message.id,
                    content: data.message.content,
                    createdAt: data.message.createdAt,
                    createdBy: data.message.createdBy,
                    isOwn: true,
                  },
                  updatedAt: data.message.createdAt,
                }
              : c
          )
        );
      }
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  };

  // Handle create conversation
  const handleCreateConversation = async (participantIds: string[]) => {
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantIds }),
      });

      if (response.ok) {
        const data = await response.json();
        await fetchConversations();
        router.push(`/messages?id=${data.conversation.id}`);
      }
    } catch (error) {
      console.error("Error creating conversation:", error);
      throw error;
    }
  };

  // Mobile: show either list or detail
  if (isMobile) {
    if (conversationId && selectedConversation) {
      return (
        <div className="h-[calc(100vh-4rem)]">
          <ConversationDetail
            conversationId={conversationId}
            title={selectedConversation.title}
            participants={selectedConversation.participants}
            messages={messages}
            onSendMessage={handleSendMessage}
            onBack={handleBack}
            isLoading={isLoadingMessages}
            isMobile={true}
          />
        </div>
      );
    }

    return (
      <div className="h-[calc(100vh-4rem)]">
        <ConversationList
          conversations={conversations}
          selectedId={null}
          onSelect={handleSelectConversation}
          onNewConversation={() => setShowNewDialog(true)}
          search={search}
          onSearchChange={setSearch}
          isLoading={isLoadingList}
        />
        <NewConversationDialog
          open={showNewDialog}
          onOpenChange={setShowNewDialog}
          onCreateConversation={handleCreateConversation}
        />
      </div>
    );
  }

  // Desktop: side by side
  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden rounded-lg border border-border bg-card shadow-performup-sm">
      {/* Conversation List - 30% */}
      <div className="w-[350px] flex-shrink-0">
        <ConversationList
          conversations={conversations}
          selectedId={conversationId}
          onSelect={handleSelectConversation}
          onNewConversation={() => setShowNewDialog(true)}
          search={search}
          onSearchChange={setSearch}
          isLoading={isLoadingList}
        />
      </div>

      {/* Conversation Detail - 70% */}
      <div className="flex-1">
        {conversationId && selectedConversation ? (
          <ConversationDetail
            conversationId={conversationId}
            title={selectedConversation.title}
            participants={selectedConversation.participants}
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoadingMessages}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center bg-muted/30">
            <div className="mb-4 rounded-full bg-muted p-6">
              <MessageSquare className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-medium">Vos messages</h3>
            <p className="mb-4 text-center text-sm text-muted-foreground">
              Sélectionnez une conversation ou démarrez-en une nouvelle
            </p>
          </div>
        )}
      </div>

      {/* New Conversation Dialog */}
      <NewConversationDialog
        open={showNewDialog}
        onOpenChange={setShowNewDialog}
        onCreateConversation={handleCreateConversation}
      />
    </div>
  );
}
