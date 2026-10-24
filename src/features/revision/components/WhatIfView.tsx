"use client";

import React, { useState } from "react";
import { usePlanStore } from "@/store/planStore";
import { Plan, PlanDiff, IsoDate } from "@/lib/schemas";
import { formatINR } from "@/lib/money";
import { RevisionDiffModal } from "./RevisionDiffModal";
import { applyPlanChanges } from "../lib/applyChanges";
import { computePlanDiff } from "../lib/diff";

const PRESET_CURVEBALLS = [
  { label: "+50 Guests", prompt: "50 more guests are attending the celebration" },
  {
    label: "Cut Budget 15%",
    prompt: "Reduce total budget by 15 percent due to unexpected expenses",
  },
  { label: "Move 2 Weeks Earlier", prompt: "Move celebration date 14 days earlier" },
  {
    label: "Caterer Cancelled",
    prompt: "Catering vendor cancelled, need to revert and re-estimate",
  },
  { label: "Cap Decor at ₹80,000", prompt: "Cap decor category budget to 80000 rupees max" },
];

export function WhatIfView() {
  const plan = usePlanStore((s) => s.plan);
  const applyRevision = usePlanStore((s) => s.applyRevision);

  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simulated revision preview state
  const [simulatedResult, setSimulatedResult] = useState<{
    updatedPlan: Plan;
    diff: PlanDiff;
    interpretation: string;
  } | null>(null);

  if (!plan) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center text-slate-400">
        No active celebration plan. Please create or load a plan to simulate revisions.
      </div>
    );
  }

  const today: IsoDate = new Date().toISOString().slice(0, 10) as IsoDate;

  async function handleSimulate(instructionPrompt: string) {
    if (!instructionPrompt.trim() || !plan) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/plan/revise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          userPrompt: instructionPrompt.trim(),
        }),
      });

      const json = await res.json();

      if (res.ok && json.ok && json.data) {
        setSimulatedResult({
          updatedPlan: json.data.updatedPlan,
          diff: json.data.diff,
          interpretation: json.data.interpretation,
        });
      } else {
        // Fallback to client-side deterministic evaluation for offline/demo reliability
        const fallback = simulateOfflineCurveball(plan, instructionPrompt, today);
        if (fallback) {
          setSimulatedResult(fallback);
        } else {
          setError(
            json.error?.message ||
              "Could not interpret the curveball. Try a specific instruction like '+50 guests' or 'cut budget by 1 lakh'.",
          );
        }
      }
    } catch {
      // Offline fallback
      const fallback = simulateOfflineCurveball(plan, instructionPrompt, today);
      if (fallback) {
        setSimulatedResult(fallback);
      } else {
        setError("Network error. Please check your connection or try a preset curveball.");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleApply() {
    if (!simulatedResult) return;
    applyRevision(
      simulatedResult.updatedPlan,
      simulatedResult.interpretation,
      simulatedResult.diff,
    );
    setSimulatedResult(null);
    setPrompt("");
  }

  return (
    <div className="space-y-8">
      {/* Simulation Header & Bar */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl relative overflow-hidden shadow-2xl space-y-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">🔮</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                What-If Curveball Simulator
              </h2>
            </div>
            <p className="mt-2 text-sm text-slate-300 max-w-2xl leading-relaxed">
              Simulate life changes (guest surges, budget cuts, vendor cancellations, date shifts).
              Code recalculates exact budgets and schedules while strictly preserving locked
              contracts and completed tasks.
            </p>
          </div>
          <span className="shrink-0 self-start sm:self-auto rounded-full bg-amber-500/10 border border-amber-500/30 px-3.5 py-1 text-xs font-bold text-amber-300 flex items-center gap-1.5 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Deterministic Rebalance DAG
          </span>
        </div>

        {/* Preset Chips */}
        <div className="space-y-2.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Quick Curveball Presets
          </label>
          <div className="flex flex-wrap gap-2.5">
            {PRESET_CURVEBALLS.map((cb) => (
              <button
                key={cb.label}
                type="button"
                onClick={() => {
                  setPrompt(cb.prompt);
                  handleSimulate(cb.prompt);
                }}
                disabled={loading}
                className="rounded-2xl border border-slate-700/80 bg-slate-900/80 px-4 py-2 text-xs font-bold text-slate-200 hover:border-amber-400/60 hover:bg-slate-800 hover:text-amber-300 hover:shadow-lg hover:shadow-amber-500/10 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                aria-label={`Preset: ${cb.label}`}
              >
                ⚡ {cb.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Natural Language Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSimulate(prompt);
          }}
          className="space-y-3"
        >
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Add 60 guests, cut total budget by ₹50,000, and advance date by 10 days"
              disabled={loading}
              className="flex-1 rounded-2xl border border-slate-700/80 bg-slate-950/90 px-5 py-3.5 text-sm text-slate-100 placeholder-slate-500 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all disabled:opacity-50 shadow-inner"
              aria-label="Enter curveball or revision instruction"
            />
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 px-7 py-3.5 text-sm font-extrabold text-slate-950 hover:from-amber-400 hover:to-amber-500 shadow-xl shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              aria-label="Simulate Curveball: Simulate revision scenario"
            >
              {loading ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                  <span>Simulating...</span>
                </>
              ) : (
                <>
                  <span>Simulate Curveball</span>
                  <span>⚡</span>
                </>
              )}
            </button>
          </div>

          {error && (
            <p className="text-xs text-rose-400 font-medium" role="alert">
              ⚠️ {error}
            </p>
          )}
        </form>
      </div>

      {/* Revision Diff Modal */}
      {simulatedResult && (
        <RevisionDiffModal
          isOpen={true}
          onClose={() => setSimulatedResult(null)}
          onApply={handleApply}
          diff={simulatedResult.diff}
          interpretation={simulatedResult.interpretation}
          updatedPlan={simulatedResult.updatedPlan}
        />
      )}

      {/* Revision History */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <span>📜</span>
          <span>Applied Revision History ({plan.revisions.length})</span>
        </h3>

        {plan.revisions.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-400 bg-slate-900/30">
            No revisions applied yet. Use the simulator above to adapt your plan to unforeseen
            changes.
          </div>
        ) : (
          <div className="space-y-3.5">
            {plan.revisions.map((rev, idx) => (
              <div key={idx} className="glass-card p-5 rounded-3xl space-y-3 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold text-sm">✓ Applied</span>
                    <span className="text-sm font-semibold text-slate-200">
                      {rev.interpretation}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(rev.at).toLocaleDateString()}{" "}
                    {new Date(rev.at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  {rev.diff.profile.length > 0 && (
                    <div className="rounded-2xl bg-slate-950/60 p-3 text-slate-300 border border-slate-800/80">
                      <span className="font-bold text-slate-400 block mb-1">Profile Updates:</span>
                      {rev.diff.profile.map((p, i) => (
                        <div key={i} className="text-slate-300">
                          {p.field}: <span className="line-through text-slate-500">{p.before}</span>{" "}
                          → <span className="text-emerald-300 font-bold">{p.after}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="rounded-2xl bg-slate-950/60 p-3 text-slate-300 border border-slate-800/80">
                    <span className="font-bold text-slate-400 block mb-1">Budget Changes:</span>
                    {rev.diff.budgetLines
                      .filter((b) => b.delta !== 0)
                      .slice(0, 3)
                      .map((b, i) => (
                        <div key={i} className="capitalize">
                          {b.category}: {b.delta > 0 ? "+" : ""}
                          {formatINR(b.delta)}
                        </div>
                      ))}
                    {rev.diff.budgetLines.filter((b) => b.delta !== 0).length === 0 && (
                      <span className="text-slate-400">No category shifts</span>
                    )}
                  </div>

                  <div className="rounded-lg bg-slate-800/40 p-2 text-slate-300">
                    <span className="font-semibold text-slate-400 block mb-1">
                      Schedule Shifts:
                    </span>
                    {rev.diff.tasks
                      .filter((t) => t.shiftDays !== 0)
                      .slice(0, 3)
                      .map((t, i) => (
                        <div key={i} className="truncate">
                          {t.title}: {t.shiftDays > 0 ? "+" : ""}
                          {t.shiftDays}d
                        </div>
                      ))}
                    {rev.diff.tasks.filter((t) => t.shiftDays !== 0).length === 0 && (
                      <span className="text-slate-400">Timeline intact</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Deterministic client-side fallback for preset curveballs and standard phrases
 * guaranteeing offline demo reliability.
 */
function simulateOfflineCurveball(
  plan: Plan,
  prompt: string,
  today: IsoDate,
): { updatedPlan: Plan; diff: PlanDiff; interpretation: string } | null {
  const lower = prompt.toLowerCase();

  if (lower.includes("50") && lower.includes("guest")) {
    const { updatedPlan, warnings } = applyPlanChanges(
      plan,
      {
        interpretation: "Added 50 guests to celebration",
        changes: [{ type: "guests_delta", delta: 50 }],
      },
      today,
    );
    return {
      updatedPlan,
      diff: computePlanDiff(plan, updatedPlan, today, warnings),
      interpretation: "Added 50 guests to celebration",
    };
  }

  if (lower.includes("15") && lower.includes("budget")) {
    const delta = -Math.round(plan.profile.budgetTotal * 0.15);
    const { updatedPlan, warnings } = applyPlanChanges(
      plan,
      {
        interpretation: `Reduced total budget by 15% (-${formatINR(Math.abs(delta))})`,
        changes: [{ type: "budget_delta", delta }],
      },
      today,
    );
    return {
      updatedPlan,
      diff: computePlanDiff(plan, updatedPlan, today, warnings),
      interpretation: `Reduced total budget by 15% (-${formatINR(Math.abs(delta))})`,
    };
  }

  if (lower.includes("earlier") || lower.includes("weeks") || lower.includes("14 days")) {
    const { updatedPlan, warnings } = applyPlanChanges(
      plan,
      {
        interpretation: "Celebration moved 14 days earlier",
        changes: [{ type: "date_shift", days: -14 }],
      },
      today,
    );
    return {
      updatedPlan,
      diff: computePlanDiff(plan, updatedPlan, today, warnings),
      interpretation: "Celebration moved 14 days earlier",
    };
  }

  if (lower.includes("caterer") && (lower.includes("cancel") || lower.includes("cancelled"))) {
    const { updatedPlan, warnings } = applyPlanChanges(
      plan,
      {
        interpretation: "Catering vendor cancelled, quote reverted to estimate",
        changes: [{ type: "vendor_cancelled", category: "catering" }],
      },
      today,
    );
    return {
      updatedPlan,
      diff: computePlanDiff(plan, updatedPlan, today, warnings),
      interpretation: "Catering vendor cancelled, quote reverted to estimate",
    };
  }

  if (
    lower.includes("decor") &&
    (lower.includes("cap") || lower.includes("80000") || lower.includes("80,000"))
  ) {
    const { updatedPlan, warnings } = applyPlanChanges(
      plan,
      {
        interpretation: "Capped decor category to ₹80,000",
        changes: [{ type: "category_cap", category: "decor", value: 80_000 }],
      },
      today,
    );
    return {
      updatedPlan,
      diff: computePlanDiff(plan, updatedPlan, today, warnings),
      interpretation: "Capped decor category to ₹80,000",
    };
  }

  return null;
}
