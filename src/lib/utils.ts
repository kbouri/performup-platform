import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency in euros (cents to euros)
 */
export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

/**
 * Format date in French locale
 */
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...options,
  }).format(d);
}

/**
 * Format time in French locale
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/**
 * Format relative time (e.g., "il y a 2 heures")
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return "À l'instant";
  } else if (diffMins < 60) {
    return `Il y a ${diffMins} minute${diffMins > 1 ? "s" : ""}`;
  } else if (diffHours < 24) {
    return `Il y a ${diffHours} heure${diffHours > 1 ? "s" : ""}`;
  } else if (diffDays < 7) {
    return `Il y a ${diffDays} jour${diffDays > 1 ? "s" : ""}`;
  } else {
    return formatDate(d);
  }
}

/**
 * Get encouraging message based on progress
 */
export function getEncouragingMessage(progress: number): string {
  if (progress >= 100) {
    return "Excellent travail !";
  } else if (progress >= 80) {
    return "Presque fini !";
  } else if (progress >= 60) {
    return "Tu progresses bien !";
  } else if (progress >= 40) {
    return "En bonne voie";
  } else if (progress >= 20) {
    return "Continue comme ça !";
  } else {
    return "C'est parti !";
  }
}

/**
 * Generate initials from name
 */
export function getInitials(name: string | null | undefined): string {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Generate random color based on string (for avatars)
 */
export function getColorFromString(str: string): string {
  const colors = [
    "bg-performup-blue",
    "bg-performup-gold",
    "bg-calendar-quant",
    "bg-calendar-verbal",
    "bg-calendar-mentor",
    "bg-calendar-oral",
  ];
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Slugify string
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Capitalize first letter
 */
export function capitalize(text: string): string {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || "";
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number | bigint): string {
  const b = typeof bytes === "bigint" ? Number(bytes) : bytes;
  const units = ["B", "KB", "MB", "GB", "TB"];
  let unitIndex = 0;
  let size = b;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

/**
 * Check if email is valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Generate secure random password
 */
export function generateSecurePassword(length: number = 16): string {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);
  
  for (let i = 0; i < length; i++) {
    password += charset[randomValues[i] % charset.length];
  }
  
  return password;
}

/**
 * Generate unique ID
 */
export function generateId(prefix?: string): string {
  const random = Math.random().toString(36).substring(2, 9);
  const timestamp = Date.now().toString(36);
  return prefix ? `${prefix}_${timestamp}${random}` : `${timestamp}${random}`;
}

/**
 * Role display names
 */
export const ROLE_DISPLAY_NAMES: Record<string, string> = {
  ADMIN: "Administrateur",
  EXECUTIVE_CHEF: "Chef Exécutif",
  MENTOR: "Mentor",
  PROFESSOR: "Professeur",
  STUDENT: "Étudiant",
};

/**
 * Get role display name
 */
export function getRoleDisplayName(role: string): string {
  return ROLE_DISPLAY_NAMES[role] || role;
}

/**
 * Status display names for students
 */
export const STUDENT_STATUS_DISPLAY: Record<string, { label: string; variant: "success" | "warning" | "error" | "neutral" }> = {
  EN_DEMARRAGE: { label: "En démarrage", variant: "neutral" },
  EN_COURS: { label: "En cours", variant: "success" },
  FINALISE: { label: "Finalisé", variant: "success" },
  SUSPENDU: { label: "Suspendu", variant: "error" },
  EN_PAUSE: { label: "En pause", variant: "warning" },
};

/**
 * Event type display names
 */
export const EVENT_TYPE_DISPLAY: Record<string, { label: string; color: string }> = {
  COURS_QUANT: { label: "Cours Quant", color: "calendar-quant" },
  COURS_VERBAL: { label: "Cours Verbal", color: "calendar-verbal" },
  SESSION_MENTOR: { label: "Session Mentor", color: "calendar-mentor" },
  TEST_BLANC: { label: "Test Blanc", color: "calendar-test" },
  SIMULATION_ORAL: { label: "Simulation Oral", color: "calendar-oral" },
};

/**
 * Task category display names
 */
export const TASK_CATEGORY_DISPLAY: Record<string, string> = {
  QUANT: "Quantitative",
  VERBAL: "Verbal",
  ESSAY: "Essay",
  CV: "CV",
  ORAL: "Oral",
  GENERAL: "Général",
};

