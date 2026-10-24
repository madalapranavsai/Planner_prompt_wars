import { z } from "zod";
import { Rupees } from "./common";

export const RawVendorQuote = z.object({
  vendorName: z.string().trim().min(1, "Vendor name is required").max(100),
  text: z.string().trim().min(20, "Quote text must have at least 20 characters").max(8_000),
});

export type RawVendorQuote = z.infer<typeof RawVendorQuote>;

export const QuoteChargeKind = z.enum(["tax", "service_charge", "hidden_fee", "other"]);
export type QuoteChargeKind = z.infer<typeof QuoteChargeKind>;

export const ExtractedQuoteCharge = z.object({
  label: z.string().trim().min(1).max(80),
  amount: Rupees.nullable(),
  percent: z.number().min(0).max(100).nullable(), // e.g. 18 for 18% GST
  kind: QuoteChargeKind,
});

export type ExtractedQuoteCharge = z.infer<typeof ExtractedQuoteCharge>;

export const ExtractedQuote = z.object({
  vendorName: z.string().trim().min(1).max(100),
  baseCost: Rupees.nullable(),
  perGuestCost: Rupees.nullable(),
  charges: z.array(ExtractedQuoteCharge).max(20),
  includedItems: z.array(z.string().trim().max(100)).max(30),
  missingItems: z.array(z.string().trim().max(100)).max(20),
  ambiguities: z.array(z.string().trim().max(200)).max(10),
  suspiciousInstructionsDetected: z.boolean(),
});

export type ExtractedQuote = z.infer<typeof ExtractedQuote>;

export const QuoteComparison = z.object({
  quotes: z.array(ExtractedQuote).min(2).max(3),
  questionsToAsk: z.array(z.string().trim().max(200)).length(3),
  summary: z.string().trim().max(600),
});

export type QuoteComparison = z.infer<typeof QuoteComparison>;
