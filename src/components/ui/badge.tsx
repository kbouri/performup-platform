import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-performup-blue text-white hover:bg-performup-blue-light",
        secondary:
          "border-transparent bg-neutral-100 text-neutral-900 hover:bg-neutral-200",
        success:
          "border-transparent bg-success/10 text-success",
        warning:
          "border-transparent bg-warning/10 text-warning-dark",
        error:
          "border-transparent bg-error/10 text-error",
        outline:
          "border border-current text-foreground",
        gold:
          "border-transparent bg-performup-gold/10 text-performup-gold-dark",
        quant:
          "border-transparent bg-calendar-quant/10 text-calendar-quant",
        verbal:
          "border-transparent bg-calendar-verbal/10 text-calendar-verbal",
        mentor:
          "border-transparent bg-calendar-mentor/10 text-calendar-mentor",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

