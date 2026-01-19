"use client";

import { useState, useRef, KeyboardEvent, useEffect } from "react";
import { Send, Paperclip, X, FileText, Loader2, Camera, Video, Mic, Square, Play, Pause } from "lucide-react";
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
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl);
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [audioPreviewUrl]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 50MB for videos, 10MB for others)
    const maxSize = file.type.startsWith("video/") ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`Le fichier est trop volumineux (max ${file.type.startsWith("video/") ? "50" : "10"}MB)`);
      return;
    }

    // Clear any audio recording
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
      setAudioPreviewUrl(null);
    }

    setAttachment(file);

    // Create preview for images and videos
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setAttachmentPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else if (file.type.startsWith("video/")) {
      const url = URL.createObjectURL(file);
      setAttachmentPreview(url);
    } else {
      setAttachmentPreview(null);
    }
  };

  // Start voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioFile = new File([audioBlob], `vocal_${Date.now()}.webm`, { type: "audio/webm" });
        const audioUrl = URL.createObjectURL(audioBlob);

        setAttachment(audioFile);
        setAudioPreviewUrl(audioUrl);
        setAttachmentPreview(null);

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Impossible d'accéder au microphone");
    }
  };

  // Stop voice recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  // Toggle audio playback
  const toggleAudioPlayback = () => {
    if (!audioRef.current && audioPreviewUrl) {
      audioRef.current = new Audio(audioPreviewUrl);
      audioRef.current.onended = () => setIsPlayingAudio(false);
    }

    if (audioRef.current) {
      if (isPlayingAudio) {
        audioRef.current.pause();
        setIsPlayingAudio(false);
      } else {
        audioRef.current.play();
        setIsPlayingAudio(true);
      }
    }
  };

  // Format recording time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const removeAttachment = () => {
    setAttachment(null);
    setAttachmentPreview(null);
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
      setAudioPreviewUrl(null);
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsPlayingAudio(false);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = "";
    }
    if (videoInputRef.current) {
      videoInputRef.current.value = "";
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
      {/* Recording Indicator */}
      {isRecording && (
        <div className="mb-3 flex items-center gap-3 rounded-lg bg-red-50 dark:bg-red-900/20 p-3 border border-red-200 dark:border-red-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 animate-pulse">
            <Mic className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-700 dark:text-red-300">Enregistrement en cours...</p>
            <p className="text-lg font-mono text-red-600 dark:text-red-400">{formatTime(recordingTime)}</p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={stopRecording}
            className="flex items-center gap-2"
          >
            <Square className="h-4 w-4" />
            Arrêter
          </Button>
        </div>
      )}

      {/* Attachment Preview */}
      {attachment && !isRecording && (
        <div className="mb-3 flex items-center gap-3 rounded-lg bg-muted p-2">
          {/* Image Preview */}
          {attachmentPreview && attachment.type.startsWith("image/") && (
            <img
              src={attachmentPreview}
              alt="Preview"
              className="h-16 w-16 rounded object-cover"
            />
          )}

          {/* Video Preview */}
          {attachmentPreview && attachment.type.startsWith("video/") && (
            <video
              src={attachmentPreview}
              className="h-16 w-24 rounded object-cover"
              muted
            />
          )}

          {/* Audio Preview */}
          {audioPreviewUrl && (
            <div className="flex h-16 items-center gap-2 rounded bg-background px-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleAudioPlayback}
                className="h-10 w-10 rounded-full bg-performup-blue text-white hover:bg-performup-blue/90"
              >
                {isPlayingAudio ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5 ml-0.5" />
                )}
              </Button>
              <div className="flex flex-col">
                <span className="text-sm font-medium">Message vocal</span>
                <span className="text-xs text-muted-foreground">{formatTime(recordingTime)}</span>
              </div>
            </div>
          )}

          {/* File Preview (non-image, non-video, non-audio) */}
          {!attachmentPreview && !audioPreviewUrl && (
            <div className="flex h-16 w-16 items-center justify-center rounded bg-background">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium">{attachment.name}</p>
            <p className="text-xs text-muted-foreground">
              {attachment.size > 1024 * 1024
                ? `${(attachment.size / (1024 * 1024)).toFixed(1)} MB`
                : `${(attachment.size / 1024).toFixed(1)} KB`}
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
      <div className="flex items-end gap-1 sm:gap-2">
        {/* File Attach Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={isDisabled || isRecording}
          className="flex-shrink-0 h-10 w-10"
          title="Joindre un fichier"
        >
          <Paperclip className="h-5 w-5" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
          className="hidden"
        />

        {/* Camera Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => cameraInputRef.current?.click()}
          disabled={isDisabled || isRecording}
          className="flex-shrink-0 h-10 w-10"
          title="Prendre une photo"
        >
          <Camera className="h-5 w-5" />
        </Button>
        <input
          ref={cameraInputRef}
          type="file"
          onChange={handleFileSelect}
          accept="image/*"
          capture="environment"
          className="hidden"
        />

        {/* Video Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => videoInputRef.current?.click()}
          disabled={isDisabled || isRecording}
          className="flex-shrink-0 h-10 w-10"
          title="Enregistrer une vidéo"
        >
          <Video className="h-5 w-5" />
        </Button>
        <input
          ref={videoInputRef}
          type="file"
          onChange={handleFileSelect}
          accept="video/*"
          capture="environment"
          className="hidden"
        />

        {/* Textarea */}
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isRecording ? "Enregistrement vocal..." : placeholder}
          disabled={isDisabled || isRecording}
          rows={1}
          className={cn(
            "min-h-[44px] max-h-32 resize-none",
            "flex-1"
          )}
        />

        {/* Voice Record Button */}
        {!isRecording && !attachment && !content.trim() ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={startRecording}
            disabled={isDisabled}
            className="flex-shrink-0 h-10 w-10 text-performup-blue hover:text-performup-blue/80"
            title="Message vocal"
          >
            <Mic className="h-5 w-5" />
          </Button>
        ) : (
          /* Send Button */
          <Button
            onClick={handleSend}
            disabled={isDisabled || isRecording || (!content.trim() && !attachment)}
            className="flex-shrink-0 h-10 px-4"
          >
            {isSending || isUploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        )}
      </div>

      {/* Helper text */}
      <p className="mt-2 text-xs text-muted-foreground">
        {isRecording
          ? "Cliquez sur Arrêter pour terminer l'enregistrement"
          : "📎 Fichier · 📷 Photo · 🎬 Vidéo · 🎤 Vocal"}
      </p>
    </div>
  );
}
