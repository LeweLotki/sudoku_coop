import { describe, expect, it } from "vitest";
import {
  isValidIndex,
  normalizeSessionCode,
  validateCoordinate,
} from "./validation";

describe("isValidIndex", () => {
  it("accepts the inclusive bounds 1 and 9", () => {
    expect(isValidIndex(1)).toBe(true);
    expect(isValidIndex(9)).toBe(true);
    expect(isValidIndex(5)).toBe(true);
  });

  it("rejects out-of-range values", () => {
    expect(isValidIndex(0)).toBe(false);
    expect(isValidIndex(10)).toBe(false);
    expect(isValidIndex(-3)).toBe(false);
  });

  it("rejects non-integers and non-numbers", () => {
    expect(isValidIndex(3.5)).toBe(false);
    expect(isValidIndex("3")).toBe(false);
    expect(isValidIndex(Number.NaN)).toBe(false);
    expect(isValidIndex(null)).toBe(false);
    expect(isValidIndex(undefined)).toBe(false);
  });
});

describe("validateCoordinate", () => {
  it("parses valid string inputs into integers", () => {
    const result = validateCoordinate("3", "5");
    expect(result).toEqual({ ok: true, row: 3, column: 5 });
  });

  it("accepts numeric inputs", () => {
    expect(validateCoordinate(1, 9)).toEqual({ ok: true, row: 1, column: 9 });
  });

  it("rejects out-of-range coordinates", () => {
    expect(validateCoordinate("0", "5").ok).toBe(false);
    expect(validateCoordinate("3", "10").ok).toBe(false);
  });

  it("rejects non-integer and empty input", () => {
    expect(validateCoordinate("3.5", "5").ok).toBe(false);
    expect(validateCoordinate("", "5").ok).toBe(false);
    expect(validateCoordinate("abc", "5").ok).toBe(false);
  });
});

describe("normalizeSessionCode", () => {
  it("trims and uppercases a code", () => {
    expect(normalizeSessionCode(" ab12 ")).toBe("AB12");
  });

  it("returns null for empty/blank/non-string input", () => {
    expect(normalizeSessionCode("")).toBeNull();
    expect(normalizeSessionCode("   ")).toBeNull();
    expect(normalizeSessionCode(null)).toBeNull();
    expect(normalizeSessionCode(42)).toBeNull();
  });
});
