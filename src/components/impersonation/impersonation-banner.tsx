"use client";

import { AlertTriangle, Eye, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useImpersonation } from "./impersonation-provider";

export function ImpersonationBanner() {
  const { isImpersonating, targetUser, endImpersonation } = useImpersonation();

  if (!isImpersonating || !targetUser) {
    return null;
  }

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      STUDENT: "Etudiant",
      MENTOR: "Mentor",
      PROFESSOR: "Professeur",
      EXECUTIVE_CHEF: "Chef Executif",
    };
    return labels[role] || role;
  };

  const userName =
    targetUser.firstName && targetUser.lastName
      ? `${targetUser.firstName} ${targetUser.lastName}`
      : targetUser.name || targetUser.email;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-950 shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full bg-amber-600/30 px-3 py-1">
              <Eye className="h-4 w-4" />
              <span className="text-sm font-medium">Mode visualisation</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">
                Vous visualisez l&apos;espace de{" "}
                <strong className="font-semibold">{userName}</strong>
                <span className="ml-1 text-amber-800">
                  ({getRoleLabel(targetUser.role)})
                </span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-amber-800">
              {targetUser.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={endImpersonation}
              className="h-8 gap-2 bg-amber-600/30 text-amber-950 hover:bg-amber-600/50 hover:text-amber-950"
            >
              <LogOut className="h-4 w-4" />
              <span>Quitter</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ImpersonationBannerSpacer() {
  const { isImpersonating } = useImpersonation();

  if (!isImpersonating) {
    return null;
  }

  // Add spacing to push content below the fixed banner
  return <div className="h-12" />;
}
