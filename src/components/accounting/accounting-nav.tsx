"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  PieChart,
  Landmark,
  FileText,
  Users,
  Briefcase,
  BookOpen,
  LineChart,
  Scale,
  Receipt,
  ArrowLeftRight,
} from "lucide-react";

const accountingNavItems = [
  { href: "/admin/accounting", label: "Vue d'ensemble", icon: PieChart },
  { href: "/admin/accounting/bank-accounts", label: "Comptes bancaires", icon: Landmark },
  { href: "/admin/accounting/quotes", label: "Devis", icon: FileText },
  { href: "/admin/accounting/student-payments", label: "Paiements etudiants", icon: Users },
  { href: "/admin/accounting/missions", label: "Missions", icon: Briefcase },
  { href: "/admin/accounting/journal", label: "Journal", icon: BookOpen },
  { href: "/admin/accounting/forecast", label: "Tresorerie", icon: LineChart },
  { href: "/admin/accounting/positions", label: "Positions admins", icon: Scale },
  { href: "/admin/accounting/charges", label: "Charges", icon: Receipt },
  { href: "/admin/accounting/transfers", label: "Transferts", icon: ArrowLeftRight },
];

export function AccountingNav() {
  const pathname = usePathname();

  return (
    <div className="mb-6 -mx-1 overflow-x-auto">
      <nav className="flex gap-1 p-1 bg-muted/50 rounded-lg min-w-max">
        {accountingNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                isActive
                  ? "bg-white shadow-sm text-performup-blue"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/50"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
