import { BudgetLine, BudgetCategory, Rupees, IsoDate } from "@/lib/schemas";
import { largestRemainder } from "@/lib/math/largestRemainder";

export interface RebalanceAdjustment {
  lineId: string;
  category: BudgetCategory;
  before: Rupees;
  after: Rupees;
  delta: number;
}

export interface RebalanceResult {
  lines: BudgetLine[];
  projected: {
    overrun: number;
    overrunPct: number;
  };
  absorbed: number;
  unresolved: number;
  surplusToContingency: number;
  adjustments: RebalanceAdjustment[];
}

/**
 * Calculates pre-rebalance projected overrun and percentage.
 * overrunPct = ((sum(lines) - totalBudget) / totalBudget) * 100
 */
export function projectedOverrun(
  lines: readonly BudgetLine[],
  totalBudget: Rupees,
): { overrun: number; overrunPct: number } {
  const currentSum = lines.reduce((acc, l) => acc + l.amount, 0);
  const overrun = currentSum - totalBudget;
  const overrunPct = totalBudget > 0 ? (overrun / totalBudget) * 100 : 0;
  return { overrun, overrunPct };
}

/**
 * Confirms a vendor quote on a specific line item.
 * Promotes source from 'ai_estimate' to 'confirmed_quote'.
 */
export function confirmQuote(
  lines: readonly BudgetLine[],
  lineId: string,
  quote: {
    amount: Rupees;
    vendorName: string;
    on: IsoDate;
    guests?: number | undefined;
  },
): BudgetLine[] {
  return lines.map((line) => {
    if (line.id !== lineId) return { ...line };

    const quotedForGuests =
      line.pricing.kind === "per_guest"
        ? (quote.guests ??
          (line.source === "confirmed_quote" ? line.quotedForGuests : undefined) ??
          1)
        : undefined;

    return {
      ...line,
      source: "confirmed_quote" as const,
      amount: quote.amount,
      vendorName: quote.vendorName,
      confirmedAt: quote.on,
      quotedForGuests,
    };
  });
}

/**
 * Reverts a confirmed quote back to an AI estimate.
 * Used when a vendor cancels.
 */
export function revertQuote(lines: readonly BudgetLine[], category: BudgetCategory): BudgetLine[] {
  return lines.map((line) => {
    if (line.category !== category || line.source !== "confirmed_quote") {
      return { ...line };
    }

    return {
      id: line.id,
      category: line.category,
      label: line.label,
      amount: line.amount,
      floor: line.floor,
      pricing: line.pricing,
      source: "ai_estimate" as const,
      confidence: "medium" as const,
      rationale: `Reverted to estimate following vendor cancellation`,
    };
  });
}

/**
 * Rebalances budget lines when reality causes overruns or savings.
 *
 * Requirements:
 * 1. Confirmed quotes are NEVER altered.
 * 2. Unconfirmed lines absorb overruns, prioritizing lowest-priority categories first.
 * 3. No line is EVER reduced below its configured floor.
 * 4. Iterative redistribution: lines reaching their floor are clamped and removed from the cut pool.
 * 5. If cut cannot be fully absorbed, the remainder is returned in `unresolved`.
 * 6. Surplus from quotes cheaper than budget total goes to the contingency line.
 */
export function rebalanceBudget(
  lines: readonly BudgetLine[],
  totalBudget: Rupees,
  priorities: readonly BudgetCategory[],
): RebalanceResult {
  const { overrun, overrunPct } = projectedOverrun(lines, totalBudget);

  const adjustments: RebalanceAdjustment[] = [];

  // Deep clone lines
  const workingLines: BudgetLine[] = lines.map((l) => ({ ...l }));

  // CASE 1: No overrun or surplus
  if (overrun === 0) {
    return {
      lines: workingLines,
      projected: { overrun, overrunPct },
      absorbed: 0,
      unresolved: 0,
      surplusToContingency: 0,
      adjustments: [],
    };
  }

  // CASE 2: Under-budget / Surplus (cheaper quotes or reduced scope)
  if (overrun < 0) {
    const surplus = Math.abs(overrun);
    const contingencyLine = workingLines.find((l) => l.category === "contingency");

    if (contingencyLine && contingencyLine.source === "ai_estimate") {
      const before = contingencyLine.amount;
      contingencyLine.amount += surplus;
      adjustments.push({
        lineId: contingencyLine.id,
        category: "contingency",
        before,
        after: contingencyLine.amount,
        delta: surplus,
      });
    } else {
      // Create new unconfirmed contingency line
      const newLine: BudgetLine = {
        id: `contingency-${Date.now()}`,
        category: "contingency",
        label: "Contingency Fund (Surplus)",
        amount: surplus,
        floor: 0,
        pricing: { kind: "fixed" },
        source: "ai_estimate",
        confidence: "high",
        rationale: "Automated surplus allocation from lower actual costs",
      };
      workingLines.push(newLine);
      adjustments.push({
        lineId: newLine.id,
        category: "contingency",
        before: 0,
        after: surplus,
        delta: surplus,
      });
    }

    return {
      lines: workingLines,
      projected: { overrun, overrunPct },
      absorbed: 0,
      unresolved: 0,
      surplusToContingency: surplus,
      adjustments,
    };
  }

  // CASE 3: Overrun (> 0). Must cut unconfirmed lines iteratively by inverse priority.
  let remainingCut = overrun;
  let absorbedTotal = 0;

  // Map priority rank: index 0 is highest priority (least cut). Last is lowest priority (most cut).
  const priorityRank = new Map<BudgetCategory, number>();
  priorities.forEach((cat, index) => {
    priorityRank.set(cat, index);
  });

  // Iterative cut loop
  while (remainingCut > 0) {
    // Eligible lines: unconfirmed lines that are currently above their floor
    const eligibleIndices: number[] = [];
    for (let i = 0; i < workingLines.length; i++) {
      const line = workingLines[i]!;
      if (line.source === "ai_estimate" && line.amount > line.floor) {
        eligibleIndices.push(i);
      }
    }

    if (eligibleIndices.length === 0) {
      // Cannot absorb any more without violating floors
      break;
    }

    // Weight inversely to priority rank:
    // lowest priority gets largest cut weight
    const weights = eligibleIndices.map((idx) => {
      const line = workingLines[idx]!;
      const rank = priorityRank.get(line.category) ?? 99;
      // rank + 1 ensures weight > 0 even for rank 0
      return (rank + 1) * 10;
    });

    const apportionedCuts = largestRemainder(remainingCut, weights);

    let progressMadeThisRound = false;
    let cutToDeductNext = 0;

    for (let k = 0; k < eligibleIndices.length; k++) {
      const lineIdx = eligibleIndices[k]!;
      const line = workingLines[lineIdx]!;
      const proposedCut = apportionedCuts[k]!;

      if (proposedCut <= 0) continue;

      const maxPossibleCut = line.amount - line.floor;
      const actualCut = Math.min(proposedCut, maxPossibleCut);

      if (actualCut > 0) {
        line.amount -= actualCut;
        absorbedTotal += actualCut;
        cutToDeductNext += actualCut;
        progressMadeThisRound = true;
      }
    }

    remainingCut -= cutToDeductNext;

    if (!progressMadeThisRound) {
      break;
    }
  }

  // Build adjustments report
  lines.forEach((orig) => {
    const updated = workingLines.find((l) => l.id === orig.id);
    if (updated && updated.amount !== orig.amount) {
      adjustments.push({
        lineId: orig.id,
        category: orig.category,
        before: orig.amount,
        after: updated.amount,
        delta: updated.amount - orig.amount,
      });
    }
  });

  return {
    lines: workingLines,
    projected: { overrun, overrunPct },
    absorbed: absorbedTotal,
    unresolved: remainingCut,
    surplusToContingency: 0,
    adjustments,
  };
}
