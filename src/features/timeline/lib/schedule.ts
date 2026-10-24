import { Task, ScheduledTask, IsoDate } from "@/lib/schemas";
import { addDays, diffDays, maxIsoDate, minIsoDate } from "@/lib/dates";
import { topologicalOrder } from "./graph";

export interface ScheduleError {
  kind: "cycle" | "missing_task";
  message: string;
  cycle?: string[] | undefined;
}

/**
 * Forward Pass:
 * Walks tasks in topological order to determine earliest possible start and end dates.
 * start = max(today, max(predecessor.earliestEnd))
 * end = start + durationDays + delayDays
 * Completed tasks are anchored to their actual completion date.
 */
export function forwardPass(
  tasks: readonly Task[],
  order: readonly string[],
  today: IsoDate,
): Map<string, { start: IsoDate; end: IsoDate }> {
  const result = new Map<string, { start: IsoDate; end: IsoDate }>();
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  for (const taskId of order) {
    const task = taskMap.get(taskId);
    if (!task) continue;

    if (task.status === "done" && task.completedOn) {
      // Done task: end date is anchored to completedOn
      const end = task.completedOn;
      const start = addDays(end, -task.durationDays);
      result.set(taskId, { start, end });
      continue;
    }

    // Determine earliest start based on predecessors
    let earliestStart = today;
    for (const prereqId of task.dependsOn) {
      const prereqSchedule = result.get(prereqId);
      if (prereqSchedule) {
        earliestStart = maxIsoDate(earliestStart, prereqSchedule.end);
      }
    }

    const totalDays = task.durationDays + task.delayDays;
    const earliestEnd = addDays(earliestStart, totalDays);

    result.set(taskId, { start: earliestStart, end: earliestEnd });
  }

  return result;
}

/**
 * Backward Pass:
 * Walks tasks in REVERSE topological order from the event date to calculate latest allowable dates.
 * latestEnd = min(eventDate - deadlineOffsetDays, min(successor.latestStart))
 * latestStart = latestEnd - (durationDays + delayDays)
 */
export function backwardPass(
  tasks: readonly Task[],
  order: readonly string[],
  eventDate: IsoDate,
): Map<string, { latestStart: IsoDate; latestEnd: IsoDate }> {
  const result = new Map<string, { latestStart: IsoDate; latestEnd: IsoDate }>();
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  // Build dependents adjacency map (who depends on taskId)
  const dependents = new Map<string, string[]>();
  tasks.forEach((t) => {
    t.dependsOn.forEach((prereqId) => {
      const list = dependents.get(prereqId) ?? [];
      list.push(t.id);
      dependents.set(prereqId, list);
    });
  });

  // Iterate in reverse topological order (leaves first)
  for (let i = order.length - 1; i >= 0; i--) {
    const taskId = order[i]!;
    const task = taskMap.get(taskId);
    if (!task) continue;

    // Hard ceiling: eventDate minus mandatory deadlineOffsetDays
    let maxAllowedEnd = addDays(eventDate, -task.deadlineOffsetDays);

    // Also cannot end later than any dependent task's latestStart
    const deps = dependents.get(taskId) ?? [];
    for (const depId of deps) {
      const depSchedule = result.get(depId);
      if (depSchedule) {
        maxAllowedEnd = minIsoDate(maxAllowedEnd, depSchedule.latestStart);
      }
    }

    const totalDays = task.durationDays + task.delayDays;
    const latestStart = addDays(maxAllowedEnd, -totalDays);

    result.set(taskId, { latestStart, latestEnd: maxAllowedEnd });
  }

  return result;
}

/**
 * Computes full schedule combining forward and backward passes.
 * Invariant: Dates are NEVER clamped to the event date. Flagged instead:
 * - missesDeadline: earliestEnd > latestEnd
 * - pastEvent: earliestEnd > eventDate
 * - startsBeforeToday: latestStart < today (event is too soon to finish task on schedule)
 */
export function computeSchedule(
  tasks: readonly Task[],
  eventDate: IsoDate,
  today: IsoDate,
): { ok: true; schedule: ScheduledTask[] } | { ok: false; error: ScheduleError } {
  const topo = topologicalOrder(tasks);
  if (!topo.ok) {
    return {
      ok: false,
      error: {
        kind: "cycle",
        message: "Circular dependency detected in tasks",
        cycle: topo.error.cycle,
      },
    };
  }

  const forward = forwardPass(tasks, topo.order, today);
  const backward = backwardPass(tasks, topo.order, eventDate);

  const schedule: ScheduledTask[] = [];

  for (const task of tasks) {
    const f = forward.get(task.id);
    const b = backward.get(task.id);

    if (!f || !b) {
      return {
        ok: false,
        error: {
          kind: "missing_task",
          message: `Failed to compute schedule for task ID: ${task.id}`,
        },
      };
    }

    // Slack is the buffer between latest allowable start and earliest possible start
    const slackDays = diffDays(b.latestStart, f.start);
    const isCritical = slackDays <= 0;
    const missesDeadline = f.end > b.latestEnd;
    const pastEvent = f.end > eventDate;
    const startsBeforeToday = b.latestStart < today;

    schedule.push({
      taskId: task.id,
      title: task.title,
      category: task.category,
      durationDays: task.durationDays,
      delayDays: task.delayDays,
      status: task.status,
      earliestStart: f.start,
      earliestEnd: f.end,
      latestStart: b.latestStart,
      latestEnd: b.latestEnd,
      slackDays,
      isCritical,
      missesDeadline,
      pastEvent,
      startsBeforeToday,
    });
  }

  return { ok: true, schedule };
}
