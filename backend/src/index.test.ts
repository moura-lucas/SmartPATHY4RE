import { it, expect } from "vitest";
import { spawnSync } from "node:child_process";

it("exits with code 1 and a clear message when GEMINI_API_KEY is missing", () => {
  const { GEMINI_API_KEY: _omit, ...envWithoutKey } = process.env;
  const r = spawnSync("npx", ["tsx", "src/index.ts"], {
    env: envWithoutKey,
    encoding: "utf8",
  });
  expect(r.status).toBe(1);
  expect(r.stderr).toMatch(/GEMINI_API_KEY/);
});
