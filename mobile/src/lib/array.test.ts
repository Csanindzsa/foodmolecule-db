import { describe, expect, test } from "bun:test";

import { asArray, firstItems, stringItems } from "./array";

describe("array response helpers", () => {
  test("asArray returns a shallow copy for arrays", () => {
    const source = [{ id: "a" }];
    const result = asArray(source);

    expect(result).toEqual(source);
    expect(result).not.toBe(source);
  });

  test("asArray returns an empty array for missing or malformed values", () => {
    expect(asArray(null)).toEqual([]);
    expect(asArray(undefined)).toEqual([]);
    expect(asArray("not an array" as unknown as string[])).toEqual([]);
  });

  test("firstItems slices arrays and clamps negative counts to empty", () => {
    expect(firstItems([1, 2, 3, 4], 2)).toEqual([1, 2]);
    expect(firstItems([1, 2, 3, 4], -1)).toEqual([]);
    expect(firstItems(null, 2)).toEqual([]);
  });

  test("stringItems keeps trimmed non-empty strings up to the limit", () => {
    expect(stringItems([" apple ", "", 42, { name: "bad" }, "pear"], 2)).toEqual(["apple", "pear"]);
    expect(stringItems("apple")).toEqual([]);
    expect(stringItems(["apple"], -1)).toEqual([]);
  });
});
