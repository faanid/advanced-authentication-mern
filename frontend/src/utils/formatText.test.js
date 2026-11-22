import { describe, expect, it } from "vitest";
import { shortenText } from "./formatText";

describe("shortenText", () => {
  it("shortens text longer than the requested length", () => {
    expect(shortenText("Authentication", 5)).toBe("Authe...");
  });

  it("returns text that fits within the requested length", () => {
    expect(shortenText("Login", 5)).toBe("Login");
  });

  it("handles empty and non-string values", () => {
    expect(shortenText("", 5)).toBe("");
    expect(shortenText(null, 5)).toBe("");
  });

  it("returns the original value for an invalid length", () => {
    expect(shortenText("Login", -1)).toBe("Login");
  });
});
