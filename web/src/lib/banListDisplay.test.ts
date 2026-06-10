import { describe, expect, test } from "bun:test";

import { formatLethalDose, lethalDoseSortValue } from "./banListDisplay";

describe("ban list display helpers", () => {
  test("formatLethalDose normalizes finite numeric values", () => {
    expect(formatLethalDose("500.0000")).toBe("500");
    expect(formatLethalDose("2.5000")).toBe("2.5");
    expect(formatLethalDose(12)).toBe("12");
  });

  test("formatLethalDose hides missing and malformed values", () => {
    expect(formatLethalDose(null)).toBeNull();
    expect(formatLethalDose("")).toBeNull();
    expect(formatLethalDose("unknown")).toBeNull();
    expect(formatLethalDose(Number.NaN)).toBeNull();
  });

  test("lethalDoseSortValue keeps finite values and demotes malformed values", () => {
    expect(lethalDoseSortValue("2.5000")).toBe(2.5);
    expect(lethalDoseSortValue("unknown")).toBe(-1);
    expect(lethalDoseSortValue(null)).toBe(-1);
  });
});
