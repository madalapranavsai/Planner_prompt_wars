/**
 * Verification script: calls real Gemini API once per lean schema using configured GEMINI_API_KEY.
 * Usage: npm run check:ai
 */
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import {
  AiPlanEstimate,
  AiRevisionParse,
  AiQuoteComparison,
} from "../src/lib/ai/schemas/leanSchemas";

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL || "gemini-3.8-flash";

  if (!apiKey) {
    console.log("⚠️  GEMINI_API_KEY is not set in environment. Skipping live Gemini schema check.");
    process.exit(0);
  }

  console.log(`🔍 Verifying live Gemini structured output with model "${modelName}"...`);
  const client = new GoogleGenAI({ apiKey });

  // Test 1: Plan Estimate
  console.log("➡️ Testing AiPlanEstimate schema...");
  const estimateSchema = z.toJSONSchema(AiPlanEstimate, { target: "draft-7" });
  const res1 = await client.interactions.create({
    model: modelName,
    input: "Generate budget weights for a 200 guest Indian wedding in Jaipur with ₹15 Lakh budget.",
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: estimateSchema as Record<string, unknown>,
    },
  });

  const parsed1 = AiPlanEstimate.safeParse(JSON.parse(res1.output_text ?? "{}"));
  if (!parsed1.success) {
    console.error("❌ AiPlanEstimate schema validation failed:", parsed1.error);
    process.exit(1);
  }
  console.log("✅ AiPlanEstimate validated successfully!");

  // Test 2: Revision Parse
  console.log("➡️ Testing AiRevisionParse schema...");
  const revisionSchema = z.toJSONSchema(AiRevisionParse, { target: "draft-7" });
  const res2 = await client.interactions.create({
    model: modelName,
    input: "Add 50 guests and cut budget by ₹2 Lakh.",
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: revisionSchema as Record<string, unknown>,
    },
  });

  const parsed2 = AiRevisionParse.safeParse(JSON.parse(res2.output_text ?? "{}"));
  if (!parsed2.success) {
    console.error("❌ AiRevisionParse schema validation failed:", parsed2.error);
    process.exit(1);
  }
  console.log("✅ AiRevisionParse validated successfully!");

  // Test 3: Quote Comparison
  console.log("➡️ Testing AiQuoteComparison schema...");
  const quoteSchema = z.toJSONSchema(AiQuoteComparison, { target: "draft-7" });
  const res3 = await client.interactions.create({
    model: modelName,
    input:
      "Extract structured quote comparison for: Vendor A: ₹3L base + 18% GST. Vendor B: ₹3.5L all inclusive.",
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: quoteSchema as Record<string, unknown>,
    },
  });

  const parsed3 = AiQuoteComparison.safeParse(JSON.parse(res3.output_text ?? "{}"));
  if (!parsed3.success) {
    console.error("❌ AiQuoteComparison schema validation failed:", parsed3.error);
    process.exit(1);
  }
  console.log("✅ AiQuoteComparison validated successfully!");

  console.log("🎉 All live Gemini schemas verified successfully!");
}

main().catch((err) => {
  console.error("Fatal error during check:ai:", err);
  process.exit(1);
});
