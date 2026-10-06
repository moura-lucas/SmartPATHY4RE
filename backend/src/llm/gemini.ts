import { LLMError, type GenerateOptions, type LLMClient } from "./types.js";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

export interface GeminiConfig {
  apiKey: string;
  model: string;
  maxRetries?: number;
  timeoutMs?: number;
  fetch?: typeof fetch;
}

interface GeminiResponse {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    finishReason?: string;
  }[];
  promptFeedback?: { blockReason?: string };
}

// 429 (free tier quota) and 5xx errors are usually transient.
const isRetryable = (status: number) => status === 429 || status >= 500;

export class GeminiClient implements LLMClient {
  private readonly maxRetries: number;
  private readonly timeoutMs: number;
  private readonly fetch: typeof fetch;

  constructor(private readonly config: GeminiConfig) {
    this.maxRetries = config.maxRetries ?? 2;
    this.timeoutMs = config.timeoutMs ?? 60_000;
    this.fetch = config.fetch ?? globalThis.fetch;
  }

  async generate(
    prompt: string,
    options: GenerateOptions = {},
  ): Promise<string> {
    const body = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      ...(options.systemPrompt && {
        systemInstruction: { parts: [{ text: options.systemPrompt }] },
      }),
      generationConfig: {
        ...(options.json && { responseMimeType: "application/json" }),
        ...(options.temperature !== undefined && {
          temperature: options.temperature,
        }),
      },
    };

    let lastError: unknown;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) await sleep(500 * 2 ** (attempt - 1));
      try {
        return await this.request(body);
      } catch (error) {
        lastError = error;
        const retryable =
          !(error instanceof LLMError) ||
          (error.status !== undefined && isRetryable(error.status));
        if (!retryable) throw error;
      }
    }
    throw lastError;
  }

  private async request(body: unknown): Promise<string> {
    const url = `${BASE_URL}/models/${encodeURIComponent(this.config.model)}:generateContent`;
    const res = await this.fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": this.config.apiKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new LLMError(
        `Gemini respondeu ${res.status}: ${detail}`,
        res.status,
      );
    }

    const data = (await res.json()) as GeminiResponse;
    if (data.promptFeedback?.blockReason) {
      throw new LLMError(
        `Prompt bloqueado pelo Gemini: ${data.promptFeedback.blockReason}`,
      );
    }
    const text = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("");
    if (!text) {
      const reason = data.candidates?.[0]?.finishReason ?? "desconhecido";
      throw new LLMError(`Gemini não retornou texto (finishReason: ${reason})`);
    }
    return text;
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
