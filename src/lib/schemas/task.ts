import { z } from "zod";
import { Id, BudgetCategory, IsoDate } from "./common";

export const TaskStatus = z.enum(["todo", "in_progress", "done", "delayed"]);
export type TaskStatus = z.infer<typeof TaskStatus>;

export const TaskOrigin = z.enum(["template", "ai_suggested", "user"]);
export type TaskOrigin = z.infer<typeof TaskOrigin>;

export const Task = z
  .object({
    id: Id,
    title: z.string().trim().min(1).max(120),
    category: BudgetCategory.optional(),
    durationDays: z.number().int().min(1, "Task duration must be at least 1 day").max(365),
    dependsOn: z.array(Id).max(20),
    deadlineOffsetDays: z.number().int().min(0, "Deadline offset cannot be negative").max(730),
    status: TaskStatus,
    delayDays: z.number().int().min(0).max(365).default(0),
    completedOn: IsoDate.optional(),
    origin: TaskOrigin,
  })
  .refine(
    (t) => {
      // Invariant: status "delayed" <=> delayDays > 0
      if (t.status === "delayed") {
        return t.delayDays > 0;
      }
      return t.delayDays === 0;
    },
    { message: 'Task status "delayed" <=> delayDays > 0' },
  );

export type Task = z.infer<typeof Task>;

/**
 * Computed schedule view (not stored in state; computed on-the-fly)
 */
export interface ScheduledTask {
  taskId: Id;
  title: string;
  category?: BudgetCategory | undefined;
  durationDays: number;
  delayDays: number;
  status: TaskStatus;
  // Forward pass: earliest possible dates
  earliestStart: IsoDate;
  earliestEnd: IsoDate;
  // Backward pass: latest dates to meet event deadline
  latestStart: IsoDate;
  latestEnd: IsoDate;
  // Analysis
  slackDays: number;
  isCritical: boolean;
  missesDeadline: boolean;
  pastEvent: boolean;
  startsBeforeToday: boolean;
}
