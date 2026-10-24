import { ExtractedQuote, Rupees } from "@/lib/schemas";

export interface QuoteTotalResult {
  total: Rupees | null; // null if critical pricing elements are missing
  baseCost: Rupees;
  perGuestCost: Rupees;
  taxesAndCharges: Rupees;
  unknownChargesCount: number;
}

/**
 * Computes exact quote total for a specified guest count.
 * Accurately calculates:
 * - Base cost
 * - Per-guest costs (perGuestCost * guestCount)
 * - Fixed charge amounts
 * - Percentage charges (e.g. 18% GST applied to taxable base)
 */
export function computeQuoteTotal(quote: ExtractedQuote, guestCount: number): QuoteTotalResult {
  if (guestCount < 1) {
    throw new Error(`Guest count must be at least 1, received: ${guestCount}`);
  }

  const baseCost = quote.baseCost ?? 0;
  const perGuestTotal = (quote.perGuestCost ?? 0) * guestCount;
  const subtotal = baseCost + perGuestTotal;

  let fixedCharges = 0;
  let percentCharges = 0;
  let unknownChargesCount = 0;

  for (const charge of quote.charges) {
    if (charge.amount !== null && charge.amount > 0) {
      fixedCharges += charge.amount;
    } else if (charge.percent !== null && charge.percent > 0) {
      // Percentage charge (like GST/Service charge) applied to subtotal
      const amount = Math.round((subtotal * charge.percent) / 100);
      percentCharges += amount;
    } else {
      unknownChargesCount++;
    }
  }

  // If both baseCost and perGuestCost are null, total cannot be computed deterministically
  if (quote.baseCost === null && quote.perGuestCost === null) {
    return {
      total: null,
      baseCost: 0,
      perGuestCost: 0,
      taxesAndCharges: fixedCharges + percentCharges,
      unknownChargesCount,
    };
  }

  const total = subtotal + fixedCharges + percentCharges;

  return {
    total,
    baseCost,
    perGuestCost: perGuestTotal,
    taxesAndCharges: fixedCharges + percentCharges,
    unknownChargesCount,
  };
}
