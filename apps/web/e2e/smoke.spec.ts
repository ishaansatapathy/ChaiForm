import { test, expect } from "@playwright/test";

const apiURL = process.env.E2E_API_URL ?? "http://127.0.0.1:8000";

test.describe("ChaiForm smoke", () => {
  test("homepage loads", async ({ page }) => {
    await page.goto("/");
    const skipIntro = page.getByRole("button", { name: /skip loading intro/i });
    if (await skipIntro.isVisible().catch(() => false)) {
      await skipIntro.click();
    }
    await expect(page).toHaveTitle(/ChaiForm/i);
    await expect(page.getByRole("link", { name: /sign in/i }).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test("sign-in page renders auth form", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
  });

  test("public sample form route responds", async ({ page }) => {
    const response = await page.goto("/f/s/product-feedback");
    expect(response?.status()).toBeLessThan(500);
  });

  test("API health endpoint is healthy", async ({ request }) => {
    const response = await request.get(`${apiURL}/health`);
    expect(response.ok()).toBeTruthy();
    const body = (await response.json()) as { healthy?: boolean };
    expect(body.healthy).toBe(true);
  });
});
