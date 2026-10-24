import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Vertical Slice: Demo, Budget, Timeline & A11y", () => {
  test("loads demo wedding, confirms a quote with rebalance, tests timeline cascade delay, and passes WCAG AA", async ({
    page,
  }) => {
    // 1. Visit homepage
    await page.goto("/");
    await expect(page.locator('[data-hydrated="true"]')).toBeVisible();
    await expect(page.getByText("Utsav Planner")).toBeVisible();

    // 2. Click "Load Demo Wedding"
    const loadDemoBtn = page.getByTestId("load-demo-button");
    await expect(loadDemoBtn).toBeVisible();
    await loadDemoBtn.click();

    // 3. Verify active plan workspace renders
    await expect(page.getByText("Grand Sangeet & Reception")).toBeVisible();
    await expect(page.getByText("₹8,00,000").first()).toBeVisible();
    await expect(page.getByText("200 Guests", { exact: true })).toBeVisible();
    await expect(page.getByText("Hyderabad")).toBeVisible();

    // 4. Verify Budget table is displayed by default
    await expect(
      page.getByRole("heading", { name: /category apportionment & quotes/i }),
    ).toBeVisible();
    await expect(page.getByText("Mandap & Stage Decor")).toBeVisible();

    // 5. Confirm a vendor quote on Mandap & Stage Decor
    const confirmQuoteBtns = page.getByRole("button", { name: "Confirm Quote" });
    await expect(confirmQuoteBtns.first()).toBeVisible();
    await confirmQuoteBtns.first().click();

    // Fill modal
    await expect(page.getByRole("heading", { name: /lock confirmed quote/i })).toBeVisible();
    await page.fill("#vendor-name-input", "Royal Palace Decors");
    await page.fill("#quote-amount-input", "140000");

    // Submit modal
    await page.getByRole("button", { name: /lock quote & rebalance/i }).click();

    // Check confirmed badge is visible
    await expect(page.getByText("Royal Palace Decors")).toBeVisible();

    // 6. Switch to Timeline & Cascade DAG tab
    await page.getByRole("button", { name: /timeline & cascade dag/i }).click();
    await expect(page.getByText("Timeline & Milestones")).toBeVisible();

    // 7. Verify tasks and simulate delay
    await expect(page.getByText("Food Tasting & Menu Lock")).toBeVisible();

    // Click +7d Delay simulator on an active task
    const delayButton = page.getByRole("button", {
      name: /\+7d delay: simulate 7 days delay for food tasting & menu lock/i,
    });
    await expect(delayButton).toBeVisible();
    await delayButton.click();

    // Verify delayed badge appears
    await expect(page.getByText("+7d Delayed")).toBeVisible();

    // 8. Run full WCAG AA accessibility audit on the active planner workspace
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
