import {
  Plan,
  PlanChangeSet,
  IsoDate,
  MAX_GUESTS,
  MAX_BUDGET_INR,
  BudgetLine,
} from "@/lib/schemas";
import { scaleForGuests } from "@/features/budget/lib/scale";
import { rebalanceBudget, revertQuote } from "@/features/budget/lib/rebalance";
import { rescheduleForNewDate } from "@/features/timeline/lib/cascade";
import { addDays } from "@/lib/dates";

export interface ApplyChangesResult {
  updatedPlan: Plan;
  warnings: string[];
}

/**
 * Pure, deterministic function that applies a structured set of changes (curveballs)
 * to a celebration plan, preserving completed tasks and existing confirmed quotes.
 */
export function applyPlanChanges(
  plan: Plan,
  changeSet: PlanChangeSet,
  today: IsoDate,
): ApplyChangesResult {
  const warnings: string[] = [];

  const updatedProfile = { ...plan.profile };
  let updatedBudget: BudgetLine[] = plan.budget.map((b) => ({ ...b }));
  let updatedTasks = plan.tasks.map((t) => ({ ...t }));

  for (const change of changeSet.changes) {
    switch (change.type) {
      case "guests_delta": {
        const newCount = Math.min(
          MAX_GUESTS,
          Math.max(1, updatedProfile.guestCount + change.delta),
        );
        updatedProfile.guestCount = newCount;

        const scaled = scaleForGuests(updatedBudget, newCount);
        updatedBudget = scaled.lines;
        scaled.staleQuotes.forEach((sq) => warnings.push(sq.message));

        const rebalanced = rebalanceBudget(
          updatedBudget,
          updatedProfile.budgetTotal,
          updatedProfile.priorities,
        );
        updatedBudget = rebalanced.lines;
        break;
      }

      case "guests_set": {
        const newCount = Math.min(MAX_GUESTS, Math.max(1, change.value));
        updatedProfile.guestCount = newCount;

        const scaled = scaleForGuests(updatedBudget, newCount);
        updatedBudget = scaled.lines;
        scaled.staleQuotes.forEach((sq) => warnings.push(sq.message));

        const rebalanced = rebalanceBudget(
          updatedBudget,
          updatedProfile.budgetTotal,
          updatedProfile.priorities,
        );
        updatedBudget = rebalanced.lines;
        break;
      }

      case "budget_delta": {
        const newTotal = Math.min(
          MAX_BUDGET_INR,
          Math.max(1, updatedProfile.budgetTotal + change.delta),
        );
        updatedProfile.budgetTotal = newTotal;

        const rebalanced = rebalanceBudget(updatedBudget, newTotal, updatedProfile.priorities);
        updatedBudget = rebalanced.lines;
        break;
      }

      case "budget_set": {
        const newTotal = Math.min(MAX_BUDGET_INR, Math.max(1, change.value));
        updatedProfile.budgetTotal = newTotal;

        const rebalanced = rebalanceBudget(updatedBudget, newTotal, updatedProfile.priorities);
        updatedBudget = rebalanced.lines;
        break;
      }

      case "date_shift": {
        const newDate = addDays(updatedProfile.eventDate, change.days);
        updatedProfile.eventDate = newDate;

        const sched = rescheduleForNewDate(updatedTasks, newDate, today);
        if (sched.ok) {
          sched.alerts.forEach((a) => warnings.push(a.message));
        }
        break;
      }

      case "date_set": {
        updatedProfile.eventDate = change.value;

        const sched = rescheduleForNewDate(updatedTasks, change.value, today);
        if (sched.ok) {
          sched.alerts.forEach((a) => warnings.push(a.message));
        }
        break;
      }

      case "category_cap": {
        updatedBudget = updatedBudget.map((line) => {
          if (line.category !== change.category) return line;
          if (line.source === "confirmed_quote") {
            warnings.push(
              `Cannot cap ${line.category} below confirmed vendor quote with ${line.vendorName}.`,
            );
            return line;
          }
          const cappedAmount = Math.max(line.floor, Math.min(line.amount, change.value));
          return {
            ...line,
            amount: cappedAmount,
          };
        });

        const rebalanced = rebalanceBudget(
          updatedBudget,
          updatedProfile.budgetTotal,
          updatedProfile.priorities,
        );
        updatedBudget = rebalanced.lines;
        break;
      }

      case "priorities_set": {
        updatedProfile.priorities = change.value;
        const rebalanced = rebalanceBudget(updatedBudget, updatedProfile.budgetTotal, change.value);
        updatedBudget = rebalanced.lines;
        break;
      }

      case "vendor_cancelled": {
        const reverted = revertQuote(updatedBudget, change.category);
        const rebalanced = rebalanceBudget(
          reverted,
          updatedProfile.budgetTotal,
          updatedProfile.priorities,
        );
        updatedBudget = rebalanced.lines;
        warnings.push(
          `Cancelled confirmed quote for category "${change.category}". Estimate restored.`,
        );
        break;
      }

      case "unsupported": {
        warnings.push(`Unsupported request: ${change.text}`);
        break;
      }
    }
  }

  // Ensure completed tasks remain strictly preserved
  updatedTasks = updatedTasks.map((updated) => {
    const original = plan.tasks.find((t) => t.id === updated.id);
    if (original && original.status === "done") {
      return {
        ...updated,
        status: "done",
        completedOn: original.completedOn,
      };
    }
    return updated;
  });

  return {
    updatedPlan: {
      version: 1,
      source: plan.source,
      profile: updatedProfile,
      budget: updatedBudget,
      tasks: updatedTasks,
      revisions: plan.revisions,
    },
    warnings,
  };
}
