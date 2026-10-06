import { LlmError } from "./errors.js";
import type { LlmProvider, LlmRequest } from "./provider.js";

export const LLM_TIMEOUT_MS = 60_000;
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

export interface GeminiProviderConfig {
  apiKey: string;
  model: string;
  timeoutMs?: number;
  fetch?: typeof fetch; // injectable, so tests never hit the real API
}

interface GeminiResponse {
  candidates?: {
    content?: { parts?: { text?: string; thought?: boolean }[] };
    finishReason?: string;
  }[];
  promptFeedback?: { blockReason?: string };
}

// The provider makes exactly ONE call. Retries are handled by LlmService.
export class GeminiProvider implements LlmProvider {
  private readonly timeoutMs: number;
  private readonly fetch: typeof fetch;

  constructor(private readonly config: GeminiProviderConfig) {
    this.timeoutMs = config.timeoutMs ?? LLM_TIMEOUT_MS;
    this.fetch = config.fetch ?? globalThis.fetch;
  }

  async complete(req: LlmRequest): Promise<string> {
    // z.toJSONSchema() adds "$schema", which Gemini doesn't need
    const { $schema: _ignored, ...schema } = req.jsonSchema;
    const url = `${BASE_URL}/models/${encodeURIComponent(this.config.model)}:generateContent`;

    let data: GeminiResponse;
    try {
      const res = await this.fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.config.apiKey, // header, never a query string (avoids leaking it into logs)
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: req.system }] },
          contents: [{ role: "user", parts: [{ text: req.prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseJsonSchema: schema, // structured output
          },
        }),
        signal: AbortSignal.timeout(this.timeoutMs), // AC1.6: cancels after 60s
      });
      if (!res.ok) throw httpError(res.status);
      data = (await res.json()) as GeminiResponse;
    } catch (err) {
      throw err instanceof LlmError ? err : toNetworkError(err);
    }

    if (data.promptFeedback?.blockReason) {
      throw new LlmError(
        `Prompt blocked by Gemini (${data.promptFeedback.blockReason})`,
        false,
      );
    }

    const candidate = data.candidates?.[0];
    if (candidate?.finishReason === "MAX_TOKENS") {
      throw new LlmError("Gemini response was truncated", true);
    }

    const text =
      candidate?.content?.parts
        ?.filter((p) => !p.thought)
        .map((p) => p.text ?? "")
        .join("") ?? "";
    if (!text) {
      const reason = candidate?.finishReason ?? "unknown";
      throw new LlmError(
        `Gemini returned no text (finishReason: ${reason})`,
        reason !== "SAFETY",
      );
    }
    return text;
  }
}

// Only the status goes into the message: the response body isn't logged or propagated
function httpError(status: number): LlmError {
  const retryable = status === 408 || status === 429 || status >= 500;
  return new LlmError(`Gemini responded with HTTP ${status}`, retryable);
}

function toNetworkError(err: unknown): LlmError {
  if (err instanceof DOMException && err.name === "TimeoutError") {
    return new LlmError("Gemini call timed out", true, { cause: err });
  }
  return new LlmError("Connection failure with Gemini", true, { cause: err });
}
