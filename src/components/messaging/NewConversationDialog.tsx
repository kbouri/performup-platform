"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Loader2, Users, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface Contact {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string | null;
}

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateConversation: (participantIds: string[], message?: string) => Promise<void>;
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

export function NewConversationDialog({
  open,
  onOpenChange,
  onCreateConversation,
}: NewConversationDialogProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Fetch contacts when dialog opens
  useEffect(() => {
    if (open) {
      fetchContacts();
    } else {
      // Reset state when dialog closes
      setSelectedIds([]);
      setSearch("");
    }
  }, [open]);

  const fetchContacts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/messages/contacts");
      if (response.ok) {
        const data = await response.json();
        setContacts(data.contacts);
      }
    } catch (error) {
      console.error("Error fetching contacts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredContacts = contacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(search.toLowerCase()) ||
      contact.email.toLowerCase().includes(search.toLowerCase())
  );

  // Group contacts by role
  const groupedContacts = filteredContacts.reduce(
    (acc, contact) => {
      const role = contact.role || "OTHER";
      if (!acc[role]) {
        acc[role] = [];
      }
      acc[role].push(contact);
      return acc;
    },
    {} as Record<string, Contact[]>
  );

  const roleOrder = ["MENTOR", "PROFESSOR", "EXECUTIVE_CHEF", "ADMIN", "STUDENT", "OTHER"];

  const toggleContact = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    if (selectedIds.length === 0) return;

    setIsCreating(true);
    try {
      await onCreateConversation(selectedIds);
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating conversation:", error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Nouvelle conversation
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher un contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Selected count */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {selectedIds.length} participant{selectedIds.length > 1 ? "s" : ""}{" "}
              sélectionné{selectedIds.length > 1 ? "s" : ""}
            </span>
          </div>
        )}

        {/* Contacts list */}
        <ScrollArea className="h-[300px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="mb-2 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                {search ? "Aucun contact trouvé" : "Aucun contact disponible"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {roleOrder.map((role) => {
                const contactsInRole = groupedContacts[role];
                if (!contactsInRole || contactsInRole.length === 0) return null;

                return (
                  <div key={role}>
                    <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                      {getRoleLabel(role)}
                    </p>
                    <div className="space-y-1">
                      {contactsInRole.map((contact) => (
                        <button
                          key={contact.id}
                          onClick={() => toggleContact(contact.id)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-lg p-2 transition-colors",
                            "hover:bg-accent",
                            selectedIds.includes(contact.id) && "bg-accent"
                          )}
                        >
                          <Checkbox
                            checked={selectedIds.includes(contact.id)}
                            onCheckedChange={() => toggleContact(contact.id)}
                            className="pointer-events-none"
                          />
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={contact.image || undefined} />
                            <AvatarFallback
                              className={cn(
                                "text-white",
                                getRoleColor(contact.role)
                              )}
                            >
                              {getInitials(contact.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0 text-left">
                            <p className="truncate text-sm font-medium">
                              {contact.name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {contact.email}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleCreate}
            disabled={selectedIds.length === 0 || isCreating}
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Création...
              </>
            ) : (
              "Démarrer la conversation"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
