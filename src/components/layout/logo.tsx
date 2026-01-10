import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "default" | "lg";
}

export function Logo({ className, showText = true, size = "default" }: LogoProps) {
  const sizeConfig = {
    sm: { height: 24, width: 28, textClass: "text-lg" },
    default: { height: 32, width: 38, textClass: "text-xl" },
    lg: { height: 48, width: 56, textClass: "text-3xl" },
  };

  const config = sizeConfig[size];

  return (
    <Link href="/" className={cn("flex items-center gap-2", className)}>
      {/* Logo Image */}
      <Image
        src="/logo.png"
        alt="PerformUp Logo"
        width={config.width}
        height={config.height}
        className="object-contain"
        priority
      />

      {showText && (
        <span
          className={cn(
            "font-display font-semibold tracking-tight",
            config.textClass
          )}
        >
          <span className="text-performup-blue">Perform</span>
          <span className="text-performup-gold">Up</span>
        </span>
      )}
    </Link>
  );
}
