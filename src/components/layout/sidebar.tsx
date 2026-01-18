"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronLeft,
  LayoutDashboard,
  Users,
  Users2,
  Calendar,
  FileText,
  PenTool,
  GraduationCap,
  Wallet,
  Settings,
  BookOpen,
  FolderOpen,
  Package,
  Building2,
  ClipboardList,
  MessageSquare,
  BarChart3,
} from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
  roles?: string[];
}

const adminNavItems: NavItem[] = [
  {
    title: "Tableau de bord",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Etudiants",
    href: "/students",
    icon: Users,
    roles: ["ADMIN", "EXECUTIVE_CHEF", "MENTOR"],
  },
  {
    title: "Equipe",
    href: "/admin/team",
    icon: Users2,
    roles: ["ADMIN"],
  },
  {
    title: "Planning",
    href: "/planning",
    icon: Calendar,
  },
  {
    title: "Documents",
    href: "/documents",
    icon: FolderOpen,
  },
  {
    title: "Essays",
    href: "/essays",
    icon: PenTool,
    roles: ["ADMIN", "MENTOR", "STUDENT"],
  },
  {
    title: "Écoles",
    href: "/schools",
    icon: Building2,
    roles: ["ADMIN"],
  },
  {
    title: "Packs",
    href: "/packs",
    icon: Package,
    roles: ["ADMIN"],
  },
  {
    title: "Bibliothèque",
    href: "/library",
    icon: BookOpen,
    roles: ["ADMIN"],
  },
  {
    title: "Tâches",
    href: "/tasks",
    icon: ClipboardList,
    roles: ["ADMIN", "MENTOR"],
  },
  {
    title: "Comptabilité",
    href: "/admin/accounting",
    icon: Wallet,
    roles: ["ADMIN"],
  },
  {
    title: "Statistiques",
    href: "/stats",
    icon: BarChart3,
    roles: ["ADMIN"],
  },
  {
    title: "Messages",
    href: "/messages",
    icon: MessageSquare,
  },
];

const mentorNavItems: NavItem[] = [
  {
    title: "Tableau de bord",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Mes étudiants",
    href: "/students",
    icon: Users,
  },
  {
    title: "Planning",
    href: "/planning",
    icon: Calendar,
  },
  {
    title: "Documents",
    href: "/documents",
    icon: FolderOpen,
  },
  {
    title: "Essays",
    href: "/essays",
    icon: PenTool,
  },
  {
    title: "Tâches",
    href: "/tasks",
    icon: ClipboardList,
  },
  {
    title: "Comptabilité",
    href: "/mentor/accounting",
    icon: Wallet,
  },
  {
    title: "Messages",
    href: "/messages",
    icon: MessageSquare,
    badge: 3,
  },
];

const professorNavItems: NavItem[] = [
  {
    title: "Tableau de bord",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Planning",
    href: "/planning",
    icon: Calendar,
  },
  {
    title: "Mes étudiants",
    href: "/students",
    icon: Users,
  },
  {
    title: "Ressources",
    href: "/resources",
    icon: BookOpen,
  },
  {
    title: "Tâches",
    href: "/tasks",
    icon: ClipboardList,
  },
  {
    title: "Comptabilité",
    href: "/professor/accounting",
    icon: Wallet,
  },
  {
    title: "Messages",
    href: "/messages",
    icon: MessageSquare,
  },
];

const studentNavItems: NavItem[] = [
  {
    title: "Tableau de bord",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Planning",
    href: "/planning",
    icon: Calendar,
  },
  {
    title: "Documents",
    href: "/documents",
    icon: FolderOpen,
  },
  {
    title: "Essays",
    href: "/essays",
    icon: PenTool,
  },
  {
    title: "Mes écoles",
    href: "/schools",
    icon: GraduationCap,
  },
  {
    title: "Tâches",
    href: "/tasks",
    icon: ClipboardList,
  },
  {
    title: "Comptabilité",
    href: "/student/accounting",
    icon: Wallet,
  },
  {
    title: "Tests",
    href: "/tests",
    icon: FileText,
  },
  {
    title: "Messages",
    href: "/messages",
    icon: MessageSquare,
    badge: 2,
  },
];

interface SidebarProps {
  userRole?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ userRole = "STUDENT", isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Get nav items based on role
  const getNavItems = (): NavItem[] => {
    switch (userRole) {
      case "ADMIN":
        return adminNavItems;
      case "EXECUTIVE_CHEF":
        return adminNavItems.filter(item => 
          !item.roles || item.roles.includes("EXECUTIVE_CHEF")
        );
      case "MENTOR":
        return mentorNavItems;
      case "PROFESSOR":
        return professorNavItems;
      case "STUDENT":
      default:
        return studentNavItems;
    }
  };

  const navItems = getNavItems();

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen flex-col border-r bg-card transition-all duration-300",
          collapsed ? "w-16" : "w-64",
          // Mobile: slide in/out
          "lg:relative",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          <Logo showText={!collapsed} size={collapsed ? "sm" : "default"} />
          <Button
            variant="ghost"
            size="icon-sm"
            className={cn("hidden lg:flex", collapsed && "rotate-180")}
            onClick={() => setCollapsed(!collapsed)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;

              const linkContent = (
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                    isActive
                      ? "bg-performup-blue text-white shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 shrink-0 transition-colors",
                      isActive ? "text-white" : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  {!collapsed && (
                    <>
                      <span className="flex-1">{item.title}</span>
                      {item.badge && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-error text-[10px] font-bold text-white">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              );

              if (collapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                    <TooltipContent side="right" className="flex items-center gap-2">
                      {item.title}
                      {item.badge && (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-error text-[9px] font-bold text-white">
                          {item.badge}
                        </span>
                      )}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return <div key={item.href}>{linkContent}</div>;
            })}
          </nav>
        </ScrollArea>

        {/* Bottom section */}
        <div className="border-t p-3">
          <Separator className="mb-3" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/settings"
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                  pathname === "/settings" && "bg-accent text-foreground"
                )}
              >
                <Settings className="h-5 w-5 shrink-0" />
                {!collapsed && <span>Paramètres</span>}
              </Link>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right">Paramètres</TooltipContent>
            )}
          </Tooltip>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}
    </TooltipProvider>
  );
}

