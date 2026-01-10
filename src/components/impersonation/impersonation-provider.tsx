"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";

interface ImpersonatedUser {
  id: string;
  email: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  image?: string | null;
}

interface ImpersonationState {
  isImpersonating: boolean;
  adminId: string | null;
  targetUser: ImpersonatedUser | null;
  sessionId: string | null;
}

interface ImpersonationContextValue extends ImpersonationState {
  startImpersonation: (userId: string) => Promise<boolean>;
  endImpersonation: () => Promise<void>;
  refreshStatus: () => Promise<void>;
}

const ImpersonationContext = createContext<ImpersonationContextValue | null>(
  null
);

export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  if (!context) {
    throw new Error(
      "useImpersonation must be used within an ImpersonationProvider"
    );
  }
  return context;
}

interface ImpersonationProviderProps {
  children: ReactNode;
}

export function ImpersonationProvider({
  children,
}: ImpersonationProviderProps) {
  const router = useRouter();
  const [state, setState] = useState<ImpersonationState>({
    isImpersonating: false,
    adminId: null,
    targetUser: null,
    sessionId: null,
  });

  const refreshStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/impersonate/status");
      if (response.ok) {
        const data = await response.json();
        setState({
          isImpersonating: data.isImpersonating,
          adminId: data.adminId || null,
          targetUser: data.targetUser || null,
          sessionId: data.sessionId || null,
        });
      } else {
        setState({
          isImpersonating: false,
          adminId: null,
          targetUser: null,
          sessionId: null,
        });
      }
    } catch (error) {
      console.error("Error checking impersonation status:", error);
      setState({
        isImpersonating: false,
        adminId: null,
        targetUser: null,
        sessionId: null,
      });
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const startImpersonation = useCallback(
    async (userId: string): Promise<boolean> => {
      try {
        const response = await fetch("/api/admin/impersonate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ targetUserId: userId }),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error("Failed to start impersonation:", error);
          return false;
        }

        const data = await response.json();
        setState({
          isImpersonating: true,
          adminId: data.adminId,
          targetUser: data.targetUser,
          sessionId: data.sessionId,
        });

        // Redirect to appropriate dashboard based on role
        const roleRoutes: Record<string, string> = {
          STUDENT: "/student",
          MENTOR: "/mentor",
          PROFESSOR: "/professor",
          EXECUTIVE_CHEF: "/executive-chef",
        };

        const redirectPath = roleRoutes[data.targetUser.role] || "/";
        router.push(redirectPath);

        return true;
      } catch (error) {
        console.error("Error starting impersonation:", error);
        return false;
      }
    },
    [router]
  );

  const endImpersonation = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/impersonate/end", {
        method: "POST",
      });

      if (response.ok) {
        setState({
          isImpersonating: false,
          adminId: null,
          targetUser: null,
          sessionId: null,
        });

        // Redirect back to admin team page
        router.push("/admin/team");
      }
    } catch (error) {
      console.error("Error ending impersonation:", error);
    }
  }, [router]);

  const value: ImpersonationContextValue = {
    ...state,
    startImpersonation,
    endImpersonation,
    refreshStatus,
  };

  return (
    <ImpersonationContext.Provider value={value}>
      {children}
    </ImpersonationContext.Provider>
  );
}
