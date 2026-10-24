import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createRateLimiter, globalDailyAiCounter } from "@/lib/security/rateLimit";
import { getServerEnv } from "@/lib/env";

const ipLimiter = createRateLimiter({
  limit: 20, // 20 requests
  windowMs: 60_000, // per minute per IP
});

export interface RouteHandlerOptions<TInput, TOutput> {
  schema: z.ZodType<TInput>;
  maxBodyBytes?: number;
  handler: (input: TInput, req: NextRequest) => Promise<TOutput>;
}

export function createAiRouteHandler<TInput, TOutput>(opts: RouteHandlerOptions<TInput, TOutput>) {
  return async function (req: NextRequest) {
    // 1. IP Rate Limiting
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const ipCheck = ipLimiter.check(ip);
    if (!ipCheck.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            kind: "rate_limited",
            message: `Rate limit exceeded. Please wait ${Math.ceil(ipCheck.retryAfterMs / 1000)} seconds.`,
            retryable: true,
          },
        },
        { status: 429 },
      );
    }
    ipLimiter.record(ip);

    // 2. Global Daily AI Cap Check
    const env = getServerEnv();
    const capCheck = globalDailyAiCounter.increment(env.AI_DAILY_CALL_CAP);
    if (!capCheck.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            kind: "rate_limited",
            message: `Daily AI usage limit reached. Try the "Load Demo Wedding" mode to explore all planner capabilities offline.`,
            retryable: false,
          },
        },
        { status: 429 },
      );
    }

    // 3. Request Body Size & JSON validation
    const maxBytes = opts.maxBodyBytes ?? 32 * 1024; // 32 KB default
    let body: unknown;

    try {
      const text = await req.text();
      if (text.length > maxBytes) {
        return NextResponse.json(
          {
            ok: false,
            error: {
              kind: "validation",
              message: `Payload too large. Maximum allowed size is ${Math.round(maxBytes / 1024)} KB.`,
              retryable: false,
            },
          },
          { status: 413 },
        );
      }

      body = text ? JSON.parse(text) : {};
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: {
            kind: "validation",
            message: "Invalid JSON in request body",
            retryable: false,
          },
        },
        { status: 400 },
      );
    }

    // 4. Zod Schema Validation
    const validation = opts.schema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            kind: "validation",
            message: "Validation failed",
            details: validation.error.format(),
            retryable: false,
          },
        },
        { status: 400 },
      );
    }

    // 5. Execute Handler
    try {
      const result = await opts.handler(validation.data, req);
      return NextResponse.json({ ok: true, data: result }, { status: 200 });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Internal server error";
      return NextResponse.json(
        {
          ok: false,
          error: {
            kind: "upstream",
            message,
            retryable: true,
          },
        },
        { status: 500 },
      );
    }
  };
}
