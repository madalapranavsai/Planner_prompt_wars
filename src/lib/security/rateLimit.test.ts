import { describe, it, expect } from "vitest";
import { createRateLimiter, DailyCounter } from "./rateLimit";

describe("Rate Limiting and Daily AI Quota", () => {
  it("enforces sliding window rate limit per IP", () => {
    const limiter = createRateLimiter({ limit: 3, windowMs: 1000 });
    const ip = "192.168.1.1";

    expect(limiter.check(ip, 100).allowed).toBe(true);
    limiter.record(ip, 100);

    expect(limiter.check(ip, 200).allowed).toBe(true);
    limiter.record(ip, 200);

    expect(limiter.check(ip, 300).allowed).toBe(true);
    limiter.record(ip, 300);

    // 4th request inside 1000ms window should be blocked
    const check4 = limiter.check(ip, 400);
    expect(check4.allowed).toBe(false);
    expect(check4.retryAfterMs).toBeGreaterThan(0);

    // After window expires (> 1100ms)
    expect(limiter.check(ip, 1200).allowed).toBe(true);
  });

  it("enforces daily AI call cap", () => {
    const counter = new DailyCounter();
    const limit = 2;
    const now = new Date("2027-01-01T10:00:00Z");

    const res1 = counter.increment(limit, now);
    expect(res1.allowed).toBe(true);
    expect(res1.remaining).toBe(1);

    const res2 = counter.increment(limit, now);
    expect(res2.allowed).toBe(true);
    expect(res2.remaining).toBe(0);

    const res3 = counter.increment(limit, now);
    expect(res3.allowed).toBe(false);

    // Next day resets count
    const nextDay = new Date("2027-01-02T10:00:00Z");
    const resNext = counter.increment(limit, nextDay);
    expect(resNext.allowed).toBe(true);
  });
});
