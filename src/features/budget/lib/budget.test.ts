import { describe, it, expect } from "vitest";
import { BudgetLine, BudgetCategory } from "@/lib/schemas";
import { rebalanceBudget, confirmQuote } from "./rebalance";
import { scaleForGuests } from "./scale";
import { suggestTradeoffs } from "./tradeoffs";

describe("Budget Engine", () => {
  const initialLines: BudgetLine[] = [
    {
      id: "line-venue",
      category: "venue",
      label: "Banquet Hall",
      amount: 400_000,
      floor: 200_000,
      pricing: { kind: "fixed" },
      source: "ai_estimate",
      confidence: "high",
      rationale: "Market average",
    },
    {
      id: "line-catering",
      category: "catering",
      label: "Dinner Buffet",
      amount: 200_000,
      floor: 100_000,
      pricing: { kind: "per_guest", perGuest: 1000 },
      source: "ai_estimate",
      confidence: "medium",
      rationale: "₹1,000 per plate for 200 guests",
    },
    {
      id: "line-decor",
      category: "decor",
      label: "Floral & Mandap",
      amount: 150_000,
      floor: 50_000,
      pricing: { kind: "fixed" },
      source: "ai_estimate",
      confidence: "medium",
      rationale: "Standard decor",
    },
    {
      id: "line-photo",
      category: "photography",
      label: "Candid Photo & Video",
      amount: 50_000,
      floor: 30_000,
      pricing: { kind: "fixed" },
      source: "ai_estimate",
      confidence: "low",
      rationale: "Basic coverage",
    },
  ];

  const totalBudget = 800_000;
  const priorities: BudgetCategory[] = ["venue", "catering", "photography", "decor"];

  it("confirms quote and never modifies confirmed line amounts during rebalance", () => {
    // Confirm venue quote with an overrun (+₹1,00,000 over estimate)
    const withConfirmedVenue = confirmQuote(initialLines, "line-venue", {
      amount: 500_000,
      vendorName: "Grand Palace Hotel",
      on: "2027-02-14",
    });

    const venue = withConfirmedVenue.find((l) => l.id === "line-venue")!;
    expect(venue.source).toBe("confirmed_quote");
    expect(venue.amount).toBe(500_000);

    // Rebalance total ₹8 Lakh budget
    const result = rebalanceBudget(withConfirmedVenue, totalBudget, priorities);

    // Confirmed venue must stay exactly ₹5,00,000
    const rebalancedVenue = result.lines.find((l) => l.id === "line-venue")!;
    expect(rebalancedVenue.amount).toBe(500_000);
    expect(rebalancedVenue.source).toBe("confirmed_quote");

    // Overrun should be absorbed by unconfirmed lines (lowest priority 'decor' cut first)
    expect(result.absorbed).toBe(100_000);
    expect(result.unresolved).toBe(0);

    const rebalancedDecor = result.lines.find((l) => l.id === "line-decor")!;
    expect(rebalancedDecor.amount).toBeLessThan(150_000);
    expect(rebalancedDecor.amount).toBeGreaterThanOrEqual(rebalancedDecor.floor);
  });

  it("fast-check: confirmed quotes remain byte-identical through any rebalance", () => {
    const withConfirmed = confirmQuote(initialLines, "line-venue", {
      amount: 450_000,
      vendorName: "Heritage Lawn",
      on: "2027-01-10",
    });
    const confirmedOriginal = withConfirmed.find((l) => l.id === "line-venue")!;

    const result = rebalanceBudget(withConfirmed, 700_000, priorities);
    const confirmedAfter = result.lines.find((l) => l.id === "line-venue")!;

    expect(confirmedAfter).toEqual(confirmedOriginal);
  });

  it("never reduces any line below its configured floor", () => {
    // Extreme overrun of ₹5,00,000
    const extremeLines = initialLines.map((l) => ({ ...l }));
    const result = rebalanceBudget(extremeLines, 300_000, priorities);

    result.lines.forEach((l) => {
      expect(l.amount).toBeGreaterThanOrEqual(l.floor);
    });
    expect(result.unresolved).toBeGreaterThan(0);
  });

  it("allocates surplus to contingency when quote is cheaper", () => {
    // Venue quote is ₹1,00,000 cheaper than estimate (₹300k instead of ₹400k)
    const cheaper = confirmQuote(initialLines, "line-venue", {
      amount: 300_000,
      vendorName: "Community Hall",
      on: "2027-03-01",
    });

    const result = rebalanceBudget(cheaper, totalBudget, priorities);
    expect(result.surplusToContingency).toBe(100_000);
    const contingency = result.lines.find((l) => l.category === "contingency");
    expect(contingency).toBeDefined();
    expect(contingency!.amount).toBe(100_000);
  });

  it("scales per-guest unconfirmed lines with guest count and warns on confirmed quotes", () => {
    const withConfirmedCatering = confirmQuote(initialLines, "line-catering", {
      amount: 250_000,
      vendorName: "Royal Caterers",
      on: "2027-01-15",
      guests: 200,
    });

    // Scale to 250 guests
    const scaled = scaleForGuests(withConfirmedCatering, 250);

    // Confirmed catering remains untouched
    const cat = scaled.lines.find((l) => l.id === "line-catering")!;
    expect(cat.amount).toBe(250_000);

    // Stale quote warning should be generated
    expect(scaled.staleQuotes.length).toBe(1);
    expect(scaled.staleQuotes[0]!.vendorName).toBe("Royal Caterers");
  });

  it("suggests trade-offs when overrun exceeds 20%", () => {
    const planMock = {
      version: 1 as const,
      source: "ai" as const,
      profile: {
        occasion: "wedding" as const,
        budgetTotal: 500_000,
        guestCount: 200,
        eventDate: "2027-10-10",
        city: "Hyderabad",
        vibe: "Elegant",
        ageGroups: ["adults" as const],
        accessibilityNeeds: [],
        priorities: ["venue" as const, "catering" as const],
      },
      budget: initialLines,
      tasks: [],
      revisions: [],
    };

    // Budget is 500k, lines sum to 800k => 60% overrun
    const rebalanceRes = rebalanceBudget(initialLines, 500_000, priorities);
    const tradeoffs = suggestTradeoffs(planMock, rebalanceRes);

    expect(tradeoffs.length).toBeGreaterThan(0);
    const guestTradeoff = tradeoffs.find((t) => t.kind === "reduce_guests");
    expect(guestTradeoff).toBeDefined();
    expect(guestTradeoff!.actionableChange.type).toBe("guests_delta");
  });
});
