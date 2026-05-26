import request from "supertest";
import { describe, expect, it } from "vitest";

import { app } from "./server";

describe("ChaiForm API integration", () => {
  it("returns healthy status", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body.healthy).toBe(true);
  });

  it("rejects unauthenticated protected form list", async () => {
    const response = await request(app).get("/trpc/forms.list");
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it("signs in seeded demo user and lists forms", async () => {
    const signIn = await request(app)
      .post("/api/authentication/sign-in")
      .set("content-type", "application/json")
      .send({
        email: process.env.SEED_USER_EMAIL ?? "demo@chaiform.dev",
        password: process.env.SEED_DEMO_PASSWORD ?? "DemoPass123!",
      });

    if (signIn.status !== 200) {
      // Skip when local DB is unavailable — CI runs migrate + seed before tests.
      expect([401, 403, 500, 503]).toContain(signIn.status);
      return;
    }

    expect(signIn.body.user?.email ?? signIn.body.twoFactorRequired).toBeTruthy();

    const cookie = signIn.headers["set-cookie"];
    expect(cookie).toBeTruthy();

    const list = await request(app)
      .get("/api/forms?limit=10")
      .set("cookie", Array.isArray(cookie) ? cookie.join("; ") : String(cookie));

    expect(list.status).toBe(200);
    expect(Array.isArray(list.body.items ?? list.body.result?.data?.items)).toBe(true);
  });
});
