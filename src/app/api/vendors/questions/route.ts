import { createAiRouteHandler } from "@/lib/http/routeHandler";
import { BudgetCategory, EventProfile } from "@/lib/schemas";
import { createAiClient } from "@/lib/ai/gemini";
import { generateStructured } from "@/lib/ai/generateStructured";
import { AiVendorQuestions } from "@/lib/ai/schemas/leanSchemas";
import { vendorQuestionsPrompt } from "@/lib/ai/prompts";
import { z } from "zod";

export const maxDuration = 30;

const QuestionsRequestSchema = z.object({
  category: BudgetCategory,
  profile: EventProfile,
});

export const POST = createAiRouteHandler({
  schema: QuestionsRequestSchema,
  handler: async ({ category, profile }) => {
    const client = createAiClient();
    const aiResult = await generateStructured({
      client,
      schema: AiVendorQuestions,
      system: `${vendorQuestionsPrompt.system}\nIdentifier: vendor-questions`,
      prompt: vendorQuestionsPrompt.build(category, profile),
      timeoutMs: 20_000,
    });

    if (!aiResult.ok) {
      throw new Error(aiResult.error.message);
    }

    return {
      questions: aiResult.data.questions,
    };
  },
});
