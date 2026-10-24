import { z } from "zod";
import { AiClient, AiError } from "./client";
import { Result, ok, err } from "@/lib/result";

export interface GenerateStructuredOptions<T> {
  client: AiClient;
  schema: z.ZodType<T>;
  system: string;
  prompt: string;
  timeoutMs?: number;
}

/**
 * Robust LLM execution orchestrator:
 * 1. Generates JSON using structured output schema constraints.
 * 2. Parses and validates response with Zod.
 * 3. On validation error, performs a targeted single repair attempt.
 * 4. Applies hard timeout via AbortController.
 * 5. Returns strongly typed Result<T, AiError>.
 */
export async function generateStructured<T>(
  opts: GenerateStructuredOptions<T>,
): Promise<Result<T, AiError>> {
  const { client, schema, system, prompt, timeoutMs = 20_000 } = opts;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let rawJson = "";

  try {
    // Generate native JSON Schema with Zod 4
    const jsonSchema = z.toJSONSchema(schema, { target: "draft-7" }) as Record<string, unknown>;

    rawJson = await client.generate({
      system,
      prompt,
      jsonSchema,
      signal: controller.signal,
    });
  } catch (error: unknown) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === "AbortError") {
      return err({
        kind: "timeout",
        message: `AI call timed out after ${timeoutMs}ms`,
        retryable: true,
      });
    }

    const message = error instanceof Error ? error.message : String(error);
    return err({
      kind: "upstream",
      message: `Gemini API request failed: ${message}`,
      retryable: true,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  // First parsing attempt
  try {
    const parsed = JSON.parse(rawJson);
    const validated = schema.safeParse(parsed);

    if (validated.success) {
      return ok(validated.data);
    }

    // Step 2: One automated repair step if first validation failed
    const repairPrompt = [
      prompt,
      `\n--- PREVIOUS OUTPUT HAD SCHEMA VALIDATION ERRORS ---`,
      `Errors: ${validated.error.message}`,
      `Please output the corrected JSON matching the exact schema without commentary.`,
    ].join("\n");

    const repairController = new AbortController();
    const repairTimeoutId = setTimeout(() => repairController.abort(), 10_000);

    try {
      const repairedJson = await client.generate({
        system,
        prompt: repairPrompt,
        jsonSchema: z.toJSONSchema(schema, { target: "draft-7" }) as Record<string, unknown>,
        signal: repairController.signal,
      });

      clearTimeout(repairTimeoutId);
      const repairedParsed = JSON.parse(repairedJson);
      const repairedVal = schema.safeParse(repairedParsed);

      if (repairedVal.success) {
        return ok(repairedVal.data);
      }
    } catch {
      clearTimeout(repairTimeoutId);
    }

    return err({
      kind: "invalid_output",
      message: `AI response failed schema validation: ${validated.error.message}`,
      retryable: true,
    });
  } catch (parseErr) {
    return err({
      kind: "invalid_output",
      message: `Failed to parse AI output as JSON: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
      retryable: true,
    });
  }
}
