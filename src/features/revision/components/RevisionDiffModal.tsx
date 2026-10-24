"use client";

import React, { useEffect, useRef } from "react";
import { Plan, PlanDiff } from "@/lib/schemas";
import { formatINR } from "@/lib/money";

interface RevisionDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: () => void;
  diff: PlanDiff;
  interpretation: string;
  updatedPlan: Plan;
}

export function RevisionDiffModal({
  isOpen,
  onClose,
  onApply,
  diff,
  interpretation,
}: RevisionDiffModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="diff-modal-title"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl space-y-6 my-8"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🔮</span>
              <h2 id="diff-modal-title" className="text-xl font-bold text-slate-100">
                Simulated Revision Diff
              </h2>
            </div>
            <p className="mt-1 text-sm text-amber-400 font-medium">
              &ldquo;{interpretation}&rdquo;
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
            aria-label="Close: Close revision preview modal"
          >
            ✕
          </button>
        </div>

        {/* Warnings / Alerts */}
        {diff.warnings.length > 0 && (
          <div
            className="rounded-xl border border-amber-600/40 bg-amber-950/30 p-4 text-sm text-amber-200 space-y-1"
            role="alert"
          >
            <div className="font-semibold flex items-center gap-1.5 text-amber-300">
              <span>⚠️</span>
              <span>Important Considerations</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-200">
              {diff.warnings.map((w, idx) => (
                <li key={idx}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Profile Differences */}
        {diff.profile.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Celebration Profile Updates
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {diff.profile.map((p, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-800 bg-slate-800/40 p-3 flex flex-col justify-between"
                >
                  <span className="text-xs text-slate-400 font-medium">{p.field}</span>
                  <div className="mt-1 flex items-center gap-2 text-sm">
                    <span className="text-slate-400 line-through">{p.before}</span>
                    <span className="text-emerald-400 font-bold">→ {p.after}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Budget Line Deltas */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Budget Rebalancing (Exact Rupee Apportionment)
          </h3>
          <div className="rounded-xl border border-slate-800 bg-slate-800/30 overflow-hidden divide-y divide-slate-800">
            {diff.budgetLines.map((line) => {
              const isZero = line.delta === 0;
              const isPositive = line.delta > 0;

              return (
                <div
                  key={line.category}
                  className="flex items-center justify-between p-3 text-sm hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200 capitalize">{line.category}</span>
                    {line.preserved && (
                      <span className="rounded-full bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
                        🔒 Confirmed Contract Preserved
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 text-xs">
                      {formatINR(line.before)} → {formatINR(line.after)}
                    </span>
                    <span
                      className={`min-w-20 text-right font-mono font-bold text-xs ${
                        isZero
                          ? "text-slate-400"
                          : isPositive
                            ? "text-emerald-400"
                            : "text-rose-400"
                      }`}
                    >
                      {isZero ? "±0" : `${isPositive ? "+" : ""}${formatINR(line.delta)}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Timeline Impacts */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Timeline & Schedule Impacts
          </h3>
          <div
            tabIndex={0}
            aria-label="Timeline and schedule impacts list"
            className="rounded-xl border border-slate-800 bg-slate-800/30 max-h-48 overflow-y-auto divide-y divide-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
          >
            {diff.tasks.map((task) => (
              <div
                key={task.taskId}
                className="flex items-center justify-between p-3 text-sm hover:bg-slate-800/50"
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <span className="truncate font-medium text-slate-200">{task.title}</span>
                  {task.preserved && (
                    <span className="shrink-0 rounded-full bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                      ✓ Completed
                    </span>
                  )}
                  {task.becameAtRisk && (
                    <span className="shrink-0 rounded-full bg-rose-950/80 border border-rose-500/50 px-2 py-0.5 text-[10px] font-bold text-rose-300">
                      ⚠️ At Risk
                    </span>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <span
                    className={`font-mono text-xs ${
                      task.shiftDays === 0
                        ? "text-slate-400"
                        : task.shiftDays > 0
                          ? "text-amber-400"
                          : "text-emerald-400"
                    }`}
                  >
                    {task.shiftDays === 0
                      ? "Unshifted"
                      : `${task.shiftDays > 0 ? "+" : ""}${task.shiftDays}d shift`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
            aria-label="Discard: Discard simulated revision changes"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={onApply}
            className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2.5 text-sm font-bold text-slate-950 hover:from-amber-400 hover:to-amber-500 shadow-lg shadow-amber-500/20 transition-all active:scale-95"
            aria-label="Apply: Apply simulated revision to active plan"
          >
            ✓ Apply Changes to Plan
          </button>
        </div>
      </div>
    </div>
  );
}
