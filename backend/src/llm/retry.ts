export interface RetryOptions {
  maxRetries: number; // 3 → up to 4 attempts
  baseDelayMs: number; // 1000 → 1s, 2s, 4s
  shouldRetry: (err: unknown) => boolean;
  sleep?: (ms: number) => Promise<void>; // injectable, so the tests don't actually have to wait
}

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions,
): Promise<T> {
  const sleep = opts.sleep ?? defaultSleep;
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= opts.maxRetries || !opts.shouldRetry(err)) throw err;
      await sleep(opts.baseDelayMs * 2 ** attempt);
    }
  }
}
