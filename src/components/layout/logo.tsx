import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "default" | "lg";
}

export function Logo({ className, showText = true, size = "default" }: LogoProps) {
  const sizeClasses = {
    sm: "h-6",
    default: "h-8",
    lg: "h-12",
  };

  const textSizeClasses = {
    sm: "text-lg",
    default: "text-xl",
    lg: "text-3xl",
  };

  return (
    <Link href="/" className={cn("flex items-center gap-2", className)}>
      {/* Logo Mark */}
      <div
        className={cn(
          "relative flex items-center justify-center rounded-lg bg-gradient-to-br from-performup-blue to-performup-blue-dark",
          sizeClasses[size],
          size === "sm" ? "w-6" : size === "default" ? "w-8" : "w-12"
        )}
      >
        {/* Stylized P */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full p-1.5"
        >
          <path
            d="M7 4h6a5 5 0 0 1 0 10H7V4z"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M7 20V14"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Arrow up for "Up" */}
          <path
            d="M17 12l3-3m0 0l-3-3m3 3h-5"
            stroke="#C8B38D"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {showText && (
        <span
          className={cn(
            "font-display font-semibold tracking-tight",
            textSizeClasses[size]
          )}
        >
          <span className="text-performup-blue">Perform</span>
          <span className="text-performup-gold">Up</span>
        </span>
      )}
    </Link>
  );
}

