import { describe, expect, test } from "bun:test";

import { formatHealthLabel, formatScore, normalizeScore, scoreBadgeClass } from "./scoreDisplay";

describe("score display helpers", () => {
  test("normalizeScore preserves finite scores within range", () => {
    expect(normalizeScore(0)).toBe(0);
    expect(normalizeScore(50)).toBe(50);
    expect(normalizeScore(100)).toBe(100);
  });

  test("normalizeScore rounds and clamps finite scores", () => {
    expect(normalizeScore(49.5)).toBe(50);
    expect(normalizeScore(-10)).toBe(0);
    expect(normalizeScore(150)).toBe(100);
  });

  test("normalizeScore rejects missing and non-finite values", () => {
    expect(normalizeScore(null)).toBeNull();
    expect(normalizeScore(undefined)).toBeNull();
    expect(normalizeScore(NaN)).toBeNull();
    expect(normalizeScore(Infinity)).toBeNull();
  });

  test("formatScore returns fallback text for unavailable values", () => {
    expect(formatScore(null)).toBe("unknown");
    expect(formatScore(NaN, "-")).toBe("-");
  });

  test("scoreBadgeClass selects bounded score colors", () => {
    expect(scoreBadgeClass(80)).toContain("bg-green-100");
    expect(scoreBadgeClass(60)).toContain("bg-yellow-100");
    expect(scoreBadgeClass(20)).toContain("bg-red-100");
  });

  test("formatHealthLabel keeps known backend labels", () => {
    expect(formatHealthLabel(" Good ")).toBe("Good");
    expect(formatHealthLabel("excellent")).toBe("Excellent");
    expect(formatHealthLabel("AVOID")).toBe("Avoid");
  });

  test("formatHealthLabel hides malformed and unknown labels", () => {
    expect(formatHealthLabel(null)).toBeNull();
    expect(formatHealthLabel("")).toBeNull();
    expect(formatHealthLabel("superb")).toBeNull();
    expect(formatHealthLabel({ label: "Good" })).toBeNull();
  });
});
