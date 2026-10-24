import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { axe } from "vitest-axe";
import { WhatIfView } from "./WhatIfView";
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
  tasks: [
    {
      id: "t-venue",
      title: "Book Venue",
      category: "venue",
      durationDays: 14,
      deadlineOffsetDays: 90,
      dependsOn: [],
      status: "done",
      completedOn: "2026-05-15",
      delayDays: 0,
      origin: "template",
    },
  ],
  revisions: [],
};

describe("WhatIfView", () => {
  beforeEach(() => {
    usePlanStore.setState({
      plan: mockPlan,
      selectedTab: "revisions",
    });
  });

  it("renders curveball simulator presets and passes axe accessibility audit", async () => {
    const { container } = render(<WhatIfView />);

    expect(screen.getByText("What-If Curveball Simulator")).toBeDefined();
    expect(screen.getByText("⚡ +50 Guests")).toBeDefined();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("simulates a preset curveball, opens the diff modal, and allows applying changes", async () => {
    render(<WhatIfView />);

    // Click on +50 Guests preset
    const presetBtn = screen.getByText("⚡ +50 Guests");
    fireEvent.click(presetBtn);

    // Wait for the simulated revision modal to appear
    await waitFor(() => {
      expect(screen.getByText("Simulated Revision Diff")).toBeDefined();
    });

    expect(screen.getByText("✓ Apply Changes to Plan")).toBeDefined();

    // Click Apply
    const applyBtn = screen.getByText("✓ Apply Changes to Plan");
    fireEvent.click(applyBtn);

    // Verify modal closes and revision history updates
    await waitFor(() => {
      expect(screen.queryByText("Simulated Revision Diff")).toBeNull();
    });

    expect(screen.getByText(/Applied Revision History \(1\)/)).toBeDefined();
    expect(usePlanStore.getState().plan?.profile.guestCount).toBe(250);
  });
});
