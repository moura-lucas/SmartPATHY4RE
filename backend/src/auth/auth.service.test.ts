import bcrypt from "bcryptjs";
import { SESSION_TTL_MS } from "@smartpathy/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthRepository } from "./auth.repository.js";
import { createAuthService } from "./auth.service.js";

const user = { id: "user-1", name: "Ana", email: "ana@example.com" };
const NOW = new Date("2026-11-09T12:00:00.000Z");
const COST = 4;

let repository: { [K in keyof AuthRepository]: ReturnType<typeof vi.fn<AuthRepository[K]>> };

function service(legacyOwnerEmail?: string) {
  return createAuthService({
    repository: repository as unknown as AuthRepository,
    legacyOwnerEmail,
    bcryptCost: COST,
    now: () => NOW,
  });
}

beforeEach(() => {
  repository = {
    createUser: vi.fn<AuthRepository["createUser"]>(async () => user),
    findCredentials: vi.fn<AuthRepository["findCredentials"]>(async () => null),
    createSession: vi.fn<AuthRepository["createSession"]>(async () => {}),
    findSession: vi.fn<AuthRepository["findSession"]>(async () => null),
    extendSession: vi.fn<AuthRepository["extendSession"]>(async () => {}),
    deleteSession: vi.fn<AuthRepository["deleteSession"]>(async () => {}),
    deleteExpiredSessions: vi.fn<AuthRepository["deleteExpiredSessions"]>(async () => {}),
  };
});

const input = { name: "Ana", email: "ana@example.com", password: "correct-horse" };

describe("register (AC18.1)", () => {
  it("stores only a bcrypt hash of the password", async () => {
    await service().register(input);

    const [saved] = repository.createUser.mock.calls[0]!;
    expect(saved.passwordHash).not.toContain(input.password);
    expect(saved.passwordHash).toMatch(/^\$2[aby]\$/);
    await expect(bcrypt.compare(input.password, saved.passwordHash)).resolves.toBe(true);
  });

  it("starts a session, storing only the token's hash", async () => {
    const result = await service().register(input);
    if (result.status !== "created") throw new Error(result.status);

    const [userId, tokenHash, expiresAt] = repository.createSession.mock.calls[0]!;
    expect(userId).toBe("user-1");
    expect(tokenHash).not.toBe(result.token);
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(expiresAt.getTime()).toBe(NOW.getTime() + SESSION_TTL_MS);
  });

  it("reports an email already in use, without starting a session", async () => {
    repository.createUser.mockResolvedValue(null);

    await expect(service().register(input)).resolves.toEqual({ status: "email_taken" });
    expect(repository.createSession).not.toHaveBeenCalled();
  });

  it("hands the old projects only to the configured email", async () => {
    await service("ANA@example.com").register(input);
    await service("other@example.com").register(input);
    await service().register(input);

    expect(repository.createUser.mock.calls.map(([, claim]) => claim)).toEqual([true, false, false]);
  });
});

describe("login (AC18.2)", () => {
  async function stored(password = input.password) {
    repository.findCredentials.mockResolvedValue({
      user,
      passwordHash: await bcrypt.hash(password, COST),
    });
  }

  it("authenticates with the correct password", async () => {
    await stored();

    const result = await service().login(input);

    expect(result).toMatchObject({ status: "authenticated", user });
    expect(repository.createSession).toHaveBeenCalledTimes(1);
  });

  it("gives the same answer for a wrong password and an unknown email", async () => {
    const unknown = await service().login(input);
    await stored("something-else");
    const wrong = await service().login(input);

    expect(unknown).toEqual({ status: "invalid_credentials" });
    expect(wrong).toEqual(unknown);
    expect(repository.createSession).not.toHaveBeenCalled();
  });

  it("removes expired sessions when a new one starts", async () => {
    await stored();

    await service().login(input);

    expect(repository.deleteExpiredSessions).toHaveBeenCalledWith(NOW);
  });
});

describe("authenticate (AC18.5)", () => {
  const at = (msFromNow: number) => new Date(NOW.getTime() + msFromNow);

  it("returns null for an unknown token", async () => {
    await expect(service().authenticate("nope")).resolves.toBeNull();
  });

  it("returns the user of a valid session", async () => {
    repository.findSession.mockResolvedValue({ user, expiresAt: at(SESSION_TTL_MS) });

    await expect(service().authenticate("token")).resolves.toEqual(user);
  });

  it("looks the session up by the token's hash", async () => {
    await service().authenticate("token");

    const [tokenHash] = repository.findSession.mock.calls[0]!;
    expect(tokenHash).not.toBe("token");
  });

  it("ends a session inactive for more than 7 days", async () => {
    repository.findSession.mockResolvedValue({ user, expiresAt: at(-1) });

    await expect(service().authenticate("token")).resolves.toBeNull();
    expect(repository.deleteSession).toHaveBeenCalledTimes(1);
  });

  it("does not write when the session was extended moments ago", async () => {
    repository.findSession.mockResolvedValue({ user, expiresAt: at(SESSION_TTL_MS - 60_000) });

    await service().authenticate("token");

    expect(repository.extendSession).not.toHaveBeenCalled();
  });

  it("extends the session with activity", async () => {
    repository.findSession.mockResolvedValue({ user, expiresAt: at(SESSION_TTL_MS / 2) });

    await service().authenticate("token");

    expect(repository.extendSession).toHaveBeenCalledWith(
      expect.any(String),
      at(SESSION_TTL_MS),
    );
  });
});

describe("logout (AC18.5)", () => {
  it("removes the session", async () => {
    await service().logout("token");

    expect(repository.deleteSession).toHaveBeenCalledTimes(1);
  });
});
