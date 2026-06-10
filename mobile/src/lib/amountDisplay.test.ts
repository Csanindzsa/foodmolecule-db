import { describe, expect, test } from "bun:test";

import { formatAmount } from "./amountDisplay";

describe("amount display helpers", () => {
  test("formatAmount normalizes finite numeric values with optional units", () => {
    expect(formatAmount("50.000000", "mg")).toBe("50 mg");
    expect(formatAmount("2.700000", " g ")).toBe("2.7 g");
    expect(formatAmount(0, "mg")).toBe("0 mg");
    expect(formatAmount("12", "")).toBe("12");
  });

  test("formatAmount hides missing and malformed values", () => {
    expect(formatAmount(null, "mg")).toBe("unknown");
    expect(formatAmount("", "mg")).toBe("unknown");
    expect(formatAmount("unknown", "mg")).toBe("unknown");
    expect(formatAmount(Number.NaN, "mg", "not listed")).toBe("not listed");
  });
});
