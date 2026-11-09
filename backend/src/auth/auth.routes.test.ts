import { SESSION_COOKIE } from "@smartpathy/shared";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";
import { LlmService } from "../llm/llmService.js";
import type { PersonaRepository } from "../personas/persona.repository.js";
import type { ProjectRepository } from "../projects/project.repository.js";
import type { RequirementRepository } from "../requirements/requirement.repository.js";
import type { AuthRepository } from "./auth.repository.js";
import { createAuthModule } from "./auth.routes.js";
import { createAuthService } from "./auth.service.js";

interface Stored {
  user: { id: string; name: string; email: string };
  passwordHash: string;
}

/** Real auth stack over an in-memory store, so cookies and sessions are exercised for real. */
function buildApp(options = { cookieSecure: true }) {
  const users = new Map<string, Stored>();
  const sessions = new Map<string, { userId: string; expiresAt: Date }>();
  const repository: AuthRepository = {
    createUser: async ({ name, email, passwordHash }) => {
      if (users.has(email)) return null;
      const user = { id: `user-${users.size + 1}`, name, email };
      users.set(email, { user, passwordHash });
      return user;
    },
    findCredentials: async (email) => users.get(email) ?? null,
    createSession: async (userId, tokenHash, expiresAt) => {
      sessions.set(tokenHash, { userId, expiresAt });
    },
    findSession: async (tokenHash) => {
      const session = sessions.get(tokenHash);
      if (!session) return null;
      const owner = [...users.values()].find(({ user }) => user.id === session.userId)!;
      return { user: owner.user, expiresAt: session.expiresAt };
    },
    extendSession: async () => {},
    deleteSession: async (tokenHash) => {
      sessions.delete(tokenHash);
    },
    deleteExpiredSessions: async () => {},
  };
  const projectRepository: ProjectRepository = {
    create: vi.fn(),
    findById: vi.fn(async () => null),
    update: vi.fn(),
    remove: vi.fn(),
    isOwnedBy: vi.fn(async () => true),
    listSummaries: vi.fn(async () => []),
  };
  const app = createApp({
    auth: createAuthModule(createAuthService({ repository, bcryptCost: 4 }), options),
    llm: new LlmService({ complete: async () => "{}" }),
    projectRepository,
    personaRepository: {} as PersonaRepository,
    requirementRepository: { isOwnedBy: vi.fn(async () => true) } as unknown as RequirementRepository,
  });
  return { app, users, sessions, projectRepository };
}

const account = { name: "Ana", email: "Ana@Example.com", password: "correct-horse" };

function cookieOf(res: request.Response): string {
  const header = res.headers["set-cookie"] as unknown as string[];
  return header[0]!;
}

let ctx: ReturnType<typeof buildApp>;

beforeEach(() => {
  ctx = buildApp();
});

const register = (body: object = account) => request(ctx.app).post("/auth/register").send(body);
const login = (body: object) => request(ctx.app).post("/auth/login").send(body);

describe("POST /auth/register (AC18.1)", () => {
  it("creates the account and signs in", async () => {
    const res = await register();

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: "user-1", name: "Ana", email: "ana@example.com" });
    expect(cookieOf(res)).toContain(`${SESSION_COOKIE}=`);
  });

  it("never returns or stores the password in plain text", async () => {
    const res = await register();

    expect(JSON.stringify(res.body)).not.toMatch(/correct-horse|passwordHash/);
    expect(ctx.users.get("ana@example.com")!.passwordHash).not.toContain("correct-horse");
  });

  it("responds 409 for an email already registered, whatever the case", async () => {
    await register();

    const res = await register({ ...account, email: "ANA@example.com" });

    expect(res.status).toBe(409);
    expect(res.body.fieldErrors.email).toEqual(["This email is already registered."]);
  });

  it("responds 400 with the field errors for invalid data", async () => {
    const res = await register({ name: "", email: "nope", password: "short" });

    expect(res.status).toBe(400);
    expect(Object.keys(res.body.fieldErrors).sort()).toEqual(["email", "name", "password"]);
    expect(ctx.users.size).toBe(0);
  });
});

describe("POST /auth/login (AC18.2)", () => {
  beforeEach(async () => {
    await register();
  });

  it("signs in with a cookie that is httpOnly, secure and sameSite", async () => {
    const res = await login({ email: "ana@example.com", password: "correct-horse" });

    expect(res.status).toBe(200);
    expect(res.body.email).toBe("ana@example.com");
    const cookie = cookieOf(res);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Secure/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toMatch(/Max-Age=604800/i);
  });

  it("can drop the secure flag for local development", async () => {
    ctx = buildApp({ cookieSecure: false });

    expect(cookieOf(await register())).not.toMatch(/Secure/i);
  });

  it.each([
    ["a wrong password", { email: "ana@example.com", password: "wrong-password" }],
    ["an unknown email", { email: "nobody@example.com", password: "correct-horse" }],
    ["a malformed body", { email: 1 }],
  ])("gives the same generic answer for %s", async (_name, body) => {
    const res = await login(body);

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Invalid email or password." });
    expect(res.headers["set-cookie"]).toBeUndefined();
  });

  it("limits repeated attempts against an account", async () => {
    const wrong = { email: "ana@example.com", password: "wrong-password" };
    for (let i = 0; i < 10; i++) await login(wrong);

    const res = await login(wrong);

    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/Too many attempts/);
  });
});

describe("protected routes (AC18.3)", () => {
  it.each([
    ["get", "/projects"],
    ["post", "/projects"],
    ["get", "/projects/any"],
    ["patch", "/projects/any"],
    ["delete", "/projects/any"],
    ["get", "/projects/any/personas"],
    ["post", "/projects/any/generate-persona"],
    ["get", "/projects/any/export?format=json"],
    ["patch", "/requirements/any"],
    ["delete", "/requirements/any"],
    ["get", "/does-not-exist"],
    ["get", "/auth/me"],
    ["post", "/auth/logout"],
  ] as const)("%s %s responds 401 without a session", async (method, url) => {
    const res = await request(ctx.app)[method](url);

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Authentication required." });
    expect(ctx.projectRepository.isOwnedBy).not.toHaveBeenCalled();
  });

  it("rejects a made-up session", async () => {
    const res = await request(ctx.app).get("/projects").set("Cookie", `${SESSION_COOKIE}=forged`);

    expect(res.status).toBe(401);
  });

  it("keeps the health check public", async () => {
    expect((await request(ctx.app).get("/health")).status).toBe(200);
  });

  it("gives access with a valid session, scoped to the user", async () => {
    const cookie = cookieOf(await register());

    const res = await request(ctx.app).get("/projects").set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(ctx.projectRepository.listSummaries).toHaveBeenCalledWith("user-1");
  });

  it("returns the signed-in user", async () => {
    const cookie = cookieOf(await register());

    const res = await request(ctx.app).get("/auth/me").set("Cookie", cookie);

    expect(res.body).toEqual({ id: "user-1", name: "Ana", email: "ana@example.com" });
  });
});

describe("POST /auth/logout (AC18.5)", () => {
  it("ends the session, so the same cookie no longer works", async () => {
    const cookie = cookieOf(await register());

    const res = await request(ctx.app).post("/auth/logout").set("Cookie", cookie);

    expect(res.status).toBe(204);
    expect(cookieOf(res)).toMatch(new RegExp(`${SESSION_COOKIE}=;`));
    expect(ctx.sessions.size).toBe(0);
    expect((await request(ctx.app).get("/projects").set("Cookie", cookie)).status).toBe(401);
  });
});

describe("CORS", () => {
  it("allows credentials only from the frontend origin", async () => {
    const res = await request(ctx.app).get("/health").set("Origin", "http://localhost:3000");

    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("does not echo another origin", async () => {
    const res = await request(ctx.app).get("/health").set("Origin", "https://evil.example");

    expect(res.headers["access-control-allow-origin"]).not.toBe("https://evil.example");
  });
});
