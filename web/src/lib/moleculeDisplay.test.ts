import { describe, expect, test } from "bun:test";

import {
  foodMoleculeBadgeClass,
  foodMoleculeBadgeLabel,
  formatHarmLevel,
  harmLevelBadgeClass,
  harmLevelLabel,
  normalizeHarmLevel,
} from "./moleculeDisplay";

describe("molecule display helpers", () => {
  test("normalizeHarmLevel clamps and rounds finite values", () => {
    expect(normalizeHarmLevel(2.6)).toBe(3);
    expect(normalizeHarmLevel(-1)).toBe(0);
    expect(normalizeHarmLevel(8)).toBe(5);
  });

  test("normalizeHarmLevel rejects malformed values", () => {
    expect(normalizeHarmLevel(Number.NaN)).toBeNull();
    expect(normalizeHarmLevel("4")).toBeNull();
  });

  test("formatHarmLevel and labels hide malformed values", () => {
    expect(formatHarmLevel(4)).toBe("4");
    expect(formatHarmLevel(Number.NaN, "?")).toBe("?");
    expect(harmLevelLabel(4)).toBe("High");
    expect(harmLevelLabel(2)).toBe("Moderate");
    expect(harmLevelLabel(1)).toBe("Low");
    expect(harmLevelLabel(Number.NaN)).toBe("Unknown");
  });

  test("badge classes follow normalized harm levels", () => {
    expect(harmLevelBadgeClass(4)).toContain("bg-red-100");
    expect(harmLevelBadgeClass(2)).toContain("bg-yellow-100");
    expect(harmLevelBadgeClass(1)).toContain("bg-green-100");
    expect(harmLevelBadgeClass(Number.NaN)).toContain("bg-gray-100");
  });

  test("food molecule badges preserve beneficial and neutral low-risk labels", () => {
    expect(foodMoleculeBadgeLabel(4, true)).toBe("Harm 4");
    expect(foodMoleculeBadgeLabel(1, true)).toBe("Beneficial");
    expect(foodMoleculeBadgeLabel(Number.NaN, false)).toBe("Neutral");
    expect(foodMoleculeBadgeClass(1, true)).toContain("bg-green-100");
    expect(foodMoleculeBadgeClass(Number.NaN, false)).toContain("bg-gray-100");
  });
});
