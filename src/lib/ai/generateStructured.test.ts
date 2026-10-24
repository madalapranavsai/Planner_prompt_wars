import { describe, it, expect } from "vitest";
import { z } from "zod";
import { generateStructured } from "./generateStructured";
import { FakeAiClient } from "./fake";

describe("generateStructured", () => {
  const SampleSchema = z.object({
    name: z.string(),
    count: z.number(),
  });

  it("successfully parses valid JSON from AiClient", async () => {
    const fake = new FakeAiClient(() => JSON.stringify({ name: "Wedding", count: 200 }));

    const res = await generateStructured({
      client: fake,
      schema: SampleSchema,
      system: "System prompt",
      prompt: "User prompt",
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.name).toBe("Wedding");
      expect(res.data.count).toBe(200);
    }
  });

  it("triggers repair loop on invalid first response and recovers", async () => {
    let callNum = 0;
    const fake = new FakeAiClient(() => {
      callNum++;
      if (callNum === 1) {
        // Missing 'count' property
        return JSON.stringify({ name: "Invalid first attempt" });
      }
      // Repaired output
      return JSON.stringify({ name: "Repaired", count: 50 });
    });

    const res = await generateStructured({
      client: fake,
      schema: SampleSchema,
      system: "System prompt",
      prompt: "User prompt",
    });

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.name).toBe("Repaired");
      expect(res.data.count).toBe(50);
    }
    expect(callNum).toBe(2);
  });

  it("handles unparseable text with typed invalid_output error", async () => {
    const fake = new FakeAiClient(() => "Not JSON at all");

    const res = await generateStructured({
      client: fake,
      schema: SampleSchema,
      system: "System prompt",
      prompt: "User prompt",
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.kind).toBe("invalid_output");
      expect(res.error.retryable).toBe(true);
    }
  });
});
