import { AiPlanEstimate, AiRevisionParse, AiQuoteComparison } from "./leanSchemas";
import {
  BudgetLine,
  PlanChange,
  PlanChangeSet,
  QuoteComparison,
  EventProfile,
} from "@/lib/schemas";
import { allocateBudget } from "@/features/budget/lib/allocate";

/**
 * Maps lean AiPlanEstimate to domain BudgetLine[] array.
 * Enforces honesty rule: all lines labelled source: "ai_estimate".
 * Rupee amounts allocated via largest-remainder apportionment.
 */
export function mapAiPlanEstimateToBudgetLines(
  estimate: AiPlanEstimate,
  profile: EventProfile,
): BudgetLine[] {
  const weights: Partial<Record<BudgetLine["category"], number>> = {};
  estimate.categories.forEach((cat) => {
    weights[cat.category] = cat.weight > 0 ? cat.weight : 1;
  });

  const allocated = allocateBudget(profile.budgetTotal, weights);

  return estimate.categories.map((cat, idx) => {
    const amount = allocated[cat.category] ?? 0;
    // Set realistic conservative floor (e.g. 50% of initial estimate)
    const floor = Math.max(0, Math.round(amount * 0.4));

    const pricing =
      cat.pricing === "per_guest"
        ? {
            kind: "per_guest" as const,
            perGuest: Math.max(1, Math.round(amount / profile.guestCount)),
          }
        : { kind: "fixed" as const };

    return {
      id: `line-${cat.category}-${idx + 1}`,
      category: cat.category,
      label: cat.category.charAt(0).toUpperCase() + cat.category.slice(1),
      amount,
      floor,
      pricing,
      source: "ai_estimate" as const,
      confidence: cat.confidence,
      rationale: cat.rationale,
    };
  });
}

/**
 * Maps lean AiRevisionParse to domain PlanChangeSet.
 */
export function mapAiRevisionToPlanChanges(parsed: AiRevisionParse): PlanChangeSet {
  const changes: PlanChange[] = [];

  for (const c of parsed.changes) {
    switch (c.kind) {
      case "guests_delta":
        if (typeof c.deltaNumber === "number") {
          changes.push({ type: "guests_delta", delta: Math.round(c.deltaNumber) });
        }
        break;
      case "guests_set":
        if (typeof c.exactNumber === "number" && c.exactNumber > 0) {
          changes.push({ type: "guests_set", value: Math.round(c.exactNumber) });
        }
        break;
      case "budget_delta":
        if (typeof c.deltaNumber === "number") {
          changes.push({ type: "budget_delta", delta: Math.round(c.deltaNumber) });
        }
        break;
      case "budget_set":
        if (typeof c.exactNumber === "number" && c.exactNumber > 0) {
          changes.push({ type: "budget_set", value: Math.round(c.exactNumber) });
        }
        break;
      case "date_shift_days":
        if (typeof c.deltaNumber === "number") {
          changes.push({ type: "date_shift", days: Math.round(c.deltaNumber) });
        }
        break;
      case "date_set":
        if (c.dateString && /^\d{4}-\d{2}-\d{2}$/.test(c.dateString)) {
          changes.push({ type: "date_set", value: c.dateString });
        }
        break;
      case "category_cap":
        if (c.category && typeof c.exactNumber === "number" && c.exactNumber >= 0) {
          changes.push({
            type: "category_cap",
            category: c.category,
            value: Math.round(c.exactNumber),
          });
        }
        break;
      case "priorities_set":
        if (c.priorities && c.priorities.length > 0) {
          changes.push({ type: "priorities_set", value: c.priorities });
        }
        break;
      case "vendor_cancelled":
        if (c.category) {
          changes.push({ type: "vendor_cancelled", category: c.category });
        }
        break;
      default:
        changes.push({
          type: "unsupported",
          text: c.unsupportedReason || "Unrecognized change intent",
        });
    }
  }

  return {
    changes:
      changes.length > 0
        ? changes
        : [{ type: "unsupported", text: "No actionable changes recognized" }],
    interpretation: parsed.interpretation,
  };
}

/**
 * Maps lean AiQuoteComparison to domain QuoteComparison.
 */
export function mapAiQuoteComparison(comparison: AiQuoteComparison): QuoteComparison {
  return {
    quotes: comparison.quotes.map((q) => ({
      vendorName: q.vendorName,
      baseCost: q.baseCost !== null ? Math.round(q.baseCost) : null,
      perGuestCost: q.perGuestCost !== null ? Math.round(q.perGuestCost) : null,
      charges: q.charges.map((c) => ({
        label: c.label,
        amount: c.amount !== null ? Math.round(c.amount) : null,
        percent: c.percent !== null ? c.percent : null,
        kind: c.kind,
      })),
      includedItems: q.includedItems,
      missingItems: q.missingItems,
      ambiguities: q.ambiguities,
      suspiciousInstructionsDetected: q.suspiciousInstructionsDetected,
    })),
    questionsToAsk: comparison.questionsToAsk.slice(0, 3),
    summary: comparison.summary,
  };
}
