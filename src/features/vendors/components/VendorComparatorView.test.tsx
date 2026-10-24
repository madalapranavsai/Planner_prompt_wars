import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { axe } from "vitest-axe";
import { VendorComparatorView } from "./VendorComparatorView";
import { usePlanStore } from "@/store/planStore";
import { Plan } from "@/lib/schemas";

const mockPlan: Plan = {
  version: 1,
  source: "demo",
  profile: {
    occasion: "wedding",
    eventDate: "2026-11-20",
    guestCount: 200,
    budgetTotal: 800_000,
    city: "Hyderabad",
    vibe: "grand",
    ageGroups: ["adults"],
    accessibilityNeeds: [],
    priorities: ["venue", "catering", "photography", "decor"],
  },
  budget: [
    {
      id: "b-venue",
      category: "venue",
      label: "Banquet Hall",
      amount: 400_000,
      floor: 200_000,
      pricing: { kind: "fixed" },
      source: "ai_estimate",
      confidence: "high",
      rationale: "Banquet venue",
    },
    {
      id: "b-catering",
      category: "catering",
      label: "Dinner Buffet",
      amount: 200_000,
      floor: 100_000,
      pricing: { kind: "per_guest", perGuest: 1000 },
      source: "ai_estimate",
      confidence: "medium",
      rationale: "Per guest catering",
    },
  ],
  tasks: [],
  revisions: [],
};

describe("VendorComparatorView", () => {
  beforeEach(() => {
    usePlanStore.setState({
      plan: mockPlan,
      selectedTab: "vendors",
    });
  });

  it("renders quote comparator and passes axe accessibility audit", async () => {
    const { container } = render(<VendorComparatorView />);

    expect(screen.getByText("Vendor Quote Comparator")).toBeDefined();
    expect(screen.getByText("Sample Venue Quotes")).toBeDefined();
    expect(screen.getByText("Sample Catering Quotes")).toBeDefined();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("loads sample quote, compares vendors, and allows locking a vendor quote", async () => {
    render(<VendorComparatorView />);

    // Click on Sample Venue Quotes
    const loadSampleBtn = screen.getByText("Sample Venue Quotes");
    fireEvent.click(loadSampleBtn);

    // Verify textarea populated
    const textarea = screen.getByLabelText(/raw quote text/i) as HTMLTextAreaElement;
    expect(textarea.value).toContain("Grand Palace");

    // Click Unbundle & Compare
    const compareBtn = screen.getByRole("button", { name: /compare quotes/i });
    fireEvent.click(compareBtn);

    // Wait for comparison cards to appear
    await waitFor(() => {
      expect(screen.getByText("Grand Palace Banquets & Lawns")).toBeDefined();
    });

    expect(screen.getByText("Regal Heritage Resort")).toBeDefined();
    expect(screen.getByText("Comparative Verdict")).toBeDefined();
    expect(screen.getByText("Critical Pre-Signing Negotiation Questions")).toBeDefined();

    // Lock Grand Palace quote
    const lockButtons = screen.getAllByRole("button", { name: /lock contract & rebalance/i });
    expect(lockButtons.length).toBeGreaterThan(0);
    fireEvent.click(lockButtons[0]!);

    // Verify confirmation notification and store update
    await waitFor(() => {
      expect(screen.getByText(/successfully locked contract/i)).toBeDefined();
    });

    const updatedVenueLine = usePlanStore
      .getState()
      .plan?.budget.find((b) => b.category === "venue");
    expect(updatedVenueLine?.source).toBe("confirmed_quote");
  });
});
