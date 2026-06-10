import { describe, expect, test } from "bun:test";

import { formatCount, moleculeAmountEntries } from "./compareDisplay";

describe("compare display helpers", () => {
  test("moleculeAmountEntries keeps finite molecule amounts sorted descending", () => {
    expect(moleculeAmountEntries({ Fiber: 2.4, Water: 80, "": 10, Bad: Number.NaN })).toEqual([
      ["Water", 80],
      ["Fiber", 2.4],
    ]);
  });

  test("moleculeAmountEntries rejects malformed maps", () => {
    expect(moleculeAmountEntries(null)).toEqual([]);
    expect(moleculeAmountEntries(["Fiber"])).toEqual([]);
    expect(moleculeAmountEntries("Fiber")).toEqual([]);
  });

  test("formatCount hides non-finite counts and clamps negatives", () => {
    expect(formatCount(2.6)).toBe("3");
    expect(formatCount(-2)).toBe("0");
    expect(formatCount(Number.NaN)).toBe("unknown");
  });
});
