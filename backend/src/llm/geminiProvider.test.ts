import { describe, it, expect, vi } from "vitest";
import { GeminiProvider, LLM_TIMEOUT_MS } from "./geminiProvider.js";
import { runWithUserKey } from "./requestKey.js";

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
    [429, false, "rate_limited"],
    [500, true, "unavailable"],
    [503, true, "unavailable"],
    [408, true, "unavailable"],
    [400, false, "unavailable"],
    [401, false, "unavailable"],
    [403, false, "unavailable"],
  ])("HTTP %i → retryable=%s, kind=%s (AC11.3)", async (status, retryable, kind) => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("x", { status }));
    await expect(make(fetchMock).complete(req)).rejects.toMatchObject({
      retryable,
      kind,
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
      kind: "unavailable",
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
      kind: "invalid_response",
    });
  });
});

describe("user's own key", () => {
  const usedKey = (fetchMock: ReturnType<typeof vi.fn<typeof fetch>>) =>
    new Headers(fetchMock.mock.calls[0]![1]?.headers).get("x-goog-api-key");

  it("uses the shared key by default", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(ok("{}"));

    await make(fetchMock).complete(req);

    expect(usedKey(fetchMock)).toBe("test-key");
  });

  it("uses the user's key when there is one", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(ok("{}"));

    await runWithUserKey("user-key", () => make(fetchMock).complete(req));

    expect(usedKey(fetchMock)).toBe("user-key");
  });

  it.each([
    [401, "x", "invalid_key"],
    [403, "x", "invalid_key"],
    [400, '{"error":{"details":[{"reason":"API_KEY_INVALID"}]}}', "invalid_key"],
    [429, "x", "key_rate_limited"],
    [400, '{"error":{"message":"bad schema"}}', "unavailable"],
    [503, "x", "unavailable"],
  ])("HTTP %i with body %s → %s", async (status, body, kind) => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(body, { status }));

    await expect(
      runWithUserKey("user-key", () => make(fetchMock).complete(req)),
    ).rejects.toMatchObject({ kind });
  });

  it("does not blame the user for a problem with the shared key", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("API_KEY_INVALID", { status: 400 }));

    await expect(make(fetchMock).complete(req)).rejects.toMatchObject({ kind: "unavailable" });
  });
});

describe("checkKey", () => {
  it.each([
    [200, "valid"],
    [400, "invalid"],
    [401, "invalid"],
    [403, "invalid"],
    [429, "unavailable"],
    [500, "unavailable"],
  ])("HTTP %i → %s", async (status, expected) => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response("{}", { status }));

    await expect(make(fetchMock).checkKey("k")).resolves.toBe(expected);
  });

  it("sends the key in a header, never in the URL", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response("{}", { status: 200 }));

    await make(fetchMock).checkKey("secret-key");

    expect(String(fetchMock.mock.calls[0]![0])).not.toContain("secret-key");
    expect(new Headers(fetchMock.mock.calls[0]![1]?.headers).get("x-goog-api-key")).toBe("secret-key");
  });

  it("reports a network failure as unavailable", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("fetch failed"));

    await expect(make(fetchMock).checkKey("k")).resolves.toBe("unavailable");
  });
});
