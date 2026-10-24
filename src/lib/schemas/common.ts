import { z } from "zod";

// Sanity limits
export const MAX_BUDGET_INR = 100_00_00_000; // ₹100 Crore cap
export const MAX_GUESTS = 10_000;

// All money is represented strictly as integer rupees
export const Rupees = z
  .number()
  .int("Rupees must be an integer (no decimals)")
  .nonnegative("Rupees cannot be negative")
  .max(MAX_BUDGET_INR, "Budget exceeds maximum allowed amount");

export type Rupees = z.infer<typeof Rupees>;

// Date-only ISO string: "YYYY-MM-DD"
export const IsoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be an ISO date in YYYY-MM-DD format");

export type IsoDate = z.infer<typeof IsoDate>;

// Identifier format
export const Id = z.string().min(1).max(64);
export type Id = z.infer<typeof Id>;

// Standard celebration budget categories
export const BudgetCategory = z.enum([
  "venue",
  "catering",
  "decor",
  "photography",
  "attire",
  "entertainment",
  "invitations",
  "transport",
  "gifts",
  "accommodation",
  "contingency",
  "other",
]);

export type BudgetCategory = z.infer<typeof BudgetCategory>;

export const ALL_BUDGET_CATEGORIES: BudgetCategory[] = BudgetCategory.options;
