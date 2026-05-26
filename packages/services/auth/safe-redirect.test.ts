import { describe, expect, it } from "vitest";

import { sanitizeRedirectPath } from "./safe-redirect";

describe("sanitizeRedirectPath", () => {
  it("allows normal app paths", () => {
    expect(sanitizeRedirectPath("/dashboard")).toBe("/dashboard");
    expect(sanitizeRedirectPath("/forms/new")).toBe("/forms/new");
    expect(sanitizeRedirectPath("/")).toBe("/");
  });

  it("blocks protocol-relative and external redirects", () => {
    expect(sanitizeRedirectPath("//evil.com")).toBe("/dashboard");
    expect(sanitizeRedirectPath("https://evil.com")).toBe("/dashboard");
    expect(sanitizeRedirectPath("/\\evil.com")).toBe("/dashboard");
  });
});
