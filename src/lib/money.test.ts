import { describe, it, expect } from "vitest";
import { formatINR, parseINR } from "./money";

describe("formatINR", () => {
  it("formats numbers in standard Indian commas (Lakhs / Crores)", () => {
    expect(formatINR(0)).toBe("₹0");
    expect(formatINR(500)).toBe("₹500");
    expect(formatINR(5000)).toBe("₹5,000");
    expect(formatINR(800000)).toBe("₹8,00,000");
    expect(formatINR(15000000)).toBe("₹1,50,00,000");
  });

  it("formats compact notation correctly", () => {
    expect(formatINR(800000, { compact: true })).toBe("₹8 Lakh");
    expect(formatINR(850000, { compact: true })).toBe("₹8.5 Lakh");
    expect(formatINR(15000000, { compact: true })).toBe("₹1.5 Crore");
    expect(formatINR(50000, { compact: true })).toBe("₹50k");
  });
});

describe("parseINR", () => {
  it("parses text and colloquial Indian numeric terms into integer Rupees", () => {
    expect(parseINR("₹8,00,000")).toBe(800000);
    expect(parseINR("8L")).toBe(800000);
    expect(parseINR("8 lakh")).toBe(800000);
    expect(parseINR("1.5 crore")).toBe(15000000);
    expect(parseINR("1.5cr")).toBe(15000000);
    expect(parseINR("50k")).toBe(50000);
    expect(parseINR("50000")).toBe(50000);
    expect(parseINR("invalid text")).toBeNull();
    expect(parseINR("")).toBeNull();
  });
});
