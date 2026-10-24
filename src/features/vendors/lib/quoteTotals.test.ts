import { describe, it, expect } from "vitest";
import { computeQuoteTotal } from "./quoteTotals";
import { ExtractedQuote } from "@/lib/schemas";

describe("computeQuoteTotal", () => {
  const quoteWithGST: ExtractedQuote = {
    vendorName: "Grand Caterers",
    baseCost: 50_000,
    perGuestCost: 800,
    charges: [
      {
        label: "GST",
        amount: null,
        percent: 18, // 18% GST
        kind: "tax",
      },
      {
        label: "Cleaning Fee",
        amount: 5000,
        percent: null,
        kind: "service_charge",
      },
    ],
    includedItems: ["Plates", "Cutlery"],
    missingItems: ["Dessert counter"],
    ambiguities: [],
    suspiciousInstructionsDetected: false,
  };

  it("applies guest count, base cost, percentage taxes, and fixed fees accurately", () => {
    // 200 guests:
    // Base = 50,000
    // Per-guest = 800 * 200 = 160,000
    // Subtotal = 210,000
    // Fixed fee = 5,000
    // 18% GST on 210,000 = 37,800
    // Total = 210,000 + 5,000 + 37,800 = 252,800
    const res = computeQuoteTotal(quoteWithGST, 200);

    expect(res.baseCost).toBe(50_000);
    expect(res.perGuestCost).toBe(160_000);
    expect(res.taxesAndCharges).toBe(5_000 + 37_800);
    expect(res.total).toBe(252_800);
    expect(res.unknownChargesCount).toBe(0);
  });
});
