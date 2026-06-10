import { describe, expect, test } from "bun:test";

import { formatHarmLevel, formatLinkedFoodCount } from "./moleculeDisplay";

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
});
