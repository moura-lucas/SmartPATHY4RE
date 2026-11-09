import { describe, expect, it } from "vitest";
import { validateGeminiKey } from "./account.js";

describe("validateGeminiKey", () => {
  it("accepts a key, trimming it", () => {
    expect(validateGeminiKey({ apiKey: "  AIzaSy_abc-123  " })).toEqual({
      success: true,
      data: { apiKey: "AIzaSy_abc-123" },
    });
  });

  it.each([
    ["empty", "   ", "Enter your Gemini API key"],
    ["with invalid characters", "abc def!", "This does not look like a Gemini API key"],
    ["too long", "a".repeat(201), "This does not look like a Gemini API key"],
  ])("rejects a key that is %s", (_name, apiKey, message) => {
    expect(validateGeminiKey({ apiKey })).toEqual({
      success: false,
      fieldErrors: { apiKey: [message] },
    });
  });

  it("accepts the newer key formats, with dots", () => {
    expect(validateGeminiKey({ apiKey: "AQ.Ab8RN6Key_abc-123" }).success).toBe(true);
  });

  it("requires the field", () => {
    expect(validateGeminiKey(undefined)).toEqual({
      success: false,
      fieldErrors: { apiKey: ["Enter your Gemini API key"] },
    });
  });
});
