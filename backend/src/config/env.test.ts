import { describe, it, expect } from "vitest";
import { loadEnv } from "./env.js";

it("fails with a clear message when GEMINI_API_KEY is not set.", () => {
  expect(() => loadEnv({})).toThrow(/GEMINI_API_KEY/);
});
it("accepts the key and applies defaults", () => {
  expect(loadEnv({ GEMINI_API_KEY: "k" })).toMatchObject({
    LLM_MODEL: "gemini-3.5-flash",
    PORT: 4000,
  });
});
it("does not leak values ​​in the error message", () => {
  expect(() =>
    loadEnv({ GEMINI_API_KEY: "secret-key", PORT: "abc" }),
  ).not.toThrow(/secret-key/);
});
