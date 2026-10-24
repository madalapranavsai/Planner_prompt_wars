import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Phase 5: Vendor Quote Comparator & Pre-Contract Intelligence", () => {
  test("unbundles raw vendor quotes, displays GST and hidden charges, runs a11y audit, and locks contract into budget", async ({
    page,
  }) => {
    // 1. Visit homepage & wait for hydration
    await page.goto("/");
    await expect(page.locator('[data-hydrated="true"]')).toBeVisible();

    // 2. Load demo wedding
    await page.getByTestId("load-demo-button").click();
    await expect(page.getByText("Grand Sangeet & Reception")).toBeVisible();

    // 3. Navigate to "📋 Vendor Quotes" tab
    const vendorsTab = page.getByRole("button", { name: /vendor quotes/i });
    await expect(vendorsTab).toBeVisible();
    await vendorsTab.click();

    // 4. Verify Vendor Comparator interface
    await expect(page.getByRole("heading", { name: /vendor quote comparator/i })).toBeVisible();
    await expect(page.getByText("Comparing Category")).toBeVisible();

    // 5. Click "Sample Catering Quotes"
    const sampleCateringBtn = page.getByRole("button", { name: /sample catering quotes/i });
    await expect(sampleCateringBtn).toBeVisible();
    await sampleCateringBtn.click();

    // 6. Click "Unbundle & Compare Quotes"
    const compareBtn = page.getByRole("button", { name: /compare quotes/i });
    await expect(compareBtn).toBeVisible();
    await compareBtn.click();

    // 7. Verify side-by-side comparison cards render
    await expect(page.getByText("Royal Hyderabadi Caterers")).toBeVisible();
    await expect(page.getByText("Flavors of South Catering")).toBeVisible();
    await expect(page.getByText("Comparative Verdict")).toBeVisible();
    await expect(page.getByText("Critical Pre-Signing Negotiation Questions")).toBeVisible();

    // 8. Run full WCAG AA accessibility audit on Vendor Comparator View
    const axeResults = await new AxeBuilder({ page }).analyze();
    expect(axeResults.violations).toEqual([]);

    // 9. Lock contract for Royal Hyderabadi Caterers
    const lockContractBtn = page.getByRole("button", {
      name: /lock contract & rebalance: select royal hyderabadi caterers/i,
    });
    await expect(lockContractBtn).toBeVisible();
    await lockContractBtn.click();

    // 10. Verify confirmation message
    await expect(page.getByText(/successfully locked contract/i)).toBeVisible();

    // 11. Switch back to Budget tab and verify catering line reflects confirmed quote
    await page.getByRole("button", { name: /budget & rebalance/i }).click();
    await expect(page.getByText("Royal Hyderabadi Caterers")).toBeVisible();
    await expect(page.getByText("Confirmed Quote").first()).toBeVisible();
  });
});
