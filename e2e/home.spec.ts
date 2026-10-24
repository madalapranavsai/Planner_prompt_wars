import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Home Page", () => {
  test("renders heading, branding, and estimate badge", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Intelligent Celebration & Event Planning",
    );
    await expect(page.getByText("Utsav Planner")).toBeVisible();
    await expect(page.getByTestId("load-demo-button")).toBeVisible();
  });

  test("passes automated WCAG AA accessibility audit with axe", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('[data-hydrated="true"]')).toBeVisible();
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("serves strict CSP and security headers", async ({ page }) => {
    const response = await page.goto("/");
    expect(response).not.toBeNull();
    const headers = response!.headers();
    expect(headers["content-security-policy"]).toContain("default-src 'self'");
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
  });
});
