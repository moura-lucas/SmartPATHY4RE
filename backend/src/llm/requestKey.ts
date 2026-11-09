import { AsyncLocalStorage } from "node:async_hooks";

const storage = new AsyncLocalStorage<string>();

/** Everything called from `run` uses this user's Gemini key instead of the shared one. */
export function runWithUserKey<T>(apiKey: string, run: () => T): T {
  return storage.run(apiKey, run);
}

/** The key of the current generation, when the user has their own. */
export function currentUserKey(): string | undefined {
  return storage.getStore();
}
