import { z } from "zod";
import { Rupees, IsoDate, BudgetCategory, MAX_GUESTS, MAX_BUDGET_INR, Id } from "./common";
import { EventProfile } from "./eventProfile";
import { BudgetLine } from "./budgetLine";
import { Task } from "./task";

export const PlanChange = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("guests_delta"),
    delta: z.number().int().min(-MAX_GUESTS).max(MAX_GUESTS),
  }),
  z.object({
    type: z.literal("guests_set"),
    value: z.number().int().min(1).max(MAX_GUESTS),
  }),
  z.object({
    type: z.literal("budget_delta"),
    delta: z.number().int().min(-MAX_BUDGET_INR).max(MAX_BUDGET_INR),
  }),
  z.object({
    type: z.literal("budget_set"),
    value: Rupees.min(1),
  }),
  z.object({
    type: z.literal("date_shift"),
    days: z.number().int().min(-365).max(365),
  }),
  z.object({
    type: z.literal("date_set"),
    value: IsoDate,
  }),
  z.object({
    type: z.literal("category_cap"),
    category: BudgetCategory,
    value: Rupees,
  }),
  z.object({
    type: z.literal("priorities_set"),
    value: z.array(BudgetCategory).min(1),
  }),
  z.object({
    type: z.literal("vendor_cancelled"),
    category: BudgetCategory,
  }),
  z.object({
    type: z.literal("unsupported"),
    text: z.string().trim().max(200),
  }),
]);

export type PlanChange = z.infer<typeof PlanChange>;

export const PlanChangeSet = z.object({
  changes: z.array(PlanChange).min(1).max(10),
  interpretation: z.string().trim().max(300),
});

export type PlanChangeSet = z.infer<typeof PlanChangeSet>;

export const PlanDiff = z.object({
  profile: z.array(
    z.object({
      field: z.string(),
      before: z.string(),
      after: z.string(),
    }),
  ),
  budgetLines: z.array(
    z.object({
      category: BudgetCategory,
      before: Rupees,
      after: Rupees,
      delta: z.number().int(),
      preserved: z.boolean(), // true if confirmed quote was preserved
    }),
  ),
  tasks: z.array(
    z.object({
      taskId: Id,
      title: z.string(),
      beforeEnd: IsoDate,
      afterEnd: IsoDate,
      shiftDays: z.number().int(),
      becameAtRisk: z.boolean(),
      preserved: z.boolean(), // true for completed tasks
    }),
  ),
  warnings: z.array(z.string()),
});

export type PlanDiff = z.infer<typeof PlanDiff>;

export const PLAN_SCHEMA_VERSION = 1;

export const Plan = z.object({
  version: z.literal(PLAN_SCHEMA_VERSION),
  source: z.enum(["ai", "demo"]),
  profile: EventProfile,
  budget: z.array(BudgetLine),
  tasks: z.array(Task),
  revisions: z
    .array(
      z.object({
        at: z.string().datetime(),
        interpretation: z.string(),
        diff: PlanDiff,
      }),
    )
    .max(20),
});

export type Plan = z.infer<typeof Plan>;
