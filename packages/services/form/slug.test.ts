import { describe, expect, it } from "vitest";

import { slugifyTitle } from "./slug-utils";

describe("slugifyTitle", () => {
  it("creates URL-safe slugs", () => {
    expect(slugifyTitle("Product Feedback 2026!")).toBe("product-feedback-2026");
  });

  it("falls back to form when title is empty", () => {
    expect(slugifyTitle("   !!!   ")).toBe("form");
  });
});
