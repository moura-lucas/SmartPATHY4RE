import { Router, type RequestHandler } from "express";
import { rateLimit } from "express-rate-limit";
import {
  SHARED_KEY_DAILY_LIMIT,
  validateGeminiKey,
  type GeminiKeyStatusDto,
  type GenerationErrorBody,
} from "@smartpathy/shared";
import type { KeyCheckResult } from "../llm/geminiProvider.js";
import { runWithUserKey } from "../llm/requestKey.js";
import type { AccountRepository } from "./account.repository.js";
import type { KeyCipher } from "./keyCipher.js";

export interface AccountModule {
  routes: Router;
  /** Decides which key a generation uses, and enforces the daily limit of the shared one. */
  generationAccess: RequestHandler;
}

const DAILY_LIMIT_REACHED: GenerationErrorBody = {
  code: "ai_daily_limit",
  error: "You have used all of today's free generations.",
};

const UNREADABLE_KEY: GenerationErrorBody = {
  code: "ai_invalid_key",
  error: "Your Gemini key could not be used. Please save it again in Settings.",
};

function today(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function createAccountModule(deps: {
  repository: AccountRepository;
  cipher: KeyCipher;
  keyChecker: { checkKey(apiKey: string): Promise<KeyCheckResult> };
  now?: () => Date;
}): AccountModule {
  const { repository, cipher, keyChecker } = deps;
  const now = deps.now ?? (() => new Date());

  const generationAccess: RequestHandler = async (req, res, next) => {
    const userId = req.user!.id;

    const stored = await repository.findKey(userId);
    if (stored) {
      let apiKey: string;
      try {
        apiKey = cipher.decrypt(userId, stored.encrypted);
      } catch {
        res.status(502).json(UNREADABLE_KEY); // never falls back to the shared key
        return;
      }
      runWithUserKey(apiKey, next);
      return;
    }

    const day = today(now());
    if ((await repository.usageOn(userId, day)) >= SHARED_KEY_DAILY_LIMIT) {
      res.status(429).json(DAILY_LIMIT_REACHED);
      return;
    }
    res.once("finish", () => {
      // Only a generation that worked counts against the user.
      if (res.statusCode !== 201) return;
      repository.recordUse(userId, day).catch((err: unknown) => {
        console.error("[account] could not record usage:", err instanceof Error ? err.message : err);
      });
    });
    next();
  };

  const routes = Router();

  // Saving a key checks it against Google, so guessing keys here has to stay slow.
  const saveLimit = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many attempts. Please try again later." },
    keyGenerator: (req) => req.user!.id,
  });

  routes.get("/gemini-key", async (req, res) => {
    const userId = req.user!.id;
    const [stored, usedToday] = await Promise.all([
      repository.findKey(userId),
      repository.usageOn(userId, today(now())),
    ]);
    const status: GeminiKeyStatusDto = {
      hasKey: stored !== null,
      last4: stored?.last4 ?? null,
      dailyLimit: SHARED_KEY_DAILY_LIMIT,
      usedToday,
    };
    res.json(status);
  });

  routes.put("/gemini-key", saveLimit, async (req, res) => {
    const validation = validateGeminiKey(req.body);
    if (!validation.success) {
      res.status(400).json({ error: "Invalid key.", fieldErrors: validation.fieldErrors });
      return;
    }

    const { apiKey } = validation.data;
    const check = await keyChecker.checkKey(apiKey);
    if (check === "invalid") {
      res.status(400).json({
        error: "Invalid key.",
        fieldErrors: { apiKey: ["Google did not accept this key. Check it and try again."] },
      });
      return;
    }
    if (check === "unavailable") {
      res.status(502).json({ error: "Could not check the key right now. Please try again." });
      return;
    }

    const userId = req.user!.id;
    await repository.saveKey(userId, {
      encrypted: cipher.encrypt(userId, apiKey),
      last4: apiKey.slice(-4),
    });
    res.status(204).end();
  });

  routes.delete("/gemini-key", async (req, res) => {
    await repository.deleteKey(req.user!.id);
    res.status(204).end();
  });

  return { routes, generationAccess };
}
