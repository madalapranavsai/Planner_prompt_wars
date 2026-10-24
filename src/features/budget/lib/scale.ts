import { BudgetLine, BudgetCategory, Rupees } from "@/lib/schemas";

export interface StaleQuoteWarning {
  lineId: string;
  category: BudgetCategory;
  vendorName: string;
  quotedForGuests: number;
  newGuestCount: number;
  message: string;
}

/**
 * Scales budget lines when the guest count changes.
 *
 * Rules:
 * 1. Unconfirmed lines with `per_guest` pricing scale proportionally: amount = perGuest * toGuests.
 * 2. Unconfirmed fixed lines remain completely unchanged.
 * 3. Confirmed quotes are NEVER modified in amount, preserving real-world vendor contracts.
 * 4. If a confirmed quote had `per_guest` pricing and quotedForGuests !== toGuests,
 *    a StaleQuoteWarning is raised so the user knows they may need to renegotiate.
 */
export function scaleForGuests(
  lines: readonly BudgetLine[],
  toGuests: number,
): { lines: BudgetLine[]; staleQuotes: StaleQuoteWarning[] } {
  if (!Number.isInteger(toGuests) || toGuests < 1) {
    throw new Error(`Guest count must be a positive integer, received: ${toGuests}`);
  }

  const staleQuotes: StaleQuoteWarning[] = [];

  const updatedLines: BudgetLine[] = lines.map((line) => {
    if (line.source === "confirmed_quote") {
      if (line.pricing.kind === "per_guest" && line.quotedForGuests !== toGuests) {
        staleQuotes.push({
          lineId: line.id,
          category: line.category,
          vendorName: line.vendorName,
          quotedForGuests: line.quotedForGuests ?? 0,
          newGuestCount: toGuests,
          message: `Confirmed quote from "${line.vendorName}" was quoted for ${line.quotedForGuests} guests, but guest count is now ${toGuests}. Verify pricing with vendor.`,
        });
      }
      return { ...line };
    }

    // AI estimate
    if (line.pricing.kind === "per_guest") {
      const newAmount: Rupees = line.pricing.perGuest * toGuests;
      return {
        ...line,
        amount: newAmount,
      };
    }

    return { ...line };
  });

  return { lines: updatedLines, staleQuotes };
}
