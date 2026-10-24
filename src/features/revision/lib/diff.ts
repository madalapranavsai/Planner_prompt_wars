import { Plan, PlanDiff, IsoDate, BudgetCategory } from "@/lib/schemas";
import { computeSchedule } from "@/features/timeline/lib/schedule";
import { formatINR } from "@/lib/money";
import { formatDisplayDate, diffDays } from "@/lib/dates";

/**
 * Pure diff engine that computes structured Before vs After comparison
 * between two celebration plan snapshots.
 */
export function computePlanDiff(
  before: Plan,
  after: Plan,
  today: IsoDate,
  warnings: string[] = [],
): PlanDiff {
  // 1. Profile differences
  const profileDiff: PlanDiff["profile"] = [];

  if (before.profile.guestCount !== after.profile.guestCount) {
    profileDiff.push({
      field: "Guest Count",
      before: `${before.profile.guestCount} guests`,
      after: `${after.profile.guestCount} guests`,
    });
  }

  if (before.profile.budgetTotal !== after.profile.budgetTotal) {
    profileDiff.push({
      field: "Total Budget",
      before: formatINR(before.profile.budgetTotal),
      after: formatINR(after.profile.budgetTotal),
    });
  }

  if (before.profile.eventDate !== after.profile.eventDate) {
    profileDiff.push({
      field: "Celebration Date",
      before: formatDisplayDate(before.profile.eventDate),
      after: formatDisplayDate(after.profile.eventDate),
    });
  }

  // 2. Budget Lines differences
  const budgetCategories = Array.from(
    new Set([...before.budget.map((b) => b.category), ...after.budget.map((b) => b.category)]),
  );

  const budgetLinesDiff: PlanDiff["budgetLines"] = budgetCategories.map((category) => {
    const beforeLine = before.budget.find((b) => b.category === category);
    const afterLine = after.budget.find((b) => b.category === category);

    const beforeAmount = beforeLine?.amount ?? 0;
    const afterAmount = afterLine?.amount ?? 0;
    const isPreserved =
      afterLine?.source === "confirmed_quote" && beforeLine?.source === "confirmed_quote";

    return {
      category: category as BudgetCategory,
      before: beforeAmount,
      after: afterAmount,
      delta: afterAmount - beforeAmount,
      preserved: isPreserved,
    };
  });

  // 3. Timeline differences
  const beforeSchedRes = computeSchedule(before.tasks, before.profile.eventDate, today);
  const afterSchedRes = computeSchedule(after.tasks, after.profile.eventDate, today);

  const beforeSchedMap = new Map(
    beforeSchedRes.ok ? beforeSchedRes.schedule.map((s) => [s.taskId, s]) : [],
  );
  const afterSchedMap = new Map(
    afterSchedRes.ok ? afterSchedRes.schedule.map((s) => [s.taskId, s]) : [],
  );

  const tasksDiff: PlanDiff["tasks"] = after.tasks.map((afterTask) => {
    const bSched = beforeSchedMap.get(afterTask.id);
    const aSched = afterSchedMap.get(afterTask.id);

    const beforeEnd = bSched?.latestEnd ?? before.profile.eventDate;
    const afterEnd = aSched?.latestEnd ?? after.profile.eventDate;
    const shiftDays = bSched && aSched ? diffDays(aSched.earliestEnd, bSched.earliestEnd) : 0;

    const becameAtRisk = Boolean(
      aSched &&
      (aSched.pastEvent || aSched.missesDeadline) &&
      (!bSched || (!bSched.pastEvent && !bSched.missesDeadline)),
    );

    const isPreserved = afterTask.status === "done";

    return {
      taskId: afterTask.id,
      title: afterTask.title,
      beforeEnd,
      afterEnd,
      shiftDays,
      becameAtRisk,
      preserved: isPreserved,
    };
  });

  return {
    profile: profileDiff,
    budgetLines: budgetLinesDiff,
    tasks: tasksDiff,
    warnings,
  };
}
