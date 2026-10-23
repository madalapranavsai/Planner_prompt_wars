import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { EstimateBadge } from "./EstimateBadge";

describe("EstimateBadge", () => {
  it("renders Confirmed Quote variant with icon and accessible label", () => {
    render(<EstimateBadge source="confirmed_quote" />);
    const badge = screen.getByTestId("estimate-badge");
    expect(badge).toHaveTextContent("Confirmed Quote");
    expect(badge).toHaveAttribute("aria-label", "Confirmed Quote");
  });

  it("renders AI Estimate variant with confidence level", () => {
    render(<EstimateBadge source="ai_estimate" confidence="high" />);
    const badge = screen.getByTestId("estimate-badge");
    expect(badge).toHaveTextContent("AI Estimate");
    expect(badge).toHaveTextContent(/high/i);
    expect(badge).toHaveAttribute("aria-label", "AI Estimate (high confidence)");
  });

  it("has no accessibility violations (axe)", async () => {
    const { container } = render(
      <main>
        <h1>Budget Overview</h1>
        <EstimateBadge source="ai_estimate" confidence="medium" />
        <EstimateBadge source="confirmed_quote" />
      </main>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
