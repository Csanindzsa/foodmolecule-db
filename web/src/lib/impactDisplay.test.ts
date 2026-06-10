import { describe, expect, test } from "bun:test";

import { formatImpact, normalizeImpact } from "./impactDisplay";

describe("impact display helpers", () => {
  test("normalizeImpact keeps finite impacts within the AI parser bounds", () => {
    expect(normalizeImpact(-5)).toBe(-5);
    expect(normalizeImpact(0)).toBe(0);
    expect(normalizeImpact(5)).toBe(5);
  });

  test("normalizeImpact rounds and clamps out-of-range impacts", () => {
    expect(normalizeImpact(2.6)).toBe(3);
    expect(normalizeImpact(10)).toBe(5);
    expect(normalizeImpact(-10)).toBe(-5);
  });

  test("normalizeImpact rejects missing and non-finite values", () => {
    expect(normalizeImpact(null)).toBeNull();
    expect(normalizeImpact(undefined)).toBeNull();
    expect(normalizeImpact(NaN)).toBeNull();
    expect(normalizeImpact(Infinity)).toBeNull();
  });

  test("formatImpact adds positive signs and preserves zero/negative values", () => {
    expect(formatImpact(2)).toBe("+2");
    expect(formatImpact(0)).toBe("0");
    expect(formatImpact(-2)).toBe("-2");
    expect(formatImpact(NaN)).toBeNull();
  });
});
