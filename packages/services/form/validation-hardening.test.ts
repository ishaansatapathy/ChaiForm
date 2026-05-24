import { describe, expect, it } from "vitest";

import { submitFormInputSchema } from "./model";
import { validateSubmissionAnswers } from "./validation";
import type { FormField } from "./model";

const baseFields: FormField[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    label: "Birthday",
    type: "date",
    required: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    label: "Email",
    type: "email",
    required: true,
  },
];

describe("submitFormInputSchema", () => {
  it("requires an empty honeypot website field", () => {
    const result = submitFormInputSchema.safeParse({
      formId: "33333333-3333-4333-8333-333333333333",
      website: "spam-bot",
      answers: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects duplicate field answers", () => {
    const result = submitFormInputSchema.safeParse({
      formId: "33333333-3333-4333-8333-333333333333",
      website: "",
      answers: [
        { fieldId: "11111111-1111-4111-8111-111111111111", value: "2024-05-01" },
        { fieldId: "11111111-1111-4111-8111-111111111111", value: "2024-05-02" },
      ],
    });
    expect(result.success).toBe(false);
  });
});

describe("validateSubmissionAnswers hardening", () => {
  it("rejects impossible calendar dates", () => {
    expect(() =>
      validateSubmissionAnswers(baseFields, [
        { fieldId: baseFields[0]!.id, value: "2024-02-30" },
        { fieldId: baseFields[1]!.id, value: "demo@chaiform.dev" },
      ]),
    ).toThrow();
  });

  it("rejects duplicate field ids at runtime", () => {
    expect(() =>
      validateSubmissionAnswers(baseFields, [
        { fieldId: baseFields[0]!.id, value: "2024-05-01" },
        { fieldId: baseFields[0]!.id, value: "2024-05-02" },
        { fieldId: baseFields[1]!.id, value: "demo@chaiform.dev" },
      ]),
    ).toThrow(/Duplicate field/);
  });
});
