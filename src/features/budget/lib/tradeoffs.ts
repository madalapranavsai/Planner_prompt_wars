import { Plan, Rupees } from "@/lib/schemas";
import { RebalanceResult } from "./rebalance";

export interface Tradeoff {
  id: string;
  kind: "reduce_guests" | "downgrade_category" | "increase_budget" | "shift_to_offpeak";
  title: string;
  saving: Rupees;
  detail: string;
  actionableChange: {
    type: string;
    [key: string]: unknown;
  };
}

/**
 * Generates deterministic trade-off recommendations when the budget is severely over (>20% or unresolved overrun).
 * All numbers and savings are calculated directly in code.
 */
export function suggestTradeoffs(plan: Plan, result: RebalanceResult): Tradeoff[] {
  const { projected, unresolved } = result;

  // Only trigger when projected overrun > 20% or there is an unresolved amount that couldn't be absorbed
  if (projected.overrunPct <= 20 && unresolved <= 0) {
    return [];
  }

  const tradeoffs: Tradeoff[] = [];
  const targetSaving = unresolved > 0 ? unresolved : projected.overrun;

  // Option 1: Reduce guest count
  // Calculate average per-guest cost from unconfirmed per_guest lines and overall budget
  const perGuestCost = Math.round(plan.profile.budgetTotal / plan.profile.guestCount);
  if (perGuestCost > 0 && plan.profile.guestCount > 20) {
    const guestsToCut = Math.min(
      Math.ceil(targetSaving / perGuestCost),
      Math.floor(plan.profile.guestCount * 0.3), // cap reduction at 30%
    );

    if (guestsToCut > 0) {
      const estimatedSaving = guestsToCut * perGuestCost;
      tradeoffs.push({
        id: "tradeoff-reduce-guests",
        kind: "reduce_guests",
        title: `Trim guest count by ${guestsToCut} guests`,
        saving: estimatedSaving,
        detail: `Reducing attendance from ${plan.profile.guestCount} to ${plan.profile.guestCount - guestsToCut} saves approx ₹${estimatedSaving.toLocaleString("en-IN")} across catering and venue scale.`,
        actionableChange: {
          type: "guests_delta",
          delta: -guestsToCut,
        },
      });
    }
  }

  // Option 2: Downgrade or cap lowest priority unconfirmed category
  const unconfirmedLines = result.lines.filter((l) => l.source === "ai_estimate" && l.amount > 0);
  if (unconfirmedLines.length > 0) {
    // Find unconfirmed line with lowest priority rank
    const sorted = [...unconfirmedLines].sort((a, b) => {
      const rankA = plan.profile.priorities.indexOf(a.category);
      const rankB = plan.profile.priorities.indexOf(b.category);
      return (rankB === -1 ? 99 : rankB) - (rankA === -1 ? 99 : rankA);
    });

    const targetCategoryLine = sorted[0];
    if (targetCategoryLine && targetCategoryLine.amount > 10_000) {
      const cutAmount = Math.round(targetCategoryLine.amount * 0.4); // 40% reduction
      tradeoffs.push({
        id: `tradeoff-downgrade-${targetCategoryLine.category}`,
        kind: "downgrade_category",
        title: `Scale back ${targetCategoryLine.label}`,
        saving: cutAmount,
        detail: `Adjust ${targetCategoryLine.label} package or simplify requirements to save approx ₹${cutAmount.toLocaleString("en-IN")}.`,
        actionableChange: {
          type: "category_cap",
          category: targetCategoryLine.category,
          value: targetCategoryLine.amount - cutAmount,
        },
      });
    }
  }

  // Option 3: Increase budget ceiling
  tradeoffs.push({
    id: "tradeoff-increase-budget",
    kind: "increase_budget",
    title: `Expand budget by ₹${targetSaving.toLocaleString("en-IN")}`,
    saving: 0,
    detail: `Accommodate confirmed vendor quotes and market estimates by raising the budget to ₹${(plan.profile.budgetTotal + targetSaving).toLocaleString("en-IN")}.`,
    actionableChange: {
      type: "budget_delta",
      delta: targetSaving,
    },
  });

  return tradeoffs;
}
