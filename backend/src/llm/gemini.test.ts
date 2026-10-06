import { describe, expect, it, vi } from "vitest";
import { GeminiClient } from "./gemini.js";
import { createLLMClient, LLMError } from "./index.js";

const ok = (text: string) =>
  new Response(
    JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }),
    {
      status: 200,
    },
  );

const makeClient = (fetchMock: typeof fetch) =>
  new GeminiClient({
    apiKey: "test-key",
    model: "gemini-test",
    fetch: fetchMock,
    maxRetries: 2,
  });

describe("GeminiClient", () => {
  it("sends the prompt and returns the generated text", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(ok("hi"));
    const result = await makeClient(fetchMock).generate("say hi", {
      systemPrompt: "be brief",
      json: true,
      temperature: 0.2,
    });

    expect(result).toBe("hi");
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toContain("/models/gemini-test:generateContent");
    expect((init?.headers as Record<string, string>)["x-goog-api-key"]).toBe(
      "test-key",
    );
    expect(JSON.parse(init?.body as string)).toEqual({
      contents: [{ role: "user", parts: [{ text: "say hi" }] }],
      systemInstruction: { parts: [{ text: "be brief" }] },
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });
  });

  it("try again on 429/5xx errors.", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("quota", { status: 429 }))
      .mockResolvedValueOnce(ok("after"));

    await expect(makeClient(fetchMock).generate("x")).resolves.toBe("after");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("do not retry on 4xx errors", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("bad key", { status: 400 }));

    await expect(makeClient(fetchMock).generate("x")).rejects.toMatchObject({
      status: 400,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("fails when the prompt is blocked", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ promptFeedback: { blockReason: "SAFETY" } }),
          { status: 200 },
        ),
      );

    await expect(makeClient(fetchMock).generate("x")).rejects.toBeInstanceOf(
      LLMError,
    );
  });
});

describe("createLLMClient", () => {
  it("exige GEMINI_API_KEY", () => {
    expect(() => createLLMClient({})).toThrow(/GEMINI_API_KEY/);
  });

  it("cria um GeminiClient quando a chave existe", () => {
    expect(createLLMClient({ GEMINI_API_KEY: "k" })).toBeInstanceOf(
      GeminiClient,
    );
  });
});
