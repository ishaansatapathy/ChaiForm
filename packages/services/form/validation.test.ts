import { describe, expect, it } from "vitest";

import { buildSubmissionSchema } from "./validation";
import type { FormField } from "./model";

const baseFields: FormField[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    label: "Email",
    type: "email",
    required: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    label: "Role",
    type: "select",
    required: true,
    config: { options: ["Engineer", "Designer"] },
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    label: "Rating",
    type: "rating",
    required: false,
    config: { maxRating: 5 },
  },
];

describe("buildSubmissionSchema", () => {
  it("accepts valid submission answers", () => {
    const schema = buildSubmissionSchema(baseFields);
    const result = schema.safeParse({
      "11111111-1111-4111-8111-111111111111": "dev@chaiform.dev",
      "22222222-2222-4222-8222-222222222222": "Engineer",
      "33333333-3333-4333-8333-333333333333": "4",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid email and select option", () => {
    const schema = buildSubmissionSchema(baseFields);
    const result = schema.safeParse({
      "11111111-1111-4111-8111-111111111111": "not-an-email",
      "22222222-2222-4222-8222-222222222222": "Manager",
      "33333333-3333-4333-8333-333333333333": "",
    });

    expect(result.success).toBe(false);
  });
});
