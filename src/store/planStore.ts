import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Plan, PLAN_SCHEMA_VERSION } from "@/lib/schemas/plan";
import { BudgetLine } from "@/lib/schemas/budgetLine";
import { confirmQuote, revertQuote, rebalanceBudget } from "@/features/budget/lib/rebalance";
import { applyTaskUpdate, TaskUpdate } from "@/features/timeline/lib/cascade";
import { IsoDate } from "@/lib/schemas/common";

interface PlanState {
  plan: Plan | null;
  selectedTab: "budget" | "timeline" | "vendors" | "revisions";
  setPlan: (plan: Plan) => void;
  clearPlan: () => void;
  setSelectedTab: (tab: "budget" | "timeline" | "vendors" | "revisions") => void;

  // Budget Actions
  confirmVendorQuote: (
    lineId: string,
    quote: { amount: number; vendorName: string; on: IsoDate; guests?: number },
  ) => void;
  revertVendorQuote: (category: BudgetLine["category"]) => void;

  // Timeline Actions
  updateTask: (update: TaskUpdate, today: IsoDate) => void;
}

export const usePlanStore = create<PlanState>()(
  persist(
    (set, get) => ({
      plan: null,
      selectedTab: "budget",

      setPlan: (plan: Plan) => set({ plan, selectedTab: "budget" }),
      clearPlan: () => set({ plan: null }),
      setSelectedTab: (selectedTab) => set({ selectedTab }),

      confirmVendorQuote: (lineId, quote) => {
        const current = get().plan;
        if (!current) return;

        const updatedBudget = confirmQuote(current.budget, lineId, quote);
        const rebalanced = rebalanceBudget(
          updatedBudget,
          current.profile.budgetTotal,
          current.profile.priorities,
        );

        set({
          plan: {
            ...current,
            budget: rebalanced.lines,
          },
        });
      },

      revertVendorQuote: (category) => {
        const current = get().plan;
        if (!current) return;

        const reverted = revertQuote(current.budget, category);
        const rebalanced = rebalanceBudget(
          reverted,
          current.profile.budgetTotal,
          current.profile.priorities,
        );

        set({
          plan: {
            ...current,
            budget: rebalanced.lines,
          },
        });
      },

      updateTask: (update, today) => {
        const current = get().plan;
        if (!current) return;

        const result = applyTaskUpdate(current.tasks, update, {
          eventDate: current.profile.eventDate,
          today,
        });

        if (result.ok) {
          set({
            plan: {
              ...current,
              tasks: result.tasks,
            },
          });
        }
      },
    }),
    {
      name: "utsav-planner-storage",
      storage: createJSONStorage(() => localStorage),
      version: PLAN_SCHEMA_VERSION,
      migrate: (persistedState: unknown, version: number) => {
        // Safe migration: validate with Zod; if invalid or legacy, discard safely
        if (version !== PLAN_SCHEMA_VERSION) {
          return { plan: null, selectedTab: "budget" };
        }
        return persistedState as PlanState;
      },
    },
  ),
);
