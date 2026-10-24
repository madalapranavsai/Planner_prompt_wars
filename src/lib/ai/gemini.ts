import { GoogleGenAI } from "@google/genai";
import { AiClient, AiGenerateRequest } from "./client";
import { getServerEnv } from "@/lib/env";

/**
 * Official Google GenAI SDK integration.
 * The only file in the codebase that imports @google/genai.
 */
export class GeminiAiClient implements AiClient {
  private client: GoogleGenAI;
  private modelName: string;

  constructor(apiKey: string, modelName: string) {
    this.client = new GoogleGenAI({ apiKey });
    this.modelName = modelName;
  }

  async generate(req: AiGenerateRequest): Promise<string> {
    const { system, prompt, jsonSchema } = req;

    const fullPrompt = `${system}\n\n${prompt}`;

    // Use current interactions API with JSON schema constraint
    const interaction = await this.client.interactions.create({
      model: this.modelName,
      input: fullPrompt,
      response_format: jsonSchema
        ? {
            type: "text",
            mime_type: "application/json",
            schema: jsonSchema,
          }
        : {
            type: "text",
            mime_type: "text/plain",
          },
    });

    return interaction.output_text ?? "";
  }
}

import { FakeAiClient } from "./fake";

/**
 * Factory creating active AiClient according to server environment.
 */
export function createAiClient(): AiClient {
  const env = getServerEnv();

  if (env.AI_PROVIDER === "mock") {
    return new FakeAiClient();
  }

  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured on server.");
  }

  return new GeminiAiClient(env.GEMINI_API_KEY, env.GEMINI_MODEL);
}
