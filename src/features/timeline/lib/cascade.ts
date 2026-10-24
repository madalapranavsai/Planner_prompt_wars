import { Task, ScheduledTask, IsoDate } from "@/lib/schemas";
import { computeSchedule, ScheduleError } from "./schedule";

export interface CascadeAlert {
  taskId: string;
  taskTitle: string;
  kind: "delayed" | "misses_deadline" | "overflows_event";
  daysShifted: number;
  message: string;
}

export interface RecoveryOption {
  id: string;
  title: string;
  description: string;
  actionableUpdate?: {
    taskId: string;
    newDuration?: number;
    resolvedDelay?: number;
  };
}

export interface TaskUpdate {
  taskId: string;
  status?: Task["status"];
  delayDays?: number;
  durationDays?: number;
  completedOn?: IsoDate;
}

/**
 * Applies an update to a task (e.g. marking complete or adding delay days)
 * and recalculates the downstream topological cascade.
 */
export function applyTaskUpdate(
  tasks: readonly Task[],
  update: TaskUpdate,
  ctx: { eventDate: IsoDate; today: IsoDate },
):
  | {
      ok: true;
      tasks: Task[];
      schedule: ScheduledTask[];
      alerts: CascadeAlert[];
    }
  | { ok: false; error: ScheduleError } {
  // Update task list
  const updatedTasks: Task[] = tasks.map((t) => {
    if (t.id !== update.taskId) return { ...t };

    const newDelay = update.delayDays ?? t.delayDays;
    const newDuration = update.durationDays ?? t.durationDays;
    let newStatus = update.status ?? t.status;

    // Enforce invariant: status "delayed" <=> delayDays > 0
    if (newDelay > 0 && newStatus !== "done") {
      newStatus = "delayed";
    } else if (newDelay === 0 && newStatus === "delayed") {
      newStatus = "todo";
    }

    return {
      ...t,
      status: newStatus,
      durationDays: newDuration,
      delayDays: newDelay,
      completedOn: update.completedOn ?? t.completedOn,
    };
  });

  const schedResult = computeSchedule(updatedTasks, ctx.eventDate, ctx.today);
  if (!schedResult.ok) {
    return schedResult;
  }

  // Detect cascade alerts by checking for deadline breaches or delays
  const alerts: CascadeAlert[] = [];
  schedResult.schedule.forEach((item) => {
    if (item.pastEvent) {
      alerts.push({
        taskId: item.taskId,
        taskTitle: item.title,
        kind: "overflows_event",
        daysShifted: Math.abs(item.slackDays),
        message: `Task "${item.title}" will complete after the event date (${ctx.eventDate})!`,
      });
    } else if (item.missesDeadline) {
      alerts.push({
        taskId: item.taskId,
        taskTitle: item.title,
        kind: "misses_deadline",
        daysShifted: Math.abs(item.slackDays),
        message: `Task "${item.title}" slips past its latest deadline buffer.`,
      });
    } else if (item.delayDays > 0 && item.taskId !== update.taskId) {
      alerts.push({
        taskId: item.taskId,
        taskTitle: item.title,
        kind: "delayed",
        daysShifted: item.delayDays,
        message: `Downstream task "${item.title}" is pushed back due to predecessor delays.`,
      });
    }
  });

  return {
    ok: true,
    tasks: updatedTasks,
    schedule: schedResult.schedule,
    alerts,
  };
}

/**
 * Reschedules tasks when the overall celebration date moves (backward pass recalculated).
 */
export function rescheduleForNewDate(
  tasks: readonly Task[],
  newEventDate: IsoDate,
  today: IsoDate,
):
  | {
      ok: true;
      schedule: ScheduledTask[];
      alerts: CascadeAlert[];
    }
  | { ok: false; error: ScheduleError } {
  const schedResult = computeSchedule(tasks, newEventDate, today);
  if (!schedResult.ok) {
    return schedResult;
  }

  const alerts: CascadeAlert[] = [];
  schedResult.schedule.forEach((item) => {
    if (item.startsBeforeToday) {
      alerts.push({
        taskId: item.taskId,
        taskTitle: item.title,
        kind: "misses_deadline",
        daysShifted: 0,
        message: `Task "${item.title}" had to start before today to finish in time for the new earlier date.`,
      });
    } else if (item.pastEvent) {
      alerts.push({
        taskId: item.taskId,
        taskTitle: item.title,
        kind: "overflows_event",
        daysShifted: Math.abs(item.slackDays),
        message: `Task "${item.title}" finishes after the new event date.`,
      });
    }
  });

  return { ok: true, schedule: schedResult.schedule, alerts };
}

/**
 * Suggests actionable recovery interventions for cascade delays.
 */
export function suggestRecovery(
  schedule: readonly ScheduledTask[],
  alerts: readonly CascadeAlert[],
): RecoveryOption[] {
  if (alerts.length === 0) return [];

  const options: RecoveryOption[] = [];

  // Identify first critical bottleneck task
  const critical = schedule.find((s) => s.isCritical && s.status !== "done");
  if (critical) {
    options.push({
      id: "recovery-fast-track",
      title: `Fast-track "${critical.title}"`,
      description: `Compress task duration from ${critical.durationDays} days to ${Math.max(1, Math.round(critical.durationDays * 0.6))} days by dedicating additional resources.`,
      actionableUpdate: {
        taskId: critical.taskId,
        newDuration: Math.max(1, Math.round(critical.durationDays * 0.6)),
      },
    });
  }

  // Identify delayed task with pending delay days
  const delayed = schedule.find((s) => s.delayDays > 0);
  if (delayed) {
    options.push({
      id: "recovery-clear-delay",
      title: `Resolve delay on "${delayed.title}"`,
      description: `Clear the ${delayed.delayDays}-day delay by authorizing expedited processing or overtime.`,
      actionableUpdate: {
        taskId: delayed.taskId,
        resolvedDelay: 0,
      },
    });
  }

  return options;
}
