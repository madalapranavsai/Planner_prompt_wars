"use client";

import React, { useState } from "react";
import { usePlanStore } from "@/store/planStore";
import { useHydrated } from "@/lib/useHydrated";
import { IntakeWizard } from "@/features/intake/components/IntakeWizard";
import { BudgetView } from "@/features/budget/components/BudgetView";
import { TimelineView } from "@/features/timeline/components/TimelineView";
import { WhatIfView } from "@/features/revision/components/WhatIfView";
import { VendorComparatorView } from "@/features/vendors/components/VendorComparatorView";
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

  // Derive quick summary statistics
  const confirmedCount = plan?.budget.filter((b) => b.source === "confirmed_quote").length ?? 0;
  const completedTaskCount = plan?.tasks.filter((t) => t.status === "done").length ?? 0;
  const totalTasks = plan?.tasks.length ?? 0;

  return (
    <div className="flex flex-col min-h-screen">
      <LiveRegion message={liveAnnouncement} />

      {/* Main Top Header */}
      <header className="border-b border-white/5 bg-slate-950/80 backdrop-blur-2xl sticky top-0 z-30 shadow-lg shadow-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 p-0.5 shadow-lg shadow-amber-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-xl">
                🪔
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight bg-gradient-to-r from-amber-300 via-orange-300 to-rose-400 bg-clip-text text-transparent">
                  Utsav Planner
                </span>
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/25">
                  GenAI Event Engine
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Zero-Float Rupee Mathematics &amp; Topological DAG Timeline
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleLoadDemo}
              disabled={isLoadingDemo}
              data-testid="load-demo-button"
              className="px-4 py-2.5 rounded-2xl text-xs font-black bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 shadow-lg shadow-amber-500/25 transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {isLoadingDemo ? (
                <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="text-sm">⚡</span>
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
                className="px-3.5 py-2.5 rounded-2xl text-xs font-bold text-slate-300 hover:text-white bg-slate-900/90 hover:bg-slate-800 border border-slate-800 transition-all cursor-pointer active:scale-95"
              >
                Reset Plan
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main
        id="main-content"
        data-hydrated={isHydrated ? "true" : "false"}
        className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8"
      >
        {errorMessage && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-2xl bg-rose-950/60 border border-rose-500/50 text-rose-200 text-sm flex items-center justify-between shadow-lg shadow-rose-950/50"
          >
            <div className="flex items-center gap-2.5">
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-xs font-bold underline cursor-pointer ml-4 hover:text-white"
            >
              Dismiss
            </button>
          </div>
        )}

        {!plan ? (
          /* Intake / Zero State */
          <div className="flex flex-col gap-10 max-w-4xl mx-auto py-6">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold mb-2">
                <span>✨</span>
                <span>PromptWars Virtual Challenge 5</span>
              </div>
              <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
                Intelligent Celebration & Event Planning
              </h1>
              <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
                From inspiration to flawless execution with guaranteed mathematical honesty: exact
                integer rupee budgeting, topological timeline DAGs, and live curveball adaptations.
              </p>
            </div>

            {/* Quick Demo Hero Banner */}
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-rose-500/15 border border-amber-500/30 backdrop-blur-2xl shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden">
              <div className="space-y-1.5 relative z-10">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⚡</span>
                  <h2 className="text-lg sm:text-xl font-bold text-white">
                    Explore Offline Demo Mode (Zero Key Required)
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
                  Inspect a pre-built ₹8,00,000 Grand Sangeet &amp; Reception in Hyderabad with 200
                  guests, 6 budget categories, topological milestones, and curveball simulator.
                </p>
              </div>
              <button
                type="button"
                onClick={handleLoadDemo}
                disabled={isLoadingDemo}
                className="px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/30 transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-95 relative z-10"
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
          /* Active Plan Planner Command Center */
          <div className="flex flex-col gap-8">
            {/* Celebration Command Center Hero */}
            <div className="p-6 sm:p-8 rounded-3xl glass-panel relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-500/10 via-rose-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      👑 {plan.profile.occasion}
                    </span>
                    <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                      {plan.profile.occasionLabel ??
                        `${plan.profile.occasion.toUpperCase()} CELEBRATION`}
                    </h1>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-slate-300">
                    <span className="px-3 py-1 rounded-xl bg-slate-900/80 border border-slate-800">
                      📍 <strong className="text-white">{plan.profile.city}</strong>
                    </span>
                    <span className="px-3 py-1 rounded-xl bg-slate-900/80 border border-slate-800">
                      📅{" "}
                      <strong className="text-white">
                        {formatDisplayDate(plan.profile.eventDate)}
                      </strong>
                    </span>
                    <span className="px-3 py-1 rounded-xl bg-slate-900/80 border border-slate-800">
                      👥 <strong className="text-white">{plan.profile.guestCount} Guests</strong>
                    </span>
                    {plan.profile.vibe && (
                      <span className="px-3 py-1 rounded-xl bg-slate-900/80 border border-slate-800 italic text-amber-200/90">
                        &ldquo;{plan.profile.vibe}&rdquo;
                      </span>
                    )}
                  </div>
                </div>

                {/* Executive Quick Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/5 flex flex-col justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Target Budget
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-white mt-1">
                      {formatINR(plan.profile.budgetTotal)}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold mt-0.5">
                      {confirmedCount} of {plan.budget.length} quotes locked
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/5 flex flex-col justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Guest Scale
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-white mt-1">
                      {plan.profile.guestCount}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                      ~{formatINR(Math.round(plan.profile.budgetTotal / plan.profile.guestCount))}
                      /guest
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/5 flex flex-col justify-between col-span-2 sm:col-span-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Execution DAG
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-white mt-1">
                      {completedTaskCount}/{totalTasks}
                    </span>
                    <span className="text-[10px] text-amber-300 font-bold mt-0.5">
                      {totalTasks > 0
                        ? `${Math.round((completedTaskCount / totalTasks) * 100)}% complete`
                        : "Ready"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <nav
              aria-label="Plan Sections"
              className="flex items-center gap-2 border-b border-white/5 pb-4 overflow-x-auto"
            >
              {[
                {
                  id: "budget",
                  label: "💰 Budget & Rebalance",
                  badge: `${plan.budget.length} Lines`,
                },
                {
                  id: "timeline",
                  label: "⏱️ Timeline & Cascade DAG",
                  badge: `${plan.tasks.length} Milestones`,
                },
                { id: "vendors", label: "📋 Vendor Quotes", badge: "Comparator" },
                {
                  id: "revisions",
                  label: "🔮 What-If Revisions",
                  badge: `${plan.revisions.length} Applied`,
                },
              ].map((tab) => {
                const isActive = selectedTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() =>
                      setSelectedTab(tab.id as "budget" | "timeline" | "vendors" | "revisions")
                    }
                    className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-2.5 active:scale-95 ${
                      isActive
                        ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-xl shadow-amber-500/25 ring-1 ring-amber-400"
                        : "bg-slate-900/60 text-slate-300 hover:text-white hover:bg-slate-800/80 border border-white/5"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isActive ? "bg-slate-950/20 text-slate-950" : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  </button>
                );
              })}
            </nav>

            {/* Tab Panels */}
            <div className="pt-1">
              {selectedTab === "budget" && (
                <BudgetView
                  lines={plan.budget}
                  budgetTotal={plan.profile.budgetTotal}
                  onConfirmQuote={confirmVendorQuote}
                />
              )}

              {selectedTab === "timeline" && <TimelineView plan={plan} />}

              {selectedTab === "vendors" && <VendorComparatorView />}

              {selectedTab === "revisions" && <WhatIfView />}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
