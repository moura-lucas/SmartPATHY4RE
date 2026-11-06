import { describe, expect, it } from "vitest";
import { GENERATION_ERROR_CODES, isGenerationErrorCode } from "./generation.js";

describe("isGenerationErrorCode", () => {
  it.each(GENERATION_ERROR_CODES)("accepts %s", (code) => {
    expect(isGenerationErrorCode(code)).toBe(true);
  });

  it.each([undefined, null, "", "ai_timeout", 502])("rejects %s", (value) => {
    expect(isGenerationErrorCode(value)).toBe(false);
  });
});
