import { describe, it, expect } from "vitest";
import { addDays, diffDays, maxIsoDate, minIsoDate } from "./dates";

describe("dates module (pure date-only ISO)", () => {
  it("adds and subtracts days correctly across month/year boundaries", () => {
    expect(addDays("2027-02-28", 1)).toBe("2027-03-01"); // non-leap year
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29"); // leap year
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
    expect(addDays("2027-05-10", 14)).toBe("2027-05-24");
  });

  it("calculates exact signed difference in days", () => {
    expect(diffDays("2027-05-24", "2027-05-10")).toBe(14);
    expect(diffDays("2027-05-10", "2027-05-24")).toBe(-14);
    expect(diffDays("2027-01-01", "2027-01-01")).toBe(0);
  });

  it("finds min and max date correctly", () => {
    expect(maxIsoDate("2027-01-01", "2027-05-01")).toBe("2027-05-01");
    expect(minIsoDate("2027-01-01", "2027-05-01")).toBe("2027-01-01");
  });
});
