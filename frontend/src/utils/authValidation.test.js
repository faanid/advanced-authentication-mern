import { describe, expect, it } from "vitest";
import {
  isValidLoginCode,
  sanitizeLoginCode,
  validateEmail,
} from "./authValidation";

describe("validateEmail", () => {
  it("accepts a valid email address", () => {
    expect(validateEmail("user@example.com")).toBe(true);
  });

  it("rejects malformed or non-string values", () => {
    expect(validateEmail("invalid-email")).toBe(false);
    expect(validateEmail("user@localhost")).toBe(false);
    expect(validateEmail("")).toBe(false);
    expect(validateEmail(null)).toBe(false);
  });
});

describe("sanitizeLoginCode", () => {
  it("keeps only the first six digits", () => {
    expect(sanitizeLoginCode("12a34-5678")).toBe("123456");
  });

  it("handles empty and missing values", () => {
    expect(sanitizeLoginCode("")).toBe("");
    expect(sanitizeLoginCode(undefined)).toBe("");
  });
});

describe("isValidLoginCode", () => {
  it("accepts exactly six digits", () => {
    expect(isValidLoginCode("123456")).toBe(true);
  });

  it("rejects incomplete or non-numeric codes", () => {
    expect(isValidLoginCode("12345")).toBe(false);
    expect(isValidLoginCode("12345a")).toBe(false);
    expect(isValidLoginCode("")).toBe(false);
  });
});
