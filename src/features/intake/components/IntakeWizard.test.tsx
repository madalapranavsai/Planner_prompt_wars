import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { axe } from "vitest-axe";
import { IntakeWizard } from "./IntakeWizard";

describe("IntakeWizard", () => {
  it("renders with default celebration values and passes axe a11y audit", async () => {
    const handleGenerate = vi.fn().mockResolvedValue(undefined);
    const { container } = render(
      <IntakeWizard onPlanGenerated={handleGenerate} isLoading={false} />,
    );

    expect(screen.getByRole("heading", { name: /celebration intake/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/total budget/i)).toHaveValue("₹8 Lakh");
    expect(screen.getByLabelText(/guest count/i)).toHaveValue(200);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("submits configured profile on form submission", async () => {
    const handleGenerate = vi.fn().mockResolvedValue(undefined);
    render(<IntakeWizard onPlanGenerated={handleGenerate} isLoading={false} />);

    // Change city
    const cityInput = screen.getByLabelText(/city \/ location/i);
    fireEvent.change(cityInput, { target: { value: "Jaipur" } });

    // Submit form
    const submitBtn = screen.getByRole("button", { name: /generate celebration plan/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleGenerate).toHaveBeenCalledTimes(1);
    });

    const calledProfile = handleGenerate.mock.calls[0]![0];
    expect(calledProfile.city).toBe("Jaipur");
    expect(calledProfile.budgetTotal).toBe(800000);
    expect(calledProfile.guestCount).toBe(200);
  });
});
