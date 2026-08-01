import { describe, expect, it } from "vitest";

import { DEFAULT_DISPLAY_NAME, displayNameFromEmail } from "@/lib/display-name";

describe("displayNameFromEmail", () => {
  it("upper-cases only the first character, not each word", () => {
    // Go upper-cased runes[0] and nothing else. "Ada Lovelace" would be wrong.
    expect(displayNameFromEmail("ada.lovelace@example.com")).toBe("Ada lovelace");
  });

  it("turns dots and underscores into spaces", () => {
    expect(displayNameFromEmail("a.b_c@example.com")).toBe("A b c");
  });

  it("leaves an already-capitalised local part alone", () => {
    expect(displayNameFromEmail("Ada@example.com")).toBe("Ada");
  });

  it("ignores everything after the @", () => {
    expect(displayNameFromEmail("ada@sub.domain.example.com")).toBe("Ada");
  });

  it("falls back when the local part is empty or all separators", () => {
    // Go returned its default for an empty local part; separators collapse to
    // spaces, which stay non-empty, so those keep the spaces — matching Go,
    // which only tested `local == ""` before the replacements' result.
    expect(displayNameFromEmail("@example.com")).toBe(DEFAULT_DISPLAY_NAME);
    expect(displayNameFromEmail("")).toBe(DEFAULT_DISPLAY_NAME);
  });

  it("handles an astral-plane first character without splitting the pair", () => {
    // Iterating UTF-16 units would slice the surrogate pair and emit U+FFFD.
    expect(displayNameFromEmail("𝒶da@example.com")).toBe("𝒶da");
  });

  it("keeps one character when upper-casing expands", () => {
    // "ß".toUpperCase() is "SS"; Go kept only the first rune.
    expect(displayNameFromEmail("ßeta@example.com")).toBe("Seta");
  });
});
