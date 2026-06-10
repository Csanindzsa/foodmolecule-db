import { describe, expect, test } from "bun:test";

import { asArray } from "./array";

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
});
