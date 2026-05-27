import { test, expect } from "@playwright/test";

const apiURL = process.env.E2E_API_URL ?? "http://127.0.0.1:8000";
const demoEmail = process.env.SEED_USER_EMAIL ?? "demo@chaiform.dev";
const demoPassword = process.env.SEED_DEMO_PASSWORD ?? "DemoPass123!";

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

  test("API readiness endpoint reports checks", async ({ request }) => {
    const response = await request.get(`${apiURL}/ready`);
    expect([200, 503]).toContain(response.status());
    const body = (await response.json()) as {
      ready?: boolean;
      checks?: Record<string, { ok: boolean; message: string }>;
    };
    expect(typeof body.ready).toBe("boolean");
    expect(body.checks?.database).toBeTruthy();
    expect(body.checks?.coreEnv).toBeTruthy();
  });

  test("demo creator can sign in and reach dashboard", async ({ page }) => {
    test.skip(
      !(process.env.CI || process.env.E2E_RUN_AUTH_SMOKE === "true"),
      "auth smoke requires a seeded demo user",
    );

    await page.goto("/sign-in");
    await page.getByLabel("Email").fill(demoEmail);
    await page.getByLabel("Password").fill(demoPassword);
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
    await expect(page.getByRole("link", { name: /new form/i })).toBeVisible({
      timeout: 20_000,
    });
  });
});
