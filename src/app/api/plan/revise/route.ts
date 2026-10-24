import { createAiRouteHandler } from "@/lib/http/routeHandler";
import { Plan, IsoDate } from "@/lib/schemas";
import { createAiClient } from "@/lib/ai/gemini";
import { generateStructured } from "@/lib/ai/generateStructured";
import { AiRevisionParse } from "@/lib/ai/schemas/leanSchemas";
import { mapAiRevisionToPlanChanges } from "@/lib/ai/schemas/mappers";
import { revisionParsePrompt } from "@/lib/ai/prompts";
import { fenceUntrustedInput } from "@/lib/security/fence";
import { applyPlanChanges } from "@/features/revision/lib/applyChanges";
import { computePlanDiff } from "@/features/revision/lib/diff";
import { z } from "zod";

export const maxDuration = 30;

const ReviseRequestSchema = z.object({
  plan: Plan,
  userPrompt: z.string().trim().min(1, "Curveball prompt cannot be empty").max(1000),
});

export const POST = createAiRouteHandler({
  schema: ReviseRequestSchema,
  handler: async ({ plan, userPrompt }) => {
    const today: IsoDate = new Date().toISOString().slice(0, 10) as IsoDate;

    // Build context summary for Gemini
    const confirmedCount = plan.budget.filter((b) => b.source === "confirmed_quote").length;
    const contextSummary = [
      `Occasion: ${plan.profile.occasion} in ${plan.profile.city}`,
      `Current Date: ${plan.profile.eventDate}`,
      `Guest Count: ${plan.profile.guestCount}`,
      `Total Budget: ₹${plan.profile.budgetTotal.toLocaleString("en-IN")}`,
      `Confirmed Quotes Locked: ${confirmedCount}`,
      `Priorities: ${plan.profile.priorities.join(", ")}`,
      `Categories: ${plan.budget.map((b) => `${b.category}: ₹${b.amount} (${b.source})`).join("; ")}`,
    ].join("\n");

    const fencedPrompt = fenceUntrustedInput(userPrompt);

    const client = createAiClient();
    const aiResult = await generateStructured({
      client,
      schema: AiRevisionParse,
      system: `${revisionParsePrompt.system}\nEnsure prompt identifier: revision-parse`,
      prompt: revisionParsePrompt.build(fencedPrompt, contextSummary),
      timeoutMs: 20_000,
    });

    if (!aiResult.ok) {
      throw new Error(aiResult.error.message);
    }

    // 1. Map lean schema to domain change set
    const changeSet = mapAiRevisionToPlanChanges(aiResult.data);

    // 2. Deterministically apply changes
    const { updatedPlan, warnings } = applyPlanChanges(plan, changeSet, today);

    // 3. Compute structured PlanDiff
    const diff = computePlanDiff(plan, updatedPlan, today, warnings);

    return {
      updatedPlan,
      diff,
      interpretation: changeSet.interpretation,
      warnings,
    };
  },
});
