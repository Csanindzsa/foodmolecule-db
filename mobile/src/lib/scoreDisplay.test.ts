import { describe, expect, test } from "bun:test";

import { formatHealthLabel, formatPercent, formatScore, normalizeScore } from "./scoreDisplay";

describe("score display helpers", () => {
  test("normalizeScore keeps finite scores within 0 to 100", () => {
    expect(normalizeScore(0)).toBe(0);
    expect(normalizeScore(42)).toBe(42);
    expect(normalizeScore(100)).toBe(100);
  });

  test("normalizeScore clamps out-of-range scores", () => {
    expect(normalizeScore(-25)).toBe(0);
    expect(normalizeScore(125)).toBe(100);
  });

  test("normalizeScore rounds fractional scores", () => {
    expect(normalizeScore(49.4)).toBe(49);
    expect(normalizeScore(49.5)).toBe(50);
  });

  test("normalizeScore rejects missing and non-finite scores", () => {
    expect(normalizeScore(null)).toBeNull();
    expect(normalizeScore(undefined)).toBeNull();
    expect(normalizeScore(NaN)).toBeNull();
    expect(normalizeScore(Infinity)).toBeNull();
  });

  test("formatScore returns fallback text for unavailable scores", () => {
    expect(formatScore(null)).toBe("unknown");
    expect(formatScore(NaN, "?")).toBe("?");
  });

  test("formatScore returns clamped display text", () => {
    expect(formatScore(52.8)).toBe("53");
    expect(formatScore(200)).toBe("100");
  });

  test("formatPercent returns clamped percentage text", () => {
    expect(formatPercent(88.5)).toBe("89%");
    expect(formatPercent(120)).toBe("100%");
    expect(formatPercent(-10)).toBe("0%");
  });

  test("formatPercent returns fallback text for unavailable values", () => {
    expect(formatPercent(NaN)).toBe("unknown");
    expect(formatPercent(Infinity, "?")).toBe("?");
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
