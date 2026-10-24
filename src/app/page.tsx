"use client";

import React, { useState } from "react";
import { usePlanStore } from "@/store/planStore";
import { useHydrated } from "@/lib/useHydrated";
import { IntakeWizard } from "@/features/intake/components/IntakeWizard";
import { BudgetView } from "@/features/budget/components/BudgetView";
import { TimelineView } from "@/features/timeline/components/TimelineView";
import { LiveRegion } from "@/components/LiveRegion";
import { EventProfile, Plan } from "@/lib/schemas";
import { formatINR } from "@/lib/money";
import { formatDisplayDate } from "@/lib/dates";

export default function Home() {
  const isHydrated = useHydrated();
  const { plan, setPlan, clearPlan, selectedTab, setSelectedTab, confirmVendorQuote } =
    usePlanStore();

  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState<string>("");

  const handleLoadDemo = async () => {
    try {
      setIsLoadingDemo(true);
      setErrorMessage(null);
      setLiveAnnouncement("Loading pre-built offline demo wedding...");
      const res = await fetch("/api/demo");
      if (!res.ok) {
        throw new Error(`Failed to load demo: HTTP ${res.status}`);
      }
      const json = (await res.json()) as { ok?: boolean; data?: Plan; plan?: Plan };
      const receivedPlan = json.data ?? json.plan;
      if (!receivedPlan) {
        throw new Error("Invalid plan data received from demo API");
      }
      setPlan(receivedPlan);
      setLiveAnnouncement("Demo wedding loaded successfully.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load demo";
      setErrorMessage(msg);
      setLiveAnnouncement(`Error: ${msg}`);
    } finally {
      setIsLoadingDemo(false);
    }
  };

  const handleGeneratePlan = async (profile: EventProfile) => {
    try {
      setIsLoadingPlan(true);
      setErrorMessage(null);
      setLiveAnnouncement("Calling Gemini to synthesize celebration plan...");

      const res = await fetch("/api/plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });

      if (!res.ok) {
        const errorData = (await res.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        throw new Error(
          errorData?.error?.message ?? `Generation failed with HTTP status ${res.status}`,
        );
      }

      const json = (await res.json()) as { ok?: boolean; data?: Plan; plan?: Plan };
      const receivedPlan = json.data ?? json.plan;
      if (!receivedPlan) {
        throw new Error("Invalid plan data received from generation API");
      }
      setPlan(receivedPlan);
      setLiveAnnouncement("Celebration plan successfully generated with Gemini.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Plan generation failed";
      setErrorMessage(msg);
      setLiveAnnouncement(`Generation error: ${msg}`);
      throw err;
    } finally {
      setIsLoadingPlan(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <LiveRegion message={liveAnnouncement} />

      {/* Main Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center font-black text-slate-950 shadow-lg shadow-amber-500/20">
              🕉
            </div>
            <div>
              <span className="text-lg font-black tracking-tight bg-gradient-to-r from-amber-400 via-orange-300 to-rose-400 bg-clip-text text-transparent">
                Utsav Planner
              </span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/20">
                PromptWars GenAI
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleLoadDemo}
              disabled={isLoadingDemo}
              data-testid="load-demo-button"
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {isLoadingDemo ? (
                <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>⚡</span>
              )}
              <span>Load Demo Wedding</span>
            </button>

            {plan && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Start a new plan? Current changes will be reset.")) {
                    clearPlan();
                  }
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer"
              >
                Reset Plan
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main
        id="main-content"
        data-hydrated={isHydrated ? "true" : "false"}
        className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8"
      >
        {errorMessage && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-sm flex items-center justify-between"
          >
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-xs underline cursor-pointer ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {!plan ? (
          /* Intake / Zero State */
          <div className="flex flex-col gap-10 max-w-4xl mx-auto py-6">
            <div className="text-center space-y-3">
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
                Intelligent Celebration &amp; Event Planning
              </h1>
              <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto">
                Move seamlessly from inspiration to execution. Experience realistic budget
                apportionment with integer rupee honesty, topological task DAGs, and instant what-if
                revisions.
              </p>
            </div>

            {/* Quick Demo Hero Banner */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10 border border-amber-500/30 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">⚡</span>
                  <h2 className="text-lg font-bold text-white">
                    Instant Demo Mode (Zero API Key Required)
                  </h2>
                </div>
                <p className="text-xs text-slate-300">
                  Explore a pre-built ₹8,00,000 North Indian Wedding in Delhi NCR with 200 guests, 6
                  budget categories, and 7 dependency-aware milestones.
                </p>
              </div>
              <button
                type="button"
                onClick={handleLoadDemo}
                disabled={isLoadingDemo}
                className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-xl shadow-amber-500/20 transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                {isLoadingDemo ? "Loading Demo..." : "Explore Demo Wedding →"}
              </button>
            </div>

            {/* Intake Form */}
            <div className="pt-2">
              <IntakeWizard onPlanGenerated={handleGeneratePlan} isLoading={isLoadingPlan} />
            </div>
          </div>
        ) : (
          /* Active Plan Planner Workspace */
          <div className="flex flex-col gap-6">
            {/* Event Profile Summary Card */}
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {plan.profile.occasion}
                  </span>
                  <h1 className="text-2xl font-black text-white tracking-tight">
                    {plan.profile.occasionLabel ?? `${plan.profile.occasion.toUpperCase()} PLAN`}
                  </h1>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                  <span>
                    📍 <strong className="text-slate-200">{plan.profile.city}</strong>
                  </span>
                  <span>
                    📅{" "}
                    <strong className="text-slate-200">
                      {formatDisplayDate(plan.profile.eventDate)}
                    </strong>
                  </span>
                  <span>
                    👥 <strong className="text-slate-200">{plan.profile.guestCount} Guests</strong>
                  </span>
                  {plan.profile.vibe && (
                    <span className="italic text-slate-300">&ldquo;{plan.profile.vibe}&rdquo;</span>
                  )}
                </div>
              </div>

              {/* Total Budget Pill */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col items-start md:items-end justify-center shrink-0">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Target Budget
                </span>
                <span className="text-2xl font-black text-white mt-0.5">
                  {formatINR(plan.profile.budgetTotal)}
                </span>
              </div>
            </div>

            {/* Tab Navigation */}
            <nav
              aria-label="Plan Sections"
              className="flex items-center gap-2 border-b border-slate-800 pb-3"
            >
              {[
                { id: "budget", label: "💰 Budget & Rebalance" },
                { id: "timeline", label: "⏱️ Timeline & Cascade DAG" },
                { id: "vendors", label: "📋 Vendor Quotes" },
                { id: "revisions", label: "🔮 What-If Revisions" },
              ].map((tab) => {
                const isActive = selectedTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() =>
                      setSelectedTab(tab.id as "budget" | "timeline" | "vendors" | "revisions")
                    }
                    className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                      isActive
                        ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20"
                        : "bg-slate-900/60 text-slate-200 hover:text-white hover:bg-slate-800/60 border border-slate-800/80"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </nav>

            {/* Tab Panels */}
            <div className="pt-2">
              {selectedTab === "budget" && (
                <BudgetView
                  lines={plan.budget}
                  budgetTotal={plan.profile.budgetTotal}
                  onConfirmQuote={confirmVendorQuote}
                />
              )}

              {selectedTab === "timeline" && <TimelineView plan={plan} />}

              {selectedTab === "vendors" && (
                <div className="p-8 rounded-3xl bg-slate-900/40 border border-slate-800 text-center space-y-3">
                  <div className="text-3xl">📋</div>
                  <h3 className="text-lg font-bold text-white">Vendor Quote Comparator</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Compare vendor quotes side-by-side with GST calculation, unbundling hidden
                    charges, and auto-generated inquiry checklists.
                  </p>
                  <p className="text-xs font-semibold text-amber-400">
                    Phase 5 Vendor Engine coming up next!
                  </p>
                </div>
              )}

              {selectedTab === "revisions" && (
                <div className="p-8 rounded-3xl bg-slate-900/40 border border-slate-800 text-center space-y-3">
                  <div className="text-3xl">🔮</div>
                  <h3 className="text-lg font-bold text-white">
                    Live &ldquo;What-If&rdquo; Plan Revisions
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Throw unexpected curveballs (e.g. &ldquo;Guest count surges by 50&rdquo;,
                    &ldquo;Budget cut by 15%&rdquo;, &ldquo;Event date moved 3 weeks earlier&rdquo;)
                    and see the instant Before vs After diff.
                  </p>
                  <p className="text-xs font-semibold text-amber-400">
                    Phase 4 Revision Engine coming up next!
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
