import { z } from "zod";
import { Id, BudgetCategory, Rupees, IsoDate } from "./common";

export const PricingKind = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("fixed") }),
  z.object({
    kind: z.literal("per_guest"),
    perGuest: Rupees,
  }),
]);

export type PricingKind = z.infer<typeof PricingKind>;

const LineBase = z.object({
  id: Id,
  category: BudgetCategory,
  label: z.string().trim().min(1).max(80),
  amount: Rupees,
  floor: Rupees,
  pricing: PricingKind,
});

export const BudgetLine = z
  .discriminatedUnion("source", [
    LineBase.extend({
      source: z.literal("ai_estimate"),
      confidence: z.enum(["low", "medium", "high"]),
      rationale: z.string().trim().max(300),
    }),
    LineBase.extend({
      source: z.literal("confirmed_quote"),
      vendorName: z.string().trim().min(1).max(100),
      confirmedAt: IsoDate,
      quotedForGuests: z.number().int().min(1).optional(),
    }),
  ])
  .refine(
    (line) => {
      // Confirmed quotes with per_guest pricing MUST record quotedForGuests
      if (line.source === "confirmed_quote" && line.pricing.kind === "per_guest") {
        return typeof line.quotedForGuests === "number" && line.quotedForGuests > 0;
      }
      return true;
    },
    { message: "Confirmed quotes with per-guest pricing must record quotedForGuests" },
  );

export type BudgetLine = z.infer<typeof BudgetLine>;
