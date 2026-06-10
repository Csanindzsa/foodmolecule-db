import { describe, expect, test } from "bun:test";

import { formatHazardLevel, ingredientTerms, rawOcrPreview } from "./scanDisplay";

describe("scan display helpers", () => {
  test("ingredientTerms keeps trimmed unique strings up to the limit", () => {
    expect(ingredientTerms([" apple ", "Apple", "", 42, "pear", "banana"], 2)).toEqual([
      "apple",
      "pear",
    ]);
  });

  test("ingredientTerms rejects malformed payloads", () => {
    expect(ingredientTerms(null)).toEqual([]);
    expect(ingredientTerms("apple")).toEqual([]);
    expect(ingredientTerms({ term: "apple" })).toEqual([]);
  });

  test("formatHazardLevel clamps finite hazard levels and hides malformed values", () => {
    expect(formatHazardLevel(2.6)).toBe("3");
    expect(formatHazardLevel(-1)).toBe("0");
    expect(formatHazardLevel(8)).toBe("5");
    expect(formatHazardLevel(Number.NaN)).toBe("unknown");
  });

  test("rawOcrPreview returns non-empty strings only", () => {
    expect(rawOcrPreview(" Ingredients: apple ")).toBe("Ingredients: apple");
    expect(rawOcrPreview("   ")).toBeNull();
    expect(rawOcrPreview({ text: "apple" })).toBeNull();
  });
});
