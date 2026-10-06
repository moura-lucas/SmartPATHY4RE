import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { LlmService } from "./llmService.js";
import { LlmError, LlmUnavailableError } from "./errors.js";
import type { LlmProvider } from "./provider.js";

const Schema = z.strictObject({ name: z.string() });

function setup() {
  const provider = { complete: vi.fn<LlmProvider["complete"]>() };
  const sleep = vi.fn(async (_ms: number) => {});
  const service = new LlmService(provider, {
    maxRetries: 3,
    baseDelayMs: 1000,
    sleep,
  });
  return { provider, sleep, service };
}

describe("LlmService.generateJson", () => {
  it("returns the validated object", async () => {
    const { provider, service } = setup();
    provider.complete.mockResolvedValue('{"name":"Ana"}');
    await expect(service.generateJson(Schema, "sys", "p")).resolves.toEqual({
      name: "Ana",
    });
  });

  it("retries when the response does not match the schema", async () => {
    const { provider, service } = setup();
    provider.complete
      .mockResolvedValueOnce('{"nome":1}')
      .mockResolvedValueOnce('{"name":"Ana"}');
    await expect(service.generateJson(Schema, "sys", "p")).resolves.toEqual({
      name: "Ana",
    });
    expect(provider.complete).toHaveBeenCalledTimes(2);
  });

  it("retries when the JSON is invalid", async () => {
    const { provider, service } = setup();
    provider.complete
      .mockResolvedValueOnce("não é json")
      .mockResolvedValueOnce('{"name":"Ana"}');
    await expect(service.generateJson(Schema, "sys", "p")).resolves.toEqual({
      name: "Ana",
    });
  });

  it("performs 4 attempts with increasing backoff and then raises LlmUnavailableError", async () => {
    const { provider, sleep, service } = setup();
    provider.complete.mockRejectedValue(new LlmError("429", true));
    await expect(
      service.generateJson(Schema, "sys", "p"),
    ).rejects.toBeInstanceOf(LlmUnavailableError);
    expect(provider.complete).toHaveBeenCalledTimes(4);
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([1000, 2000, 4000]);
  });

  it("does not retry non-retryable errors (e.g., 401)", async () => {
    const { provider, service } = setup();
    provider.complete.mockRejectedValue(new LlmError("401", false));
    await expect(
      service.generateJson(Schema, "sys", "p"),
    ).rejects.toBeInstanceOf(LlmUnavailableError);
    expect(provider.complete).toHaveBeenCalledTimes(1);
  });
});
