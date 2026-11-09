import express, { type Express } from "express";
import request from "supertest";
import { SHARED_KEY_DAILY_LIMIT } from "@smartpathy/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TEST_USER } from "../auth/auth.fixtures.js";
import { errorHandler } from "../http/errorHandler.js";
import type { KeyCheckResult } from "../llm/geminiProvider.js";
import { currentUserKey } from "../llm/requestKey.js";
import type { AccountRepository, StoredKey } from "./account.repository.js";
import { createAccountModule } from "./account.routes.js";
import { createKeyCipher } from "./keyCipher.js";

const KEY = "AIzaSyUserOwnKey1234";
const NOW = new Date("2026-11-09T23:30:00.000Z");
const cipher = createKeyCipher("c".repeat(64));

let stored: StoredKey | null;
let used: number;
let repository: AccountRepository;
let check: ReturnType<typeof vi.fn<(apiKey: string) => Promise<KeyCheckResult>>>;
let status: number;
let keySeenByGeneration: string | undefined;

function app(): Express {
  const server = express();
  server.use(express.json());
  server.use((req, _res, next) => {
    req.user = TEST_USER;
    next();
  });
  const account = createAccountModule({
    repository,
    cipher,
    keyChecker: { checkKey: check },
    now: () => NOW,
  });
  server.use("/account", account.routes);
  server.post("/generate", account.generationAccess, async (_req, res) => {
    await new Promise((resolve) => setImmediate(resolve)); // like the real, asynchronous call
    keySeenByGeneration = currentUserKey();
    res.status(status).json({});
  });
  server.use(errorHandler);
  return server;
}

beforeEach(() => {
  stored = null;
  used = 0;
  status = 201;
  keySeenByGeneration = undefined;
  check = vi.fn(async () => "valid" as const);
  repository = {
    findKey: vi.fn(async () => stored),
    saveKey: vi.fn(async (_id, key) => {
      stored = key;
    }),
    deleteKey: vi.fn(async () => {
      stored = null;
    }),
    usageOn: vi.fn(async () => used),
    recordUse: vi.fn(async () => {}),
  };
});

const saveKey = (body: object) => request(app()).put("/account/gemini-key").send(body);

describe("GET /account/gemini-key", () => {
  it("reports no key and the day's usage", async () => {
    used = 2;

    const res = await request(app()).get("/account/gemini-key");

    expect(res.body).toEqual({
      hasKey: false,
      last4: null,
      dailyLimit: SHARED_KEY_DAILY_LIMIT,
      usedToday: 2,
    });
  });

  it("never returns the key, only how it ends", async () => {
    stored = { encrypted: cipher.encrypt(TEST_USER.id, KEY), last4: "1234" };

    const res = await request(app()).get("/account/gemini-key");

    expect(res.body).toMatchObject({ hasKey: true, last4: "1234" });
    expect(res.text).not.toContain(KEY);
    expect(res.text).not.toContain(stored.encrypted);
  });
});

describe("PUT /account/gemini-key", () => {
  it("saves only an encrypted key, after checking it", async () => {
    const res = await saveKey({ apiKey: `  ${KEY}  ` });

    expect(res.status).toBe(204);
    expect(check).toHaveBeenCalledWith(KEY);
    expect(stored!.last4).toBe("1234");
    expect(stored!.encrypted).not.toContain(KEY);
    expect(cipher.decrypt(TEST_USER.id, stored!.encrypted)).toBe(KEY);
  });

  it("responds 400 and saves nothing when Google refuses the key", async () => {
    check.mockResolvedValue("invalid");

    const res = await saveKey({ apiKey: KEY });

    expect(res.status).toBe(400);
    expect(res.body.fieldErrors.apiKey).toEqual([
      "Google did not accept this key. Check it and try again.",
    ]);
    expect(repository.saveKey).not.toHaveBeenCalled();
  });

  it("responds 502 and saves nothing when the key cannot be checked", async () => {
    check.mockResolvedValue("unavailable");

    expect((await saveKey({ apiKey: KEY })).status).toBe(502);
    expect(repository.saveKey).not.toHaveBeenCalled();
  });

  it("responds 400 for a malformed key, without calling Google", async () => {
    const res = await saveKey({ apiKey: "not a key!" });

    expect(res.status).toBe(400);
    expect(check).not.toHaveBeenCalled();
  });

  it("limits repeated attempts", async () => {
    const server = app();
    for (let i = 0; i < 10; i++) await request(server).put("/account/gemini-key").send({ apiKey: KEY });

    const res = await request(server).put("/account/gemini-key").send({ apiKey: KEY });

    expect(res.status).toBe(429);
  });
});

describe("DELETE /account/gemini-key", () => {
  it("removes the key", async () => {
    stored = { encrypted: "x", last4: "1234" };

    expect((await request(app()).delete("/account/gemini-key")).status).toBe(204);
    expect(stored).toBeNull();
  });
});

describe("generationAccess", () => {
  describe("with the user's own key", () => {
    beforeEach(() => {
      stored = { encrypted: cipher.encrypt(TEST_USER.id, KEY), last4: "1234" };
    });

    it("runs the generation with that key", async () => {
      expect((await request(app()).post("/generate")).status).toBe(201);
      expect(keySeenByGeneration).toBe(KEY);
    });

    it("has no daily limit and is not counted", async () => {
      used = SHARED_KEY_DAILY_LIMIT + 10;

      expect((await request(app()).post("/generate")).status).toBe(201);
      expect(repository.recordUse).not.toHaveBeenCalled();
    });

    it("never falls back to the shared key when it cannot be read", async () => {
      stored = { encrypted: "garbage", last4: "1234" };

      const res = await request(app()).post("/generate");

      expect(res.status).toBe(502);
      expect(res.body.code).toBe("ai_invalid_key");
      expect(keySeenByGeneration).toBeUndefined();
    });
  });

  describe("with the shared key", () => {
    it("uses no user key", async () => {
      await request(app()).post("/generate");

      expect(keySeenByGeneration).toBeUndefined();
    });

    it("counts a generation that worked, on the UTC day", async () => {
      await request(app()).post("/generate");

      await vi.waitFor(() =>
        expect(repository.recordUse).toHaveBeenCalledWith(
          TEST_USER.id,
          new Date("2026-11-09T00:00:00.000Z"),
        ),
      );
    });

    it("does not count a generation that failed", async () => {
      status = 502;

      await request(app()).post("/generate");
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(repository.recordUse).not.toHaveBeenCalled();
    });

    it("allows the last generation of the day", async () => {
      used = SHARED_KEY_DAILY_LIMIT - 1;

      expect((await request(app()).post("/generate")).status).toBe(201);
    });

    it("blocks after the daily limit, without generating", async () => {
      used = SHARED_KEY_DAILY_LIMIT;
      status = 500;

      const res = await request(app()).post("/generate");

      expect(res.status).toBe(429);
      expect(res.body.code).toBe("ai_daily_limit");
      expect(repository.recordUse).not.toHaveBeenCalled();
    });
  });
});
