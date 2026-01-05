"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn, getEncouragingMessage } from "@/lib/utils";

interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  value?: number;
  showEncouragement?: boolean;
  size?: "sm" | "default" | "lg";
}

/**
 * Progress bar component - Visual only, NO percentages displayed
 * Uses encouraging messages instead of numbers
 */
const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value = 0, showEncouragement = true, size = "default", ...props }, ref) => {
  const sizeClasses = {
    sm: "h-2",
    default: "h-3",
    lg: "h-4",
  };

  return (
    <div className="w-full">
      <ProgressPrimitive.Root
        ref={ref}
        className={cn(
          "relative w-full overflow-hidden rounded-full bg-neutral-200",
          sizeClasses[size],
          className
        )}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className="h-full w-full flex-1 rounded-full transition-all duration-500 ease-out"
          style={{
            transform: `translateX(-${100 - (value || 0)}%)`,
            background: `linear-gradient(
              90deg,
              #495C93 0%,
              #5d71a8 50%,
              #495C93 100%
            )`,
            backgroundSize: "200% 100%",
            animation: "progressShine 2s ease-in-out infinite",
          }}
        />
      </ProgressPrimitive.Root>
      {showEncouragement && (
        <p className="mt-2 text-sm font-medium text-performup-blue">
          {getEncouragingMessage(value || 0)}
        </p>
      )}
    </div>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };

