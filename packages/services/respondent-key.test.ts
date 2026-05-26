import { beforeAll, describe, expect, it } from "vitest";

import { createRespondentToken, parseRespondentToken } from "./respondent-key";

describe("respondent-key", () => {
  beforeAll(() => {
    process.env.JWT_SECRET = "mock-secret-key-with-more-than-sixteen-characters";
  });
  it("creates and parses a signed respondent token", () => {
    const formId = "550e8400-e29b-41d4-a716-446655440000";
    const token = createRespondentToken(formId);
    const key = parseRespondentToken(token, formId);
    expect(key).toBeTruthy();
    expect(parseRespondentToken(token, "00000000-0000-4000-8000-000000000001")).toBeNull();
  });
});
