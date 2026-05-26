import { describe, expect, it } from "vitest";

import type { FormField } from "./model";
import { getVisibleFields, isFieldVisible } from "./visibility";

function textField(id: string, label: string, showWhen?: NonNullable<FormField["config"]>["showWhen"]): FormField {
  return {
    id,
    label,
    required: false,
    type: "text",
    config: showWhen ? { showWhen } : undefined,
  };
}

describe("field visibility", () => {
  it("shows all fields when no rules are set", () => {
    const fields = [textField("a", "A"), textField("b", "B")];
    expect(getVisibleFields(fields, {})).toHaveLength(2);
  });

  it("hides fields until the dependency matches", () => {
    const fields = [
      textField("role", "Role"),
      textField("other", "Other", { fieldId: "role", operator: "eq", value: "Engineer" }),
    ];

    expect(getVisibleFields(fields, { role: "" })).toHaveLength(1);
    expect(getVisibleFields(fields, { role: "Engineer" })).toHaveLength(2);
    expect(isFieldVisible(fields[1]!, { role: "Designer" }, fields)).toBe(false);
  });
});
