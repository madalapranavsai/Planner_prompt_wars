import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { axe } from "vitest-axe";
import { TimelineView } from "./TimelineView";
import { Plan } from "@/lib/schemas/plan";
import { usePlanStore } from "@/store/planStore";

const mockPlan: Plan = {
  version: 1,
  source: "demo",
  profile: {
    occasion: "wedding",
    budgetTotal: 800000,
    guestCount: 200,
    eventDate: "2027-11-20",
    city: "Delhi NCR",
    vibe: "Grand Palace",
    ageGroups: ["adults", "seniors"],
    accessibilityNeeds: ["elderly_seating"],
    priorities: ["venue", "catering", "photography"],
  },
  budget: [
    {
      id: "b1",
      category: "venue",
      label: "Venue Booking",
      pricing: { kind: "fixed" },
      amount: 300000,
      floor: 150000,
      source: "ai_estimate",
      confidence: "high",
      rationale: "Standard banquet",
    },
  ],
  tasks: [
    {
      id: "t1",
      title: "Book Banquet Hall",
      category: "venue",
      origin: "template",
      durationDays: 14,
      delayDays: 0,
      deadlineOffsetDays: 120,
      dependsOn: [],
      status: "todo",
    },
    {
      id: "t2",
      title: "Stage & Floral Decor Setup",
      category: "decor",
      origin: "template",
      durationDays: 5,
      delayDays: 0,
      deadlineOffsetDays: 30,
      dependsOn: ["t1"],
      status: "todo",
    },
  ],
  revisions: [],
};

describe("TimelineView", () => {
  beforeEach(() => {
    usePlanStore.getState().setPlan(mockPlan);
  });

  it("renders scheduled tasks and passes a11y audit", async () => {
    const { container } = render(<TimelineView plan={mockPlan} />);

    expect(screen.getByText("Timeline & Milestones")).toBeInTheDocument();
    expect(screen.getAllByText("Book Banquet Hall").length).toBeGreaterThan(0);
    expect(screen.getByText("Stage & Floral Decor Setup")).toBeInTheDocument();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("triggers delay simulation when clicking simulate delay", async () => {
    render(<TimelineView plan={mockPlan} />);

    const delayBtns = screen.getAllByRole("button", { name: /simulate 7 days delay/i });
    expect(delayBtns.length).toBeGreaterThan(0);
    fireEvent.click(delayBtns[0]!);

    // Should indicate delayed status
    expect(screen.getByText(/\+7d delayed/i)).toBeInTheDocument();
  });
});
