import { IsoDate } from "./schemas/common";

/**
 * Pure date-only ISO string (YYYY-MM-DD) manipulation utilities.
 * Completely immune to local time zone shifts, DST changes, and client clock drifts.
 */

/**
 * Adds (or subtracts) a given number of days to an IsoDate string.
 */
export function addDays(dateStr: IsoDate, days: number): IsoDate {
  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const year = parseInt(yearStr ?? "1970", 10);
  const month = parseInt(monthStr ?? "1", 10) - 1; // 0-indexed month
  const day = parseInt(dayStr ?? "1", 10);

  // UTC Date constructor avoids local daylight savings and timezone distortions
  const date = new Date(Date.UTC(year, month, day + days));
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

/**
 * Returns the signed difference in days between two IsoDate strings (a - b).
 * If a is after b, returns positive integer.
 */
export function diffDays(a: IsoDate, b: IsoDate): number {
  const [y1, m1, d1] = a.split("-").map(Number);
  const [y2, m2, d2] = b.split("-").map(Number);

  const utc1 = Date.UTC(y1 ?? 1970, (m1 ?? 1) - 1, d1 ?? 1);
  const utc2 = Date.UTC(y2 ?? 1970, (m2 ?? 1) - 1, d2 ?? 1);

  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.round((utc1 - utc2) / MS_PER_DAY);
}

/**
 * Returns the latest of two IsoDate strings.
 */
export function maxIsoDate(a: IsoDate, b: IsoDate): IsoDate {
  return a >= b ? a : b;
}

/**
 * Returns the earliest of two IsoDate strings.
 */
export function minIsoDate(a: IsoDate, b: IsoDate): IsoDate {
  return a <= b ? a : b;
}

/**
 * Returns current UTC/local day in YYYY-MM-DD format.
 */
export function todayIsoDate(): IsoDate {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Formats YYYY-MM-DD into readable Indian English (e.g. "15 Dec 2026").
 */
export function formatDisplayDate(dateStr: IsoDate): string {
  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const year = parseInt(yearStr ?? "1970", 10);
  const month = parseInt(monthStr ?? "1", 10) - 1;
  const day = parseInt(dayStr ?? "1", 10);
  const date = new Date(Date.UTC(year, month, day));
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
