import { test, expect } from "@playwright/test";

const demoEmail = process.env.SEED_USER_EMAIL ?? "demo@chaiform.dev";
const demoPassword = process.env.SEED_DEMO_PASSWORD ?? "DemoPass123!";

test.describe("Form builder flow", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(
      !(process.env.CI || process.env.E2E_RUN_AUTH_SMOKE === "true"),
      "builder flow requires a seeded creator account",
    );

    await page.goto("/sign-in");
    await page.getByLabel("Email").fill(demoEmail);
    await page.getByLabel("Password").fill(demoPassword);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  });

  test("creator can create and publish a form", async ({ page }) => {
    await page.goto("/forms/new");
    await page.getByPlaceholder("Form title").fill(`E2E Form ${Date.now()}`);
    await page.getByRole("button", { name: /save form/i }).click();
    await expect(page).toHaveURL(/\/forms\/[0-9a-f-]+\/edit/, { timeout: 60_000 });
  });
});
