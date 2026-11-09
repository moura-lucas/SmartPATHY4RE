import type { PrismaClient } from "../generated/prisma/client.js";

export interface StoredKey {
  encrypted: string;
  last4: string;
}

export interface AccountRepository {
  findKey(userId: string): Promise<StoredKey | null>;
  saveKey(userId: string, key: StoredKey): Promise<void>;
  deleteKey(userId: string): Promise<void>;
  /** Generations made with the shared key on that day. */
  usageOn(userId: string, day: Date): Promise<number>;
  recordUse(userId: string, day: Date): Promise<void>;
}

export function createAccountRepository(prisma: PrismaClient): AccountRepository {
  return {
    async findKey(userId) {
      const row = await prisma.user.findUnique({
        where: { id: userId },
        select: { geminiKeyEncrypted: true, geminiKeyLast4: true },
      });
      if (!row?.geminiKeyEncrypted || !row.geminiKeyLast4) return null;
      return { encrypted: row.geminiKeyEncrypted, last4: row.geminiKeyLast4 };
    },
    async saveKey(userId, key) {
      await prisma.user.update({
        where: { id: userId },
        data: { geminiKeyEncrypted: key.encrypted, geminiKeyLast4: key.last4 },
      });
    },
    async deleteKey(userId) {
      await prisma.user.update({
        where: { id: userId },
        data: { geminiKeyEncrypted: null, geminiKeyLast4: null },
      });
    },
    async usageOn(userId, day) {
      const row = await prisma.generationUsage.findUnique({
        where: { userId_day: { userId, day } },
        select: { count: true },
      });
      return row?.count ?? 0;
    },
    async recordUse(userId, day) {
      await prisma.generationUsage.upsert({
        where: { userId_day: { userId, day } },
        create: { userId, day, count: 1 },
        update: { count: { increment: 1 } },
      });
    },
  };
}
