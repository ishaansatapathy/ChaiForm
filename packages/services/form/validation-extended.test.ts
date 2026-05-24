import { describe, expect, it } from "vitest";

import { validateSubmissionAnswers } from "./validation";
import type { FormField } from "./model";

describe("validateSubmissionAnswers", () => {
  const fields: FormField[] = [
    { id: "11111111-1111-4111-8111-111111111111", label: "Name", type: "text", required: true },
    { id: "22222222-2222-4222-8222-222222222222", label: "Email", type: "email", required: true },
    {
      id: "33333333-3333-4333-8333-333333333333",
      label: "Age",
      type: "number",
      required: false,
    },
    {
      id: "44444444-4444-4444-8444-444444444444",
      label: "Birthday",
      type: "date",
      required: true,
    },
    {
      id: "55555555-5555-4555-8555-555555555555",
      label: "Role",
      type: "select",
      required: true,
      config: { options: ["Engineer", "Designer"] },
    },
    {
      id: "66666666-6666-4666-8666-666666666666",
      label: "Score",
      type: "rating",
      required: true,
      config: { maxRating: 5 },
    },
  ];

  it("accepts a fully valid payload", () => {
    const result = validateSubmissionAnswers(fields, [
      { fieldId: fields[0]!.id, value: "Alex" },
      { fieldId: fields[1]!.id, value: "alex@chaiform.dev" },
      { fieldId: fields[2]!.id, value: "28" },
      { fieldId: fields[3]!.id, value: "1999-05-12" },
      { fieldId: fields[4]!.id, value: "Engineer" },
      { fieldId: fields[5]!.id, value: "4" },
    ]);

    expect(result[fields[1]!.id]).toBe("alex@chaiform.dev");
  });

  it("rejects unknown field ids", () => {
    expect(() =>
      validateSubmissionAnswers(fields, [{ fieldId: "99999999-9999-4999-8999-999999999999", value: "x" }]),
    ).toThrow("Invalid field in submission");
  });

  it("rejects invalid email format", () => {
    expect(() =>
      validateSubmissionAnswers(fields, [
        { fieldId: fields[0]!.id, value: "Alex" },
        { fieldId: fields[1]!.id, value: "not-email" },
        { fieldId: fields[3]!.id, value: "1999-05-12" },
        { fieldId: fields[4]!.id, value: "Engineer" },
        { fieldId: fields[5]!.id, value: "3" },
      ]),
    ).toThrow();
  });

  it("rejects invalid select option", () => {
    expect(() =>
      validateSubmissionAnswers(fields, [
        { fieldId: fields[0]!.id, value: "Alex" },
        { fieldId: fields[1]!.id, value: "alex@chaiform.dev" },
        { fieldId: fields[3]!.id, value: "1999-05-12" },
        { fieldId: fields[4]!.id, value: "Manager" },
        { fieldId: fields[5]!.id, value: "3" },
      ]),
    ).toThrow();
  });

  it("rejects rating outside configured range", () => {
    expect(() =>
      validateSubmissionAnswers(fields, [
        { fieldId: fields[0]!.id, value: "Alex" },
        { fieldId: fields[1]!.id, value: "alex@chaiform.dev" },
        { fieldId: fields[3]!.id, value: "1999-05-12" },
        { fieldId: fields[4]!.id, value: "Engineer" },
        { fieldId: fields[5]!.id, value: "9" },
      ]),
    ).toThrow();
  });

  it("rejects invalid date format", () => {
    expect(() =>
      validateSubmissionAnswers(fields, [
        { fieldId: fields[0]!.id, value: "Alex" },
        { fieldId: fields[1]!.id, value: "alex@chaiform.dev" },
        { fieldId: fields[3]!.id, value: "12/05/1999" },
        { fieldId: fields[4]!.id, value: "Engineer" },
        { fieldId: fields[5]!.id, value: "3" },
      ]),
    ).toThrow();
  });

  it("rejects invalid number format", () => {
    expect(() =>
      validateSubmissionAnswers(fields, [
        { fieldId: fields[0]!.id, value: "Alex" },
        { fieldId: fields[1]!.id, value: "alex@chaiform.dev" },
        { fieldId: fields[2]!.id, value: "twenty" },
        { fieldId: fields[3]!.id, value: "1999-05-12" },
        { fieldId: fields[4]!.id, value: "Engineer" },
        { fieldId: fields[5]!.id, value: "3" },
      ]),
    ).toThrow();
  });

  it("allows empty optional fields", () => {
    const result = validateSubmissionAnswers(fields, [
      { fieldId: fields[0]!.id, value: "Alex" },
      { fieldId: fields[1]!.id, value: "alex@chaiform.dev" },
      { fieldId: fields[2]!.id, value: "" },
      { fieldId: fields[3]!.id, value: "1999-05-12" },
      { fieldId: fields[4]!.id, value: "Engineer" },
      { fieldId: fields[5]!.id, value: "5" },
    ]);

    expect(result[fields[2]!.id]).toBe("");
  });

  it("rejects missing required checkbox field", () => {
    const checkboxFields: FormField[] = [
      {
        id: "77777777-7777-4777-8777-777777777777",
        label: "Terms",
        type: "checkbox",
        required: true,
        config: { checkboxLabel: "I agree to terms" },
      },
    ];

    expect(() =>
      validateSubmissionAnswers(checkboxFields, [{ fieldId: checkboxFields[0]!.id, value: "false" }]),
    ).toThrow();
  });

  it("accepts checked required checkbox", () => {
    const checkboxFields: FormField[] = [
      {
        id: "77777777-7777-4777-8777-777777777777",
        label: "Terms",
        type: "checkbox",
        required: true,
        config: { checkboxLabel: "I agree to terms" },
      },
    ];

    const result = validateSubmissionAnswers(checkboxFields, [
      { fieldId: checkboxFields[0]!.id, value: "true" },
    ]);

    expect(result[checkboxFields[0]!.id]).toBe("true");
  });

  it("rejects missing required text field", () => {
    expect(() =>
      validateSubmissionAnswers(fields, [
        { fieldId: fields[0]!.id, value: "" },
        { fieldId: fields[1]!.id, value: "alex@chaiform.dev" },
        { fieldId: fields[3]!.id, value: "1999-05-12" },
        { fieldId: fields[4]!.id, value: "Engineer" },
        { fieldId: fields[5]!.id, value: "3" },
      ]),
    ).toThrow();
  });
});
