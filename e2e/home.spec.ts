import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Home Page", () => {
  test("renders heading, branding, and estimate badge", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "GenAI Celebration & Event Planning",
    );
    await expect(page.getByText("Utsav Planner")).toBeVisible();
    await expect(page.getByTestId("estimate-badge")).toBeVisible();
  });

  test("passes automated WCAG AA accessibility audit with axe", async ({ page }) => {
    await page.goto("/");
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
