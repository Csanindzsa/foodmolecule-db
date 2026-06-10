import { describe, expect, test } from "bun:test";

import { formatGuideText } from "./guideDisplay";

describe("AI guide display helpers", () => {
  test("formatGuideText keeps trimmed non-empty guide copy", () => {
    expect(formatGuideText("  Eat with fiber.  ")).toBe("Eat with fiber.");
  });

  test("formatGuideText hides missing and malformed guide copy", () => {
    expect(formatGuideText(null)).toBeNull();
    expect(formatGuideText("   ")).toBeNull();
    expect(formatGuideText({ text: "not displayable" })).toBeNull();
  });
});
