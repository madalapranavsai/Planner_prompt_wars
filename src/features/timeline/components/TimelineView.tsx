"use client";

import React, { useMemo, useState } from "react";
import { Plan } from "@/lib/schemas/plan";
import { usePlanStore } from "@/store/planStore";
import { computeSchedule } from "@/features/timeline/lib/schedule";
import { suggestRecovery, CascadeAlert } from "@/features/timeline/lib/cascade";
import { todayIsoDate, formatDisplayDate } from "@/lib/dates";

interface TimelineViewProps {
  plan?: Plan;
}

export function TimelineView({ plan: propPlan }: TimelineViewProps) {
  const storePlan = usePlanStore((s) => s.plan);
  const plan = storePlan ?? propPlan;
  const { updateTask } = usePlanStore();
  const [filter, setFilter] = useState<"all" | "critical" | "delayed" | "pending" | "done">("all");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const today = useMemo(() => todayIsoDate(), []);

  // Compute topological schedule
  const scheduleResult = useMemo(() => {
    if (!plan) {
      return {
        ok: false as const,
        error: { kind: "missing_task" as const, message: "No active plan" },
      };
    }
    return computeSchedule(plan.tasks, plan.profile.eventDate, today);
  }, [plan, today]);

  // Derive cascade alerts
  const { schedule, alerts } = useMemo(() => {
    if (!scheduleResult.ok || !plan) {
      return { schedule: [], alerts: [] };
    }
    const sched = scheduleResult.schedule;
    const alertList: CascadeAlert[] = [];

    sched.forEach((item) => {
      if (item.pastEvent) {
        alertList.push({
          taskId: item.taskId,
          taskTitle: item.title,
          kind: "overflows_event",
          daysShifted: Math.abs(item.slackDays),
          message: `"${item.title}" will complete after the event date (${formatDisplayDate(plan.profile.eventDate)})!`,
        });
      } else if (item.missesDeadline) {
        alertList.push({
          taskId: item.taskId,
          taskTitle: item.title,
          kind: "misses_deadline",
          daysShifted: Math.abs(item.slackDays),
          message: `"${item.title}" slips past its required deadline buffer.`,
        });
      } else if (item.delayDays > 0) {
        alertList.push({
          taskId: item.taskId,
          taskTitle: item.title,
          kind: "delayed",
          daysShifted: item.delayDays,
          message: `"${item.title}" has a delay of ${item.delayDays} day${item.delayDays > 1 ? "s" : ""}.`,
        });
      }
    });

    return { schedule: sched, alerts: alertList };
  }, [scheduleResult, plan]);

  // Suggested recovery options
  const recoveryOptions = useMemo(() => {
    return suggestRecovery(schedule, alerts);
  }, [schedule, alerts]);

  // Filter tasks
  const filteredSchedule = useMemo(() => {
    return schedule.filter((item) => {
      if (filter === "critical") return item.isCritical && item.status !== "done";
      if (filter === "delayed") return item.delayDays > 0;
      if (filter === "pending") return item.status === "todo" || item.status === "in_progress";
      if (filter === "done") return item.status === "done";
      return true;
    });
  }, [schedule, filter]);

  // Stats
  const stats = useMemo(() => {
    const total = schedule.length;
    const completed = schedule.filter((s) => s.status === "done").length;
    const delayed = schedule.filter((s) => s.delayDays > 0).length;
    const critical = schedule.filter((s) => s.isCritical && s.status !== "done").length;
    return { total, completed, delayed, critical };
  }, [schedule]);

  if (!plan) {
    return (
      <div className="p-8 text-center rounded-3xl bg-slate-900/40 border border-slate-800 text-slate-400">
        No active celebration plan loaded.
      </div>
    );
  }

  if (!scheduleResult.ok) {
    return (
      <div
        className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300"
        role="alert"
      >
        <h3 className="text-lg font-bold text-rose-200">Timeline Calculation Error</h3>
        <p className="mt-2 text-sm">{scheduleResult.error.message}</p>
        {scheduleResult.error.cycle && (
          <p className="mt-1 text-xs font-mono">Cycle: {scheduleResult.error.cycle.join(" → ")}</p>
        )}
      </div>
    );
  }

  const handleMarkDone = (taskId: string, title: string) => {
    updateTask({ taskId, status: "done", completedOn: today }, today);
    setStatusMessage(`Marked "${title}" as completed.`);
  };

  const handleAddDelay = (taskId: string, title: string, days: number, currentDelay: number) => {
    updateTask({ taskId, delayDays: currentDelay + days }, today);
    setStatusMessage(`Added +${days} days delay to "${title}". Downstream tasks recalculated.`);
  };

  const handleClearDelay = (taskId: string, title: string) => {
    updateTask({ taskId, delayDays: 0, status: "todo" }, today);
    setStatusMessage(`Cleared delay for "${title}".`);
  };

  const handleApplyRecovery = (opt: (typeof recoveryOptions)[number]) => {
    if (!opt.actionableUpdate) return;
    const { taskId, newDuration, resolvedDelay } = opt.actionableUpdate;
    if (resolvedDelay !== undefined) {
      updateTask({ taskId, delayDays: resolvedDelay, status: "todo" }, today);
    } else if (newDuration !== undefined) {
      updateTask({ taskId, durationDays: newDuration }, today);
    }
    setStatusMessage(`Applied recovery: ${opt.title}`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Stats */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-2xl">⏳</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Timeline & Milestones
              </h2>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                DAG Topological Flow
              </span>
            </div>
            <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
              Target Celebration Date:{" "}
              <span className="text-amber-300 font-bold">
                {formatDisplayDate(plan.profile.eventDate)}
              </span>{" "}
              • Topological schedule calculated using forward & backward passes. Dates represent
              required completion deadlines with contingency slack.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="px-4 py-2.5 rounded-2xl bg-slate-900/80 border border-slate-700/60 text-center min-w-[70px] shadow-inner">
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Total
              </div>
              <div className="text-xl font-black text-white">{stats.total}</div>
            </div>
            <div className="px-4 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center min-w-[70px] shadow-inner">
              <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
                Done
              </div>
              <div className="text-xl font-black text-emerald-300">{stats.completed}</div>
            </div>
            <div className="px-4 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center min-w-[70px] shadow-inner">
              <div className="text-[10px] uppercase font-bold tracking-wider text-amber-400">
                Critical
              </div>
              <div className="text-xl font-black text-amber-300">{stats.critical}</div>
            </div>
            {stats.delayed > 0 && (
              <div className="px-4 py-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center min-w-[70px] shadow-inner">
                <div className="text-[10px] uppercase font-bold tracking-wider text-rose-400">
                  Delayed
                </div>
                <div className="text-xl font-black text-rose-300">{stats.delayed}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Screen Reader Live Status */}
      {statusMessage && (
        <div className="sr-only" role="status" aria-live="polite">
          {statusMessage}
        </div>
      )}

      {/* Cascade Alerts Banner */}
      {alerts.length > 0 && (
        <div
          className="p-5 sm:p-6 rounded-3xl bg-amber-950/40 border border-amber-500/50 backdrop-blur-xl space-y-4 shadow-xl"
          role="region"
          aria-label="Cascade schedule alerts"
        >
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center font-bold text-lg shrink-0 shadow-inner">
              ⚡
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-amber-200">
                Topological Cascade Alerts ({alerts.length})
              </h3>
              <p className="text-xs text-amber-300/80 mt-0.5 leading-relaxed">
                Upstream delays automatically shift dependent downstream deliverables forward in
                time. Review impacted milestones below:
              </p>
              <ul className="mt-3 space-y-2 text-xs text-amber-200">
                {alerts.slice(0, 3).map((a, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                    <span>{a.message}</span>
                  </li>
                ))}
                {alerts.length > 3 && (
                  <li className="text-amber-300/90 font-semibold pl-4">
                    + {alerts.length - 3} additional downstream milestones shifted
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* Actionable Recovery Interventions */}
          {recoveryOptions.length > 0 && (
            <div className="pt-3.5 border-t border-amber-500/25">
              <div className="text-xs font-bold uppercase tracking-wider text-amber-300 mb-2.5">
                Suggested Recovery Interventions:
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {recoveryOptions.map((opt) => (
                  <div
                    key={opt.id}
                    className="p-3.5 rounded-2xl bg-slate-900/90 border border-amber-500/30 flex items-center justify-between gap-3 shadow-md"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{opt.title}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        {opt.description}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApplyRecovery(opt)}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-bold text-xs hover:from-amber-300 hover:to-amber-400 transition-all shadow-md shrink-0 cursor-pointer active:scale-95"
                    >
                      Apply Fix
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800/80 pb-3">
        {(
          [
            { id: "all", label: "All Tasks", count: stats.total },
            { id: "critical", label: "Critical Path", count: stats.critical },
            { id: "delayed", label: "Delayed", count: stats.delayed },
            { id: "pending", label: "To Do", count: stats.total - stats.completed },
            { id: "done", label: "Completed", count: stats.completed },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              filter === tab.id
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20"
                : "bg-slate-900/70 text-slate-300 hover:text-white hover:bg-slate-800/80 border border-slate-800"
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                filter === tab.id ? "bg-slate-950/30 text-slate-950" : "bg-slate-800 text-slate-300"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredSchedule.map((task) => {
          const rawTask = plan.tasks.find((t) => t.id === task.taskId);
          const hasPrereqs = rawTask && rawTask.dependsOn.length > 0;
          const prereqTitles = hasPrereqs
            ? rawTask.dependsOn
                .map((pId) => plan.tasks.find((t) => t.id === pId)?.title ?? pId)
                .join(", ")
            : null;

          return (
            <div
              key={task.taskId}
              data-testid={`task-item-${task.taskId}`}
              className={`p-5 sm:p-6 rounded-3xl border transition-all ${
                task.status === "done"
                  ? "bg-slate-900/40 border-slate-800/60 opacity-80"
                  : task.pastEvent
                    ? "bg-rose-950/20 border-rose-500/50 shadow-rose-950/20 shadow-xl"
                    : task.missesDeadline
                      ? "bg-amber-950/20 border-amber-500/50 shadow-amber-950/20 shadow-xl"
                      : "glass-card hover:border-slate-700/90 shadow-xl"
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                {/* Task Details */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base sm:text-lg font-bold text-white tracking-tight">
                      {task.title}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-slate-800/90 text-slate-300 border border-slate-700">
                      {task.category}
                    </span>

                    {/* Status Pill */}
                    {task.status === "done" && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        ✓ Completed
                      </span>
                    )}
                    {task.status === "delayed" && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        +{task.delayDays}d Delayed
                      </span>
                    )}
                    {task.status === "in_progress" && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                        In Progress
                      </span>
                    )}
                    {task.status === "todo" && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800/80 text-slate-400 border border-slate-700">
                        To Do
                      </span>
                    )}
                  </div>

                  {/* Predecessors */}
                  {prereqTitles && (
                    <div className="text-xs flex items-center gap-1.5 flex-wrap">
                      <span className="text-slate-400 font-medium">Prerequisites:</span>
                      <span className="text-amber-200/90 font-medium italic">{prereqTitles}</span>
                    </div>
                  )}

                  {/* Warning Flags */}
                  {task.pastEvent && (
                    <div className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                      <span>🚨 Finishes after the celebration date!</span>
                    </div>
                  )}
                  {!task.pastEvent && task.missesDeadline && (
                    <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <span>⚠️ Buffer depleted: finishes after recommended deadline</span>
                    </div>
                  )}
                </div>

                {/* Scheduling Windows & Actions */}
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  {/* Primary: Deadline (Latest End) */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 min-w-[150px] shadow-sm">
                    <div className="text-[10px] text-slate-300 uppercase tracking-wider font-bold">
                      Latest Deadline
                    </div>
                    <div className="text-sm font-black text-white mt-0.5">
                      {formatDisplayDate(task.latestEnd)}
                    </div>
                    <div className="mt-1">
                      {task.slackDays > 3 ? (
                        <span className="text-[11px] font-bold text-emerald-400">
                          Buffer: +{task.slackDays} days
                        </span>
                      ) : task.slackDays >= 0 ? (
                        <span className="text-[11px] font-bold text-amber-400">
                          Critical: {task.slackDays}d buffer
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-rose-400">
                          Breach: {Math.abs(task.slackDays)}d late
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Secondary: Earliest Window */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 min-w-[150px] shadow-sm">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                      Earliest Window
                    </div>
                    <div className="text-xs font-bold text-slate-200 mt-0.5">
                      {formatDisplayDate(task.earliestStart)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      thru {formatDisplayDate(task.earliestEnd)} ({task.durationDays}d duration)
                    </div>
                  </div>

                  {/* Action Controls */}
                  <div className="flex items-center gap-2">
                    {task.status !== "done" ? (
                      <button
                        type="button"
                        onClick={() => handleMarkDone(task.taskId, task.title)}
                        aria-label={`Done: Mark ${task.title} as completed`}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-extrabold text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer active:scale-95"
                      >
                        ✓ Done
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleClearDelay(task.taskId, task.title)}
                        aria-label={`Reopen: Reopen ${task.title}`}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                      >
                        Reopen
                      </button>
                    )}

                    {/* Delay Simulation Controls */}
                    <button
                      type="button"
                      onClick={() => handleAddDelay(task.taskId, task.title, 7, task.delayDays)}
                      aria-label={`+7d Delay: Simulate 7 days delay for ${task.title}`}
                      className="px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 hover:border-rose-500/50 border border-slate-700 font-bold text-xs transition-all cursor-pointer active:scale-95"
                    >
                      +7d Delay
                    </button>

                    {task.delayDays > 0 && (
                      <button
                        type="button"
                        onClick={() => handleClearDelay(task.taskId, task.title)}
                        aria-label={`Reset Delay: Clear delay on ${task.title}`}
                        className="px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 font-bold text-xs transition-colors cursor-pointer"
                      >
                        Reset Delay
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filteredSchedule.length === 0 && (
          <div className="p-8 text-center rounded-3xl bg-slate-900/40 border border-slate-800 text-slate-400">
            No tasks match the selected filter.
          </div>
        )}
      </div>
    </div>
  );
}
