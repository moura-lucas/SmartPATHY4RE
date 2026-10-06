import { z } from "zod";
import { LlmError, LlmUnavailableError } from "./errors.js";
import type { LlmProvider } from "./provider.js";
import { withRetry, type RetryOptions } from "./retry.js";

type RetryConfig = Omit<RetryOptions, "shouldRetry">;

export class LlmService {
  constructor(
    private readonly provider: LlmProvider,
    private readonly retry: RetryConfig = { maxRetries: 3, baseDelayMs: 1000 },
  ) {}

  async generateJson<T>(
    schema: z.ZodType<T>,
    system: string,
    prompt: string,
  ): Promise<T> {
    const jsonSchema = z.toJSONSchema(schema) as Record<string, unknown>;
    try {
      return await withRetry(
        async () =>
          parseAndValidate(
            schema,
            await this.provider.complete({ system, prompt, jsonSchema }),
          ),
        {
          ...this.retry,
          shouldRetry: (e) => e instanceof LlmError && e.retryable,
        },
      );
    } catch (err) {
      // Log only the summarized message: no prompt, key, or request object.
      console.error(
        "[llm] falha definitiva:",
        err instanceof Error ? err.message : String(err),
      );
      throw new LlmUnavailableError({ cause: err });
    }
  }
}

function parseAndValidate<T>(schema: z.ZodType<T>, raw: string): T {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new LlmError("LLM response is not a valid JSON", true);
  }
  const result = schema.safeParse(data);
  if (!result.success)
    throw new LlmError("LLM response is not as the expected schema", true);
  return result.data;
}
