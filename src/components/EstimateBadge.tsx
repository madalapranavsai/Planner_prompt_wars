import React from "react";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EstimateBadgeProps {
  source: "ai_estimate" | "confirmed_quote";
  confidence?: "low" | "medium" | "high" | undefined;
  className?: string | undefined;
}

export function EstimateBadge({ source, confidence, className }: EstimateBadgeProps) {
  if (source === "confirmed_quote") {
    return (
      <span
        data-testid="estimate-badge"
        aria-label="Confirmed Quote"
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
          className,
        )}
      >
        <CheckCircle2
          className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"
          aria-hidden="true"
        />
        <span>Confirmed Quote</span>
      </span>
    );
  }

  const confidenceLabel = confidence ? ` (${confidence} confidence)` : "";

  return (
    <span
      data-testid="estimate-badge"
      aria-label={`AI Estimate${confidenceLabel}`}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800",
        className,
      )}
    >
      <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
      <span>AI Estimate</span>
      {confidence && (
        <span className="text-[10px] uppercase font-semibold text-amber-700 dark:text-amber-400">
          {confidence}
        </span>
      )}
    </span>
  );
}
