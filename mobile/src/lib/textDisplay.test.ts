import { describe, expect, test } from "bun:test";

import { formatOptionalText } from "./textDisplay";

describe("text display helpers", () => {
  test("formatOptionalText keeps trimmed non-empty strings", () => {
    expect(formatOptionalText("  Fruit  ")).toBe("Fruit");
  });

  test("formatOptionalText hides missing, blank, and malformed values", () => {
    expect(formatOptionalText(null)).toBeNull();
    expect(formatOptionalText("   ")).toBeNull();
    expect(formatOptionalText({ label: "Fruit" })).toBeNull();
  });
});
