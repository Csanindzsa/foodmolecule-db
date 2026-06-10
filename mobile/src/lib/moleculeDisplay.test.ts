import { describe, expect, test } from "bun:test";

import { formatHarmLevel, formatLinkedFoodCount, formatMolecularWeight, formatPubChemCid } from "./moleculeDisplay";

describe("molecule display helpers", () => {
  test("formatHarmLevel clamps finite harm levels", () => {
    expect(formatHarmLevel(2.6)).toBe("3");
    expect(formatHarmLevel(-1)).toBe("0");
    expect(formatHarmLevel(9)).toBe("5");
  });

  test("formatHarmLevel hides malformed values", () => {
    expect(formatHarmLevel(Number.NaN)).toBe("unknown");
    expect(formatHarmLevel("5")).toBe("unknown");
    expect(formatHarmLevel(null, "?")).toBe("?");
  });

  test("formatLinkedFoodCount rounds finite counts and clamps negatives", () => {
    expect(formatLinkedFoodCount(2.4)).toBe("2");
    expect(formatLinkedFoodCount(2.6)).toBe("3");
    expect(formatLinkedFoodCount(-4)).toBe("0");
  });

  test("formatLinkedFoodCount hides malformed counts", () => {
    expect(formatLinkedFoodCount(Number.NaN)).toBe("unknown");
    expect(formatLinkedFoodCount(undefined, "?")).toBe("?");
  });

  test("formatMolecularWeight normalizes finite values and hides malformed values", () => {
    expect(formatMolecularWeight("194.1900")).toBe("194.19");
    expect(formatMolecularWeight(90.034)).toBe("90.034");
    expect(formatMolecularWeight("not available")).toBeNull();
    expect(formatMolecularWeight(Number.NaN)).toBeNull();
  });

  test("formatPubChemCid keeps positive finite integer IDs only", () => {
    expect(formatPubChemCid(12345)).toBe("12345");
    expect(formatPubChemCid(12345.9)).toBe("12345");
    expect(formatPubChemCid(0)).toBeNull();
    expect(formatPubChemCid(Number.NaN)).toBeNull();
  });
});
