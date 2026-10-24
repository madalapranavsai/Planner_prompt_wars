import { z } from "zod";
import { Rupees, IsoDate, BudgetCategory, MAX_GUESTS } from "./common";

export const Occasion = z.enum([
  "wedding",
  "birthday",
  "anniversary",
  "engagement",
  "community",
  "corporate",
  "other",
]);

export type Occasion = z.infer<typeof Occasion>;

export const AgeGroup = z.enum(["kids", "teens", "adults", "seniors"]);
export type AgeGroup = z.infer<typeof AgeGroup>;

export const AccessibilityNeed = z.enum([
  "wheelchair_access",
  "elderly_seating",
  "hearing_support",
  "visual_support",
  "dietary_restrictions",
]);
export type AccessibilityNeed = z.infer<typeof AccessibilityNeed>;

export const EventProfile = z.object({
  occasion: Occasion,
  occasionLabel: z.string().trim().max(60).optional(),
  budgetTotal: Rupees.min(1, "Budget must be at least ₹1"),
  guestCount: z.number().int().min(1, "Guests must be at least 1").max(MAX_GUESTS),
  eventDate: IsoDate,
  city: z.string().trim().min(2, "City name is required").max(80),
  vibe: z.string().trim().max(200),
  ageGroups: z.array(AgeGroup).min(1, "Select at least one age group"),
  accessibilityNeeds: z.array(AccessibilityNeed),
  accessibilityNotes: z.string().trim().max(500).optional(),
  priorities: z
    .array(BudgetCategory)
    .min(1, "Specify at least one priority category")
    .max(12)
    .refine((p) => new Set(p).size === p.length, "Priorities must be unique"),
});

export type EventProfile = z.infer<typeof EventProfile>;

/**
 * Validates eventDate against today's date (injected as parameter, avoiding Date.now() side effects)
 */
export function validateEventDate(eventDate: IsoDate, today: IsoDate): boolean {
  return eventDate >= today;
}
