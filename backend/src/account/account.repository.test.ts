import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../generated/prisma/client.js";
import { createAccountRepository } from "./account.repository.js";

const DAY = new Date("2026-11-09T00:00:00.000Z");

function fakePrisma() {
  const user = {
    findUnique: vi.fn(async (): Promise<unknown> => ({
      geminiKeyEncrypted: "enc",
      geminiKeyLast4: "1234",
    })),
    update: vi.fn(async () => ({})),
  };
  const generationUsage = {
    findUnique: vi.fn(async (): Promise<unknown> => ({ count: 3 })),
    upsert: vi.fn(async () => ({})),
  };
  return {
    user,
    generationUsage,
    prisma: { user, generationUsage } as unknown as PrismaClient,
  };
}

describe("createAccountRepository", () => {
  it("returns the stored key", async () => {
    const { prisma } = fakePrisma();

    await expect(createAccountRepository(prisma).findKey("u1")).resolves.toEqual({
      encrypted: "enc",
      last4: "1234",
    });
  });

  it("returns null without a key", async () => {
    const { user, prisma } = fakePrisma();
    user.findUnique.mockResolvedValueOnce({ geminiKeyEncrypted: null, geminiKeyLast4: null });

    await expect(createAccountRepository(prisma).findKey("u1")).resolves.toBeNull();
  });

  it("clears both columns when removing the key", async () => {
    const { user, prisma } = fakePrisma();

    await createAccountRepository(prisma).deleteKey("u1");

    expect(user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { geminiKeyEncrypted: null, geminiKeyLast4: null },
    });
  });

  it("reads the usage of a day", async () => {
    const { prisma } = fakePrisma();

    await expect(createAccountRepository(prisma).usageOn("u1", DAY)).resolves.toBe(3);
  });

  it("counts zero when nothing was used", async () => {
    const { generationUsage, prisma } = fakePrisma();
    generationUsage.findUnique.mockResolvedValueOnce(null);

    await expect(createAccountRepository(prisma).usageOn("u1", DAY)).resolves.toBe(0);
  });

  it("adds to the day's usage", async () => {
    const { generationUsage, prisma } = fakePrisma();

    await createAccountRepository(prisma).recordUse("u1", DAY);

    expect(generationUsage.upsert).toHaveBeenCalledWith({
      where: { userId_day: { userId: "u1", day: DAY } },
      create: { userId: "u1", day: DAY, count: 1 },
      update: { count: { increment: 1 } },
    });
  });
});
