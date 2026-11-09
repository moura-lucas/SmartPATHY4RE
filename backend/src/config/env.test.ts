import { describe, it, expect } from "vitest";
import { loadEnv } from "./env.js";

const SECRET = "a".repeat(64);

it("fails with a clear message when GEMINI_API_KEY is not set.", () => {
  expect(() => loadEnv({})).toThrow(/GEMINI_API_KEY/);
});
it("accepts the key and applies defaults", () => {
  expect(loadEnv({ DATABASE_URL: "mysql://localhost/db", GEMINI_API_KEY: "k", KEY_ENCRYPTION_SECRET: SECRET })).toMatchObject({
    LLM_MODEL: "gemini-3.5-flash",
    PORT: 4000,
  });
});
it("fails with a clear message when DATABASE_URL is not set.", () => {
  expect(() => loadEnv({ GEMINI_API_KEY: "k", KEY_ENCRYPTION_SECRET: SECRET })).toThrow(/DATABASE_URL/);
});
it("does not leak values ​​in the error message", () => {
  expect(() =>
    loadEnv({ DATABASE_URL: "mysql://user:secret-pass@db/x", GEMINI_API_KEY: "secret-key", KEY_ENCRYPTION_SECRET: SECRET, PORT: "abc" }),
  ).not.toThrow(/secret-key|secret-pass/);
});
it("treats a blank LEGACY_OWNER_EMAIL as not set", () => {
  expect(
    loadEnv({ DATABASE_URL: "mysql://localhost/db", GEMINI_API_KEY: "k", KEY_ENCRYPTION_SECRET: SECRET, LEGACY_OWNER_EMAIL: "" })
      .LEGACY_OWNER_EMAIL,
  ).toBeUndefined();
});
it("defaults the frontend origin for development", () => {
  expect(loadEnv({ DATABASE_URL: "mysql://localhost/db", GEMINI_API_KEY: "k", KEY_ENCRYPTION_SECRET: SECRET }).CORS_ORIGIN).toBe(
    "http://localhost:3000",
  );
});
it("fails with a clear message when KEY_ENCRYPTION_SECRET is not 32 bytes in hex", () => {
  expect(() =>
    loadEnv({ DATABASE_URL: "mysql://localhost/db", GEMINI_API_KEY: "k", KEY_ENCRYPTION_SECRET: "short" }),
  ).toThrow(/KEY_ENCRYPTION_SECRET/);
});
