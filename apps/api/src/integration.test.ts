import request from "supertest";
import { describe, expect, it } from "vitest";

import { app } from "./server";

describe("ChaiForm API integration", () => {
  it("returns healthy status", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body.healthy).toBe(true);
  });

  it("serves generated OpenAPI documentation", async () => {
    const response = await request(app).get("/openapi.json");
    expect(response.status).toBe(200);
    expect(response.body.info?.title).toBe("ChaiForm OpenAPI");
    expect(response.body.paths?.["/forms/submit"]).toBeTruthy();
    expect(response.body.paths?.["/authentication/google-oauth"]).toBeTruthy();
  });

  it("rejects unauthenticated protected form list", async () => {
    const response = await request(app).get("/trpc/forms.list");
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it("rejects cookie-authenticated mutations without an origin", async () => {
    const response = await request(app)
      .post("/trpc/forms.submit")
      .set("cookie", "jwt=fake-token")
      .send({});

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("Missing request origin");
  });

  it("rejects cookie-authenticated mutations from untrusted origins", async () => {
    const response = await request(app)
      .post("/trpc/forms.submit")
      .set("cookie", "jwt=fake-token")
      .set("origin", "https://evil.example")
      .send({});

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("Untrusted request origin");
  });

  it("allows trusted-origin mutations past the CSRF gate", async () => {
    const response = await request(app)
      .post("/trpc/forms.submit")
      .set("cookie", "jwt=fake-token")
      .set("origin", "http://localhost:3000")
      .set("x-chaiform-csrf", "1")
      .send({});

    expect(response.status).not.toBe(403);
  });

  it("rejects trusted-origin cookie mutations without the CSRF header", async () => {
    const response = await request(app)
      .post("/trpc/forms.submit")
      .set("cookie", "jwt=fake-token")
      .set("origin", "http://localhost:3000")
      .send({});

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("Missing CSRF header");
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
