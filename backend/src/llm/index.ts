import { GeminiClient } from "./gemini.js";
import type { LLMClient } from "./types.js";

export * from "./types.js";
export { GeminiClient } from "./gemini.js";

const DEFAULT_MODEL = "gemini-3.5-flash";

export function createLLMClient(
  env: NodeJS.ProcessEnv = process.env,
): LLMClient {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY not defined. Generate a key in https://aistudio.google.com/apikey",
    );
  }
  return new GeminiClient({ apiKey, model: env.LLM_MODEL || DEFAULT_MODEL });
}
