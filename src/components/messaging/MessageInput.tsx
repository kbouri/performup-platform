"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { Send, Paperclip, X, Image, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface MessageInputProps {
  onSend: (content: string, attachmentUrl?: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageInput({
  onSend,
  disabled = false,
  placeholder = "Écrivez un message...",
}: MessageInputProps) {
  const [content, setContent] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("Le fichier est trop volumineux (max 10MB)");
      return;
    }

    setAttachment(file);

    // Create preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setAttachmentPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setAttachmentPreview(null);
    }
  };

  const removeAttachment = () => {
    setAttachment(null);
    setAttachmentPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "messages");

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Erreur lors de l'upload du fichier");
    }

    const data = await response.json();
    return data.url;
  };

  const handleSend = async () => {
    if ((!content.trim() && !attachment) || disabled || isSending) return;

    setIsSending(true);

    try {
      let attachmentUrl: string | undefined;

      if (attachment) {
        setIsUploading(true);
        attachmentUrl = await uploadFile(attachment);
        setIsUploading(false);
      }

      await onSend(content.trim(), attachmentUrl);

      // Reset
      setContent("");
      removeAttachment();

      // Focus textarea
      textareaRef.current?.focus();
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Erreur lors de l'envoi du message");
    } finally {
      setIsSending(false);
      setIsUploading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isDisabled = disabled || isSending || isUploading;

  return (
    <div className="border-t border-border bg-card p-4">
      {/* Attachment Preview */}
      {attachment && (
        <div className="mb-3 flex items-center gap-3 rounded-lg bg-muted p-2">
          {attachmentPreview ? (
            <img
              src={attachmentPreview}
              alt="Preview"
              className="h-16 w-16 rounded object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded bg-background">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium">{attachment.name}</p>
            <p className="text-xs text-muted-foreground">
              {(attachment.size / 1024).toFixed(1)} KB
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={removeAttachment}
            disabled={isUploading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-end gap-2">
        {/* Attach Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={isDisabled}
          className="flex-shrink-0"
        >
          <Paperclip className="h-5 w-5" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
          className="hidden"
        />

        {/* Textarea */}
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isDisabled}
          rows={1}
          className={cn(
            "min-h-[44px] max-h-32 resize-none",
            "flex-1"
          )}
        />

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={isDisabled || (!content.trim() && !attachment)}
          className="flex-shrink-0"
        >
          {isSending || isUploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Helper text */}
      <p className="mt-2 text-xs text-muted-foreground">
        Appuyez sur Entrée pour envoyer, Maj+Entrée pour un saut de ligne
      </p>
    </div>
  );
}
