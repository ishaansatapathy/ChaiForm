import { describe, expect, it } from "vitest";

import { matchesProcedure, normalizeProcedurePath } from "./rate-limiters";

describe("rate limiter procedure matching", () => {
  it("maps REST OpenAPI paths to tRPC procedure names", () => {
    expect(normalizeProcedurePath("/authentication/sign-in")).toBe("auth.signIn");
    expect(normalizeProcedurePath("/authentication/forgot-password")).toBe("auth.forgotPassword");
    expect(normalizeProcedurePath("/forms/submit")).toBe("forms.submit");
    expect(normalizeProcedurePath("/forms/views")).toBe("forms.recordView");
  });

  it("keeps normal tRPC procedure paths unchanged", () => {
    expect(normalizeProcedurePath("/auth.signIn")).toBe("auth.signIn");
    expect(normalizeProcedurePath("forms.submit")).toBe("forms.submit");
  });

  it("requires exact procedure segment matches", () => {
    expect(matchesProcedure("auth.signIn", ["auth.signIn"])).toBe(true);
    expect(matchesProcedure("auth.signInWithMagicLink", ["auth.signIn"])).toBe(false);
    expect(matchesProcedure("forms.submit.extra", ["forms.submit"])).toBe(false);
  });
});
