import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Phase 4: What-If Curveball Revisions & Preserved State", () => {
  test("simulates a curveball, shows Before vs After diff modal, applies changes, and preserves confirmed quotes", async ({
    page,
  }) => {
    // 1. Visit homepage & wait for hydration
    await page.goto("/");
    await expect(page.locator('[data-hydrated="true"]')).toBeVisible();

    // 2. Load demo wedding
    await page.getByTestId("load-demo-button").click();
    await expect(page.getByText("Grand Sangeet & Reception")).toBeVisible();
    await expect(page.getByText("200 Guests", { exact: true })).toBeVisible();

    // 3. Confirm a vendor quote first to test contract preservation
    const confirmQuoteBtns = page.getByRole("button", { name: "Confirm Quote" });
    await expect(confirmQuoteBtns.first()).toBeVisible();
    await confirmQuoteBtns.first().click();

    await page.fill("#vendor-name-input", "Royal Hyderabad Caterers");
    await page.fill("#quote-amount-input", "250000");
    await page.getByRole("button", { name: /lock quote & rebalance/i }).click();

    await expect(page.getByText("Royal Hyderabad Caterers")).toBeVisible();

    // 4. Navigate to "🔮 What-If Revisions" tab
    const revisionsTab = page.getByRole("button", { name: /what-if revisions/i });
    await expect(revisionsTab).toBeVisible();
    await revisionsTab.click();

    // 5. Verify What-If Simulator interface
    await expect(page.getByRole("heading", { name: /what-if curveball simulator/i })).toBeVisible();
    await expect(page.getByText("Quick Curveball Presets")).toBeVisible();

    // 6. Click "+50 Guests" preset
    const presetBtn = page.getByRole("button", { name: /preset: \+50 guests/i });
    await expect(presetBtn).toBeVisible();
    await presetBtn.click();

    // 7. Verify Simulated Revision Diff Modal opens
    await expect(page.getByRole("heading", { name: /simulated revision diff/i })).toBeVisible();
    await expect(page.getByText(/200 guests.*→.*250 guests/i)).toBeVisible();
    await expect(page.getByText("🔒 Confirmed Contract Preserved").first()).toBeVisible();

    // 8. Run Axe accessibility audit on the Diff Modal
    const modalAxe = await new AxeBuilder({ page }).analyze();
    expect(modalAxe.violations).toEqual([]);

    // 9. Apply changes to plan
    const applyBtn = page.getByRole("button", { name: /apply: apply simulated revision/i });
    await expect(applyBtn).toBeVisible();
    await applyBtn.click();

    // 10. Verify modal closed and plan updated
    await expect(page.getByRole("heading", { name: /simulated revision diff/i })).not.toBeVisible();

    // Check header profile badge reflects updated 250 guests
    await expect(page.getByText("250 Guests", { exact: true })).toBeVisible();

    // Check revision history lists the applied revision
    await expect(page.getByText(/applied revision history \(1\)/i)).toBeVisible();
  });
});
