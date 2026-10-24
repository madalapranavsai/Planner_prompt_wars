import { createAiRouteHandler } from "@/lib/http/routeHandler";
import { EventProfile, Plan } from "@/lib/schemas";
import { createAiClient } from "@/lib/ai/gemini";
import { generateStructured } from "@/lib/ai/generateStructured";
import { AiPlanEstimate } from "@/lib/ai/schemas/leanSchemas";
import { mapAiPlanEstimateToBudgetLines } from "@/lib/ai/schemas/mappers";
import { planEstimatePrompt } from "@/lib/ai/prompts";
import { getTemplateTasks } from "@/features/timeline/lib/templates";

export const maxDuration = 30; // Max Vercel serverless duration

export const POST = createAiRouteHandler({
  schema: EventProfile,
  handler: async (profile) => {
    const client = createAiClient();

    // 1. Ask Gemini for realistic category weights & rationale
    const aiResult = await generateStructured({
      client,
      schema: AiPlanEstimate,
      system: planEstimatePrompt.system,
      prompt: planEstimatePrompt.build(profile),
      timeoutMs: 20_000,
    });

    if (!aiResult.ok) {
      throw new Error(aiResult.error.message);
    }

    // 2. Map lean AI estimates to domain BudgetLines with exact rupee allocation
    const budgetLines = mapAiPlanEstimateToBudgetLines(aiResult.data, profile);

    // 3. Attach pre-validated DAG task templates for this occasion
    const tasks = getTemplateTasks(profile.occasion);

    // 4. Construct complete Plan entity
    const plan: Plan = {
      version: 1,
      source: "ai",
      profile,
      budget: budgetLines,
      tasks,
      revisions: [],
    };

    return plan;
  },
});
