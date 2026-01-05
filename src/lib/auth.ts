import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./db/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Can be enabled in production
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update session age every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "STUDENT",
      },
      firstName: {
        type: "string",
        required: false,
      },
      lastName: {
        type: "string",
        required: false,
      },
      phone: {
        type: "string",
        required: false,
      },
      active: {
        type: "boolean",
        required: false,
        defaultValue: true,
      },
    },
  },
  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ],
});

// Export types for session
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;

// Role types
export type UserRole = "ADMIN" | "EXECUTIVE_CHEF" | "MENTOR" | "PROFESSOR" | "STUDENT";

// Helper type for role checking
type UserWithRole = { role?: string | null };

// Permission check helpers
export const isAdmin = (user: UserWithRole | null | undefined): boolean => {
  return user?.role === "ADMIN";
};

export const isExecutiveChef = (user: UserWithRole | null | undefined): boolean => {
  return user?.role === "EXECUTIVE_CHEF";
};

export const isMentor = (user: UserWithRole | null | undefined): boolean => {
  return user?.role === "MENTOR";
};

export const isProfessor = (user: UserWithRole | null | undefined): boolean => {
  return user?.role === "PROFESSOR";
};

export const isStudent = (user: UserWithRole | null | undefined): boolean => {
  return user?.role === "STUDENT";
};

// Check if user can access student data
export const canAccessStudent = (user: UserWithRole | null | undefined): boolean => {
  if (!user || !user.role) return false;
  return ["ADMIN", "EXECUTIVE_CHEF", "MENTOR", "PROFESSOR"].includes(user.role);
};

// Check if user can manage students
export const canManageStudents = (user: UserWithRole | null | undefined): boolean => {
  if (!user || !user.role) return false;
  return ["ADMIN", "MENTOR"].includes(user.role);
};

// Check if user can access accounting
export const canAccessAccounting = (user: UserWithRole | null | undefined): boolean => {
  if (!user) return false;
  return user.role === "ADMIN";
};

// Check if user can manage packs
export const canManagePacks = (user: UserWithRole | null | undefined): boolean => {
  if (!user) return false;
  return user.role === "ADMIN";
};

// Check if user can create events
export const canCreateEvents = (user: UserWithRole | null | undefined): boolean => {
  if (!user || !user.role) return false;
  return ["ADMIN", "MENTOR", "PROFESSOR"].includes(user.role);
};

