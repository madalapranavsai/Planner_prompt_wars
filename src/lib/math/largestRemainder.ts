/**
 * Apportions an integer total across items according to given weights using
 * the Largest Remainder Method (Hare-Niemeyer method).
 *
 * Guaranteed invariants:
 * 1. Output length matches weights length.
 * 2. Every allocated value is an integer >= 0.
 * 3. The sum of all allocated values strictly equals total (when total >= 0).
 * 4. Deterministic: identical inputs always yield identical allocations.
 */
export function largestRemainder(total: number, weights: readonly number[]): number[] {
  if (!Number.isInteger(total) || total < 0) {
    throw new Error(`Total must be a non-negative integer, received: ${total}`);
  }

  const n = weights.length;
  if (n === 0) {
    return [];
  }

  if (total === 0) {
    return new Array(n).fill(0);
  }

  // Sanitize and check total weight
  const sanitizedWeights = weights.map((w) => (Number.isFinite(w) && w > 0 ? w : 0));
  const sumWeights = sanitizedWeights.reduce((acc, w) => acc + w, 0);

  // If sum of weights is zero, distribute uniformly across all items
  if (sumWeights === 0) {
    const base = Math.floor(total / n);
    let rem = total - base * n;
    const res = new Array(n).fill(base);
    for (let i = 0; i < n && rem > 0; i++, rem--) {
      res[i] += 1;
    }
    return res;
  }

  // Step 1: calculate exact quotas, floors, and fractional remainders
  interface Candidate {
    index: number;
    floor: number;
    remainder: number;
    weight: number;
  }

  const candidates: Candidate[] = sanitizedWeights.map((w, index) => {
    const quota = (w / sumWeights) * total;
    const floor = Math.floor(quota);
    const remainder = quota - floor;
    return { index, floor, remainder, weight: w };
  });

  const allocated = candidates.map((c) => c.floor);
  const currentSum = allocated.reduce((acc, val) => acc + val, 0);
  const remainderToDistribute = total - currentSum;

  // Step 2: Sort candidates by descending remainder.
  // Tie-breakers: higher original weight first, then lower index (for determinism).
  candidates.sort((a, b) => {
    if (b.remainder !== a.remainder) {
      return b.remainder - a.remainder;
    }
    if (b.weight !== a.weight) {
      return b.weight - a.weight;
    }
    return a.index - b.index;
  });

  // Step 3: Distribute +1 to top candidates until sum === total
  for (let i = 0; i < remainderToDistribute; i++) {
    const targetIdx = candidates[i % n]!.index;
    allocated[targetIdx]! += 1;
  }

  return allocated;
}
