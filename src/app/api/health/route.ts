import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";

/**
 * Health check endpoint.
 * Exposes deployment status and whether an AI key is present,
 * without making any external Gemini API calls.
 */
export async function GET() {
  let aiConfigured = false;
  let model = "";

  try {
    const env = getServerEnv();
    aiConfigured = !!env.GEMINI_API_KEY || env.AI_PROVIDER === "mock";
    model = env.GEMINI_MODEL;
  } catch {
    aiConfigured = false;
  }

  return NextResponse.json(
    {
      ok: true,
      status: "healthy",
      aiConfigured,
      model,
      timestamp: new Date().toISOString(),
    },
    { status: 200 },
  );
}
