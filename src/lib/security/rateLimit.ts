export interface RateLimiter {
  check(key: string, now?: number): { allowed: boolean; retryAfterMs: number };
  record(key: string, now?: number): void;
}

/**
 * Creates a token bucket / sliding window rate limiter in memory.
 * Backed by an interface so it can be swapped for Redis / Upstash in high-traffic multi-region setups.
 */
export function createRateLimiter(opts: { limit: number; windowMs: number }): RateLimiter {
  const { limit, windowMs } = opts;
  const requests = new Map<string, number[]>();

  return {
    check(key: string, now: number = Date.now()): { allowed: boolean; retryAfterMs: number } {
      const timestamps = requests.get(key) ?? [];
      const windowStart = now - windowMs;
      const validTimestamps = timestamps.filter((t) => t > windowStart);
      requests.set(key, validTimestamps);

      if (validTimestamps.length >= limit) {
        const oldest = validTimestamps[0]!;
        const retryAfterMs = Math.max(0, oldest + windowMs - now);
        return { allowed: false, retryAfterMs };
      }

      return { allowed: true, retryAfterMs: 0 };
    },

    record(key: string, now: number = Date.now()): void {
      const timestamps = requests.get(key) ?? [];
      const windowStart = now - windowMs;
      const validTimestamps = timestamps.filter((t) => t > windowStart);
      validTimestamps.push(now);
      requests.set(key, validTimestamps);
    },
  };
}

/**
 * Global daily counter to cap AI calls per serverless instance.
 */
export class DailyCounter {
  private count = 0;
  private currentDay = new Date().toISOString().slice(0, 10);

  increment(limit: number, now: Date = new Date()): { allowed: boolean; remaining: number } {
    const dayStr = now.toISOString().slice(0, 10);
    if (dayStr !== this.currentDay) {
      this.currentDay = dayStr;
      this.count = 0;
    }

    if (this.count >= limit) {
      return { allowed: false, remaining: 0 };
    }

    this.count++;
    return { allowed: true, remaining: limit - this.count };
  }

  getCount(): number {
    return this.count;
  }

  reset(): void {
    this.count = 0;
  }
}

export const globalDailyAiCounter = new DailyCounter();
