import { describe, it, expect } from "vitest";
import { loadEnv } from "./env.js";

it("fails with a clear message when GEMINI_API_KEY is not set.", () => {
  expect(() => loadEnv({})).toThrow(/GEMINI_API_KEY/);
});
it("accepts the key and applies defaults", () => {
  expect(loadEnv({ DATABASE_URL: "mysql://localhost/db", GEMINI_API_KEY: "k" })).toMatchObject({
    LLM_MODEL: "gemini-3.5-flash",
    PORT: 4000,
  });
});
it("fails with a clear message when DATABASE_URL is not set.", () => {
  expect(() => loadEnv({ GEMINI_API_KEY: "k" })).toThrow(/DATABASE_URL/);
});
it("does not leak values ​​in the error message", () => {
  expect(() =>
    loadEnv({ DATABASE_URL: "mysql://user:secret-pass@db/x", GEMINI_API_KEY: "secret-key", PORT: "abc" }),
  ).not.toThrow(/secret-key|secret-pass/);
});
