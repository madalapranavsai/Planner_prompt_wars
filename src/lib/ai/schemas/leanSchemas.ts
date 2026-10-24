import { BudgetCategory } from "@/lib/schemas/common";
import { z } from "zod";

/**
 * 1. Plan Estimate (Core)
 * Model outputs relative weights, NOT rupee totals. Code allocates to budget via largest-remainder.
 */
export const AiCategoryEstimate = z.object({
  category: BudgetCategory,
  weight: z.number().nonnegative(),
  pricing: z.enum(["fixed", "per_guest"]),
  confidence: z.enum(["low", "medium", "high"]),
  rationale: z.string(),
});

export const AiPlanEstimate = z.object({
  categories: z.array(AiCategoryEstimate),
  assumptions: z.array(z.string()),
});

export type AiPlanEstimate = z.infer<typeof AiPlanEstimate>;

/**
 * 2. Revision Parse (Core)
 * Converts natural language curveballs into structured changes.
 */
export const AiPlanChange = z.object({
  kind: z.enum([
    "guests_delta",
    "guests_set",
    "budget_delta",
    "budget_set",
    "date_shift_days",
    "date_set",
    "category_cap",
    "priorities_set",
    "vendor_cancelled",
    "unsupported",
  ]),
  deltaNumber: z.number().nullable(),
  exactNumber: z.number().nullable(),
  dateString: z.string().nullable(),
  category: BudgetCategory.nullable(),
  priorities: z.array(BudgetCategory).nullable(),
  unsupportedReason: z.string().nullable(),
});

export const AiRevisionParse = z.object({
  changes: z.array(AiPlanChange),
  interpretation: z.string(),
});

export type AiRevisionParse = z.infer<typeof AiRevisionParse>;

/**
 * 3. Quote Extraction (Core)
 * Extracts structured quotes from raw user paste.
 */
export const AiQuoteCharge = z.object({
  label: z.string(),
  amount: z.number().nullable(),
  percent: z.number().nullable(),
  kind: z.enum(["tax", "service_charge", "hidden_fee", "other"]),
});

export const AiExtractedQuote = z.object({
  vendorName: z.string(),
  baseCost: z.number().nullable(),
  perGuestCost: z.number().nullable(),
  charges: z.array(AiQuoteCharge),
  includedItems: z.array(z.string()),
  missingItems: z.array(z.string()),
  ambiguities: z.array(z.string()),
  suspiciousInstructionsDetected: z.boolean(),
});

export const AiQuoteComparison = z.object({
  quotes: z.array(AiExtractedQuote),
  questionsToAsk: z.array(z.string()),
  summary: z.string(),
});

export type AiQuoteComparison = z.infer<typeof AiQuoteComparison>;

/**
 * 4. Vendor Questions (Core)
 */
export const AiVendorQuestions = z.object({
  questions: z.array(z.string()),
});

export type AiVendorQuestions = z.infer<typeof AiVendorQuestions>;

/**
 * 5. Task Suggestions (Stretch)
 */
export const AiTaskSuggestion = z.object({
  key: z.string(),
  title: z.string(),
  category: BudgetCategory.nullable(),
  durationDays: z.number(),
  deadlineOffsetDays: z.number(),
  dependsOnKeys: z.array(z.string()),
});

export const AiTaskTailor = z.object({
  tasks: z.array(AiTaskSuggestion),
});

export type AiTaskTailor = z.infer<typeof AiTaskTailor>;

/**
 * 6. Intake Parse (Stretch)
 */
export const AiIntakeParse = z.object({
  occasion: z.string().nullable(),
  budgetTotal: z.number().nullable(),
  guestCount: z.number().nullable(),
  city: z.string().nullable(),
  vibe: z.string().nullable(),
  missingFields: z.array(z.string()),
});

export type AiIntakeParse = z.infer<typeof AiIntakeParse>;

/**
 * 7. Insight Narrate (Stretch)
 */
export const AiInsightNarrate = z.object({
  narrative: z.string(),
  rankedOptionIds: z.array(z.string()),
});

export type AiInsightNarrate = z.infer<typeof AiInsightNarrate>;
