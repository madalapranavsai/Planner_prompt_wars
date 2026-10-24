import { createAiRouteHandler } from "@/lib/http/routeHandler";
import { BudgetCategory } from "@/lib/schemas";
import { createAiClient } from "@/lib/ai/gemini";
import { generateStructured } from "@/lib/ai/generateStructured";
import { AiQuoteComparison } from "@/lib/ai/schemas/leanSchemas";
import { mapAiQuoteComparison } from "@/lib/ai/schemas/mappers";
import { quoteExtractPrompt } from "@/lib/ai/prompts";
import { wrapUntrusted } from "@/lib/security/fence";
import { computeQuoteTotal } from "@/features/vendors/lib/quoteTotals";
import { z } from "zod";

export const maxDuration = 30;

const CompareQuotesSchema = z.object({
  rawQuotes: z
    .string()
    .trim()
    .min(10, "Please provide at least 10 characters of vendor quote text")
    .max(6000),
  guestCount: z.number().int().min(1).max(5000),
  category: BudgetCategory.optional(),
});

export const POST = createAiRouteHandler({
  schema: CompareQuotesSchema,
  handler: async ({ rawQuotes, guestCount }) => {
    const fencedQuotes = wrapUntrusted("RAW_VENDOR_QUOTES", rawQuotes, 6000);

    const client = createAiClient();
    const aiResult = await generateStructured({
      client,
      schema: AiQuoteComparison,
      system: `${quoteExtractPrompt.system}\nIdentifier: quote-extract`,
      prompt: quoteExtractPrompt.build(fencedQuotes, guestCount),
      timeoutMs: 25_000,
    });

    if (!aiResult.ok) {
      throw new Error(aiResult.error.message);
    }

    // 1. Map lean AI response to domain QuoteComparison
    const comparison = mapAiQuoteComparison(aiResult.data);

    // 2. Pure code math: compute exact integer rupee totals, including percentage GST
    const computedTotals = comparison.quotes.map((quote) => computeQuoteTotal(quote, guestCount));

    return {
      comparison,
      totals: computedTotals,
    };
  },
});
