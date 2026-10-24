/**
 * Currency and Indian numbering system formatting utilities (₹, Lakh, Crore).
 * All monetary amounts are integers (Rupees).
 */

/**
 * Formats an integer amount in Indian Rupee format.
 * Examples:
 *   formatINR(800000) => "₹8,00,000"
 *   formatINR(800000, { compact: true }) => "₹8 Lakh"
 *   formatINR(15000000, { compact: true }) => "₹1.5 Crore"
 */
export function formatINR(amount: number, opts?: { compact?: boolean | undefined }): string {
  if (!Number.isFinite(amount)) return "₹0";

  const isNegative = amount < 0;
  const absAmount = Math.abs(Math.round(amount));

  if (opts?.compact) {
    if (absAmount >= 1_00_00_000) {
      const crore = absAmount / 1_00_00_000;
      const formatted = crore % 1 === 0 ? crore.toFixed(0) : crore.toFixed(2).replace(/\.?0+$/, "");
      return `${isNegative ? "-" : ""}₹${formatted} Crore`;
    }
    if (absAmount >= 1_00_000) {
      const lakh = absAmount / 1_00_000;
      const formatted = lakh % 1 === 0 ? lakh.toFixed(0) : lakh.toFixed(2).replace(/\.?0+$/, "");
      return `${isNegative ? "-" : ""}₹${formatted} Lakh`;
    }
    if (absAmount >= 1_000) {
      const k = absAmount / 1_000;
      const formatted = k % 1 === 0 ? k.toFixed(0) : k.toFixed(1).replace(/\.?0+$/, "");
      return `${isNegative ? "-" : ""}₹${formatted}k`;
    }
  }

  // Standard Indian comma grouping: 3 digits from right, then groups of 2 digits
  // e.g. 12345678 -> 1,23,45,678
  const s = absAmount.toString();
  if (s.length <= 3) {
    return `${isNegative ? "-" : ""}₹${s}`;
  }

  const lastThree = s.slice(-3);
  const otherNumbers = s.slice(0, -3);
  const formattedOther = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",");

  return `${isNegative ? "-" : ""}₹${formattedOther},${lastThree}`;
}

/**
 * Parses user input strings into integer Rupees.
 * Supports:
 *   "₹8,00,000" -> 800000
 *   "8 lakh" / "8L" -> 800000
 *   "1.5 Crore" / "1.5cr" -> 15000000
 *   "50k" -> 50000
 *   "800000" -> 800000
 */
export function parseINR(input: string): number | null {
  if (!input || typeof input !== "string") return null;

  const trimmed = input.trim().toLowerCase().replace(/,/g, "").replace(/₹/g, "");
  if (!trimmed) return null;

  // Crore match: e.g. "1.5 crore", "1.5cr", "2crores"
  const croreMatch = trimmed.match(/^([\d.]+)\s*(?:cr|crore|crores)$/);
  if (croreMatch && croreMatch[1]) {
    const val = parseFloat(croreMatch[1]);
    return Number.isFinite(val) ? Math.round(val * 1_00_00_000) : null;
  }

  // Lakh match: e.g. "8 lakh", "8l", "12.5lakhs"
  const lakhMatch = trimmed.match(/^([\d.]+)\s*(?:l|lakh|lakhs|lac|lacs)$/);
  if (lakhMatch && lakhMatch[1]) {
    const val = parseFloat(lakhMatch[1]);
    return Number.isFinite(val) ? Math.round(val * 1_00_000) : null;
  }

  // Thousand match: e.g. "50k", "50 k"
  const kMatch = trimmed.match(/^([\d.]+)\s*k$/);
  if (kMatch && kMatch[1]) {
    const val = parseFloat(kMatch[1]);
    return Number.isFinite(val) ? Math.round(val * 1_000) : null;
  }

  // Direct number
  const num = parseFloat(trimmed);
  if (Number.isFinite(num) && num >= 0) {
    return Math.round(num);
  }

  return null;
}
