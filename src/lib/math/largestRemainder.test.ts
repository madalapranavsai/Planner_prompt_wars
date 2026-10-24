import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { largestRemainder } from "./largestRemainder";

describe("largestRemainder (Hare-Niemeyer method)", () => {
  it("allocates exactly to the total for concrete examples", () => {
    const weights = [40, 30, 20, 10];
    const total = 100_000;
    const result = largestRemainder(total, weights);

    expect(result).toEqual([40_000, 30_000, 20_000, 10_000]);
    expect(result.reduce((a, b) => a + b, 0)).toBe(total);
  });

  it("handles non-divisible numbers without losing a single rupee", () => {
    // 100 split 3 ways => [34, 33, 33]
    const result = largestRemainder(100, [1, 1, 1]);
    expect(result).toEqual([34, 33, 33]);
    expect(result.reduce((a, b) => a + b, 0)).toBe(100);
  });

  it("handles zero total by returning all zeros", () => {
    const result = largestRemainder(0, [10, 20, 30]);
    expect(result).toEqual([0, 0, 0]);
  });

  it("handles zero weights by distributing equally", () => {
    const result = largestRemainder(10, [0, 0, 0]);
    expect(result.reduce((a, b) => a + b, 0)).toBe(10);
    expect(result).toEqual([4, 3, 3]);
  });

  // Fast-check property test: Sum Invariant holds for ANY arbitrary weights and totals
  it("fast-check: sum of apportioned parts strictly equals total", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10_00_00_000 }), // Up to ₹10 Crore
        fc.array(fc.integer({ min: 0, max: 1000 }), { minLength: 1, maxLength: 20 }),
        (total, weights) => {
          const result = largestRemainder(total, weights);
          // Invariant 1: same length
          expect(result.length).toBe(weights.length);
          // Invariant 2: every element is a non-negative integer
          result.forEach((val) => {
            expect(Number.isInteger(val)).toBe(true);
            expect(val).toBeGreaterThanOrEqual(0);
          });
          // Invariant 3: exact sum preservation
          const sum = result.reduce((acc, v) => acc + v, 0);
          expect(sum).toBe(total);
        },
      ),
      { numRuns: 200 },
    );
  });
});
