import { BudgetCategory, Rupees } from "@/lib/schemas";
import { largestRemainder } from "@/lib/math/largestRemainder";

/**
 * Allocates an integer total budget across selected categories according to given weights.
 *
 * Invariant:
 * The sum of all allocated amounts strictly and deterministically equals `total`.
 */
export function allocateBudget(
  total: Rupees,
  weights: Partial<Record<BudgetCategory, number>>,
): Record<BudgetCategory, Rupees> {
  const categories = Object.keys(weights) as BudgetCategory[];
  if (categories.length === 0) {
    return {} as Record<BudgetCategory, Rupees>;
  }

  const rawWeights = categories.map((cat) => weights[cat] ?? 0);
  const apportioned = largestRemainder(total, rawWeights);

  const result = {} as Record<BudgetCategory, Rupees>;
  categories.forEach((cat, index) => {
    result[cat] = apportioned[index] ?? 0;
  });

  return result;
}
