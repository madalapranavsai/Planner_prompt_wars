import { describe, it, expect } from "vitest";
import { Plan, PlanChangeSet, IsoDate, BudgetLine, Task } from "@/lib/schemas";
import { applyPlanChanges } from "./applyChanges";
import { computePlanDiff } from "./diff";

describe("Revision Engine", () => {
  const today: IsoDate = "2026-06-01";

  const sampleBudget: BudgetLine[] = [
    {
      id: "b-venue",
      category: "venue",
      label: "Banquet Hall",
      amount: 400_000,
      floor: 200_000,
      pricing: { kind: "fixed" },
      source: "ai_estimate",
      confidence: "high",
      rationale: "Standard banquet",
    },
    {
      id: "b-catering",
      category: "catering",
      label: "Grand Buffet",
      amount: 200_000,
      floor: 100_000,
      pricing: { kind: "per_guest", perGuest: 1000 },
      source: "ai_estimate",
      confidence: "medium",
      rationale: "₹1,000 per guest for 200 guests",
    },
    {
      id: "b-decor",
      category: "decor",
      label: "Mandap & Lights",
      amount: 150_000,
      floor: 50_000,
      pricing: { kind: "fixed" },
      source: "ai_estimate",
      confidence: "medium",
      rationale: "Floral & lighting",
    },
    {
      id: "b-photo",
      category: "photography",
      label: "Photo & Video",
      amount: 50_000,
      floor: 30_000,
      pricing: { kind: "fixed" },
      source: "ai_estimate",
      confidence: "low",
      rationale: "Traditional coverage",
    },
  ];

  const sampleTasks: Task[] = [
    {
      id: "t-venue",
      title: "Book Venue",
      category: "venue",
      durationDays: 14,
      deadlineOffsetDays: 90,
      dependsOn: [],
      status: "done",
      completedOn: "2026-05-15",
      delayDays: 0,
      origin: "template",
    },
    {
      id: "t-catering",
      title: "Finalize Caterer & Menu",
      category: "catering",
      durationDays: 10,
      deadlineOffsetDays: 60,
      dependsOn: ["t-venue"],
      status: "todo",
      delayDays: 0,
      origin: "template",
    },
    {
      id: "t-decor",
      title: "Finalize Decor Theme",
      category: "decor",
      durationDays: 7,
      deadlineOffsetDays: 30,
      dependsOn: ["t-venue"],
      status: "todo",
      delayDays: 0,
      origin: "template",
    },
  ];

  const initialPlan: Plan = {
    version: 1,
    source: "ai",
    profile: {
      occasion: "wedding",
      eventDate: "2026-10-15",
      guestCount: 200,
      budgetTotal: 800_000,
      city: "Hyderabad",
      vibe: "grand",
      ageGroups: ["adults"],
      accessibilityNeeds: [],
      priorities: ["venue", "catering", "photography", "decor"],
    },
    budget: sampleBudget,
    tasks: sampleTasks,
    revisions: [],
  };

  it("applies guests_delta curveball, scales per-guest lines, and preserves budget sum", () => {
    const changeSet: PlanChangeSet = {
      interpretation: "Guest count increased from 200 to 250",
      changes: [{ type: "guests_delta", delta: 50 }],
    };

    const { updatedPlan } = applyPlanChanges(initialPlan, changeSet, today);
    expect(updatedPlan.profile.guestCount).toBe(250);

    const totalBudget = updatedPlan.budget.reduce((acc, b) => acc + b.amount, 0);
    expect(totalBudget).toBe(800_000);

    // Catering was per_guest, so it should scale up
    const catering = updatedPlan.budget.find((b) => b.category === "catering")!;
    expect(catering.amount).toBeGreaterThan(200_000);

    // Completed task remains done
    const venueTask = updatedPlan.tasks.find((t) => t.id === "t-venue")!;
    expect(venueTask.status).toBe("done");
    expect(venueTask.completedOn).toBe("2026-05-15");
  });

  it("applies budget_delta curveball and redistributes amounts", () => {
    const changeSet: PlanChangeSet = {
      interpretation: "Total budget reduced by ₹1,00,000",
      changes: [{ type: "budget_delta", delta: -100_000 }],
    };

    const { updatedPlan } = applyPlanChanges(initialPlan, changeSet, today);
    expect(updatedPlan.profile.budgetTotal).toBe(700_000);

    const totalBudget = updatedPlan.budget.reduce((acc, b) => acc + b.amount, 0);
    expect(totalBudget).toBe(700_000);
  });

  it("applies date_shift curveball and updates celebration date", () => {
    const changeSet: PlanChangeSet = {
      interpretation: "Event moved 14 days earlier",
      changes: [{ type: "date_shift", days: -14 }],
    };

    const { updatedPlan } = applyPlanChanges(initialPlan, changeSet, today);
    expect(updatedPlan.profile.eventDate).toBe("2026-10-01");
  });

  it("preserves confirmed quotes during rebalance and allows vendor_cancelled revert", () => {
    // Confirm a quote first
    const planWithConfirmed: Plan = {
      ...initialPlan,
      budget: initialPlan.budget.map((b) =>
        b.category === "catering"
          ? {
              ...b,
              source: "confirmed_quote" as const,
              amount: 250_000,
              vendorName: "Royal Flavors",
              quoteId: "q-123",
              quotedForGuests: 200,
              confirmedAt: "2026-05-20" as IsoDate,
            }
          : b,
      ),
    };

    // When guest count increases, confirmed quote amount is preserved
    const changeGuests: PlanChangeSet = {
      interpretation: "Guest count increased by 50",
      changes: [{ type: "guests_delta", delta: 50 }],
    };

    const res1 = applyPlanChanges(planWithConfirmed, changeGuests, today);
    const cateringLine = res1.updatedPlan.budget.find((b) => b.category === "catering")!;
    expect(cateringLine.source).toBe("confirmed_quote");
    expect(cateringLine.amount).toBe(250_000);
    expect(res1.warnings.some((w) => w.includes("Verify pricing with vendor"))).toBe(true);

    // Vendor cancellation curveball
    const changeCancel: PlanChangeSet = {
      interpretation: "Catering vendor cancelled",
      changes: [{ type: "vendor_cancelled", category: "catering" }],
    };

    const res2 = applyPlanChanges(planWithConfirmed, changeCancel, today);
    const revertedCatering = res2.updatedPlan.budget.find((b) => b.category === "catering")!;
    expect(revertedCatering.source).toBe("ai_estimate");
    expect("vendorName" in revertedCatering).toBe(false);
    expect(res2.warnings.some((w) => w.includes("Cancelled confirmed quote"))).toBe(true);
  });

  it("computes structured PlanDiff between two plan snapshots", () => {
    const changeSet: PlanChangeSet = {
      interpretation: "Guests +50, Budget -₹50,000",
      changes: [
        { type: "guests_delta", delta: 50 },
        { type: "budget_delta", delta: -50_000 },
      ],
    };

    const { updatedPlan, warnings } = applyPlanChanges(initialPlan, changeSet, today);
    const diff = computePlanDiff(initialPlan, updatedPlan, today, warnings);

    expect(diff.profile.length).toBe(2);
    expect(diff.profile.find((p) => p.field === "Guest Count")?.after).toBe("250 guests");
    expect(diff.budgetLines.length).toBe(4);
    expect(diff.tasks.length).toBe(3);
    const doneTask = diff.tasks.find((t) => t.taskId === "t-venue")!;
    expect(doneTask.preserved).toBe(true);
  });
});
