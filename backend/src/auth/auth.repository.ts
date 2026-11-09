import type { UserDto } from "@smartpathy/shared";
import type { PrismaClient } from "../generated/prisma/client.js";

export interface NewUser {
  name: string;
  email: string;
  passwordHash: string;
}

export interface AuthRepository {
  /**
   * Null when the email is already in use. `claimLegacyProjects` hands over the
   * projects created before accounts existed, in the same transaction.
   */
  createUser(user: NewUser, claimLegacyProjects: boolean): Promise<UserDto | null>;
  findCredentials(email: string): Promise<{ user: UserDto; passwordHash: string } | null>;
  createSession(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  findSession(tokenHash: string): Promise<{ user: UserDto; expiresAt: Date } | null>;
  extendSession(tokenHash: string, expiresAt: Date): Promise<void>;
  deleteSession(tokenHash: string): Promise<void>;
  deleteExpiredSessions(now: Date): Promise<void>;
}

const PUBLIC_FIELDS = { id: true, name: true, email: true } as const;

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === "P2002";
}

export function createAuthRepository(prisma: PrismaClient): AuthRepository {
  return {
    async createUser(user, claimLegacyProjects) {
      try {
        return await prisma.$transaction(async (tx) => {
          const created = await tx.user.create({ data: user, select: PUBLIC_FIELDS });
          if (claimLegacyProjects) {
            await tx.project.updateMany({ where: { userId: null }, data: { userId: created.id } });
          }
          return created;
        });
      } catch (err) {
        if (isUniqueViolation(err)) return null;
        throw err;
      }
    },
    async findCredentials(email) {
      const row = await prisma.user.findUnique({
        where: { email },
        select: { ...PUBLIC_FIELDS, passwordHash: true },
      });
      if (!row) return null;
      const { passwordHash, ...user } = row;
      return { user, passwordHash };
    },
    async createSession(userId, tokenHash, expiresAt) {
      await prisma.session.create({ data: { userId, tokenHash, expiresAt } });
    },
    async findSession(tokenHash) {
      const row = await prisma.session.findUnique({
        where: { tokenHash },
        select: { expiresAt: true, user: { select: PUBLIC_FIELDS } },
      });
      return row;
    },
    async extendSession(tokenHash, expiresAt) {
      await prisma.session.updateMany({ where: { tokenHash }, data: { expiresAt } });
    },
    async deleteSession(tokenHash) {
      await prisma.session.deleteMany({ where: { tokenHash } });
    },
    async deleteExpiredSessions(now) {
      await prisma.session.deleteMany({ where: { expiresAt: { lt: now } } });
    },
  };
}
