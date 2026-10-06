import { describe, it, expect, vi } from "vitest";
import { GeminiProvider, LLM_TIMEOUT_MS } from "./geminiProvider.js";

const ok = (text: string, finishReason = "STOP") =>
  new Response(
    JSON.stringify({
      candidates: [{ content: { parts: [{ text }] }, finishReason }],
    }),
    {
      status: 200,
    },
  );

const req = {
  system: "sys",
  prompt: "p",
  jsonSchema: {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
  },
};

const make = (fetchMock: typeof fetch, timeoutMs?: number) =>
  new GeminiProvider({
    apiKey: "test-key",
    model: "gemini-test",
    fetch: fetchMock,
    ...(timeoutMs !== undefined && { timeoutMs }),
  });

describe("GeminiProvider", () => {
  it("sends the system, prompt, schema, and the key in the header", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(ok('{"a":1}'));
    await expect(make(fetchMock).complete(req)).resolves.toBe('{"a":1}');

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toContain("/models/gemini-test:generateContent");
    expect(url).not.toContain("test-key");
    expect((init?.headers as Record<string, string>)["x-goog-api-key"]).toBe(
      "test-key",
    );
    expect(JSON.parse(init?.body as string)).toEqual({
      systemInstruction: { parts: [{ text: "sys" }] },
      contents: [{ role: "user", parts: [{ text: "p" }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseJsonSchema: { type: "object" },
      },
    });
  });

  it.each([
    [429, true],
    [500, true],
    [503, true],
    [400, false],
    [401, false],
    [403, false],
  ])("HTTP %i → retryable=%s", async (status, retryable) => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("x", { status }));
    await expect(make(fetchMock).complete(req)).rejects.toMatchObject({
      retryable,
    });
  });

  it("cancels the call upon timeout and marks it as retryable (AC1.6)", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init!.signal!.addEventListener("abort", () =>
            reject(init!.signal!.reason),
          );
        }),
    );
    await expect(make(fetchMock, 10).complete(req)).rejects.toMatchObject({
      retryable: true,
      message: expect.stringMatching(/timed out/),
    });
  });

  it("default timeout is 60s", () => {
    expect(LLM_TIMEOUT_MS).toBe(60_000);
  });

  it("network failure is retriable.", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new TypeError("fetch failed"));
    await expect(make(fetchMock).complete(req)).rejects.toMatchObject({
      retryable: true,
    });
  });

  it("blocked prompt is not retryable.", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ promptFeedback: { blockReason: "SAFETY" } }),
          { status: 200 },
        ),
      );
    await expect(make(fetchMock).complete(req)).rejects.toMatchObject({
      retryable: false,
    });
  });

  it("truncated response (MAX_TOKENS) is retryable.", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(ok('{"a":', "MAX_TOKENS"));
    await expect(make(fetchMock).complete(req)).rejects.toMatchObject({
      retryable: true,
    });
  });
});
