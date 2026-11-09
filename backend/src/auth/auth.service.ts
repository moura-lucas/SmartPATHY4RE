import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import {
  SESSION_TTL_MS,
  type LoginInput,
  type RegisterInput,
  type UserDto,
} from "@smartpathy/shared";
import type { AuthRepository } from "./auth.repository.js";

export type RegisterResult =
  | { status: "email_taken" }
  | { status: "created"; user: UserDto; token: string };

export type LoginResult =
  | { status: "invalid_credentials" }
  | { status: "authenticated"; user: UserDto; token: string };

export interface AuthService {
  register(input: RegisterInput): Promise<RegisterResult>;
  login(input: LoginInput): Promise<LoginResult>;
  /** The session's user, or null when it does not exist or expired. */
  authenticate(token: string): Promise<UserDto | null>;
  logout(token: string): Promise<void>;
}

// Avoids a write on every request: a session this recent has no need of extending.
const EXTEND_AFTER_MS = 60 * 60 * 1000;

/** Only the hash is stored, so a leaked database does not expose valid sessions. */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createAuthService(deps: {
  repository: AuthRepository;
  legacyOwnerEmail?: string | undefined;
  /** bcrypt work factor; tests use a low one to stay fast. */
  bcryptCost?: number;
  now?: () => Date;
}): AuthService {
  const { repository } = deps;
  const cost = deps.bcryptCost ?? 12;
  const now = deps.now ?? (() => new Date());
  const legacyOwnerEmail = deps.legacyOwnerEmail?.trim().toLowerCase();
  // AC18.2: comparing against this when the email is unknown keeps the response time equal.
  const decoyHash = bcrypt.hash("decoy-password", cost);

  async function startSession(userId: string): Promise<string> {
    const token = randomBytes(32).toString("base64url");
    const current = now();
    await repository.deleteExpiredSessions(current);
    await repository.createSession(
      userId,
      hashToken(token),
      new Date(current.getTime() + SESSION_TTL_MS),
    );
    return token;
  }

  return {
    async register({ name, email, password }) {
      const passwordHash = await bcrypt.hash(password, cost); // AC18.1
      const user = await repository.createUser(
        { name, email, passwordHash },
        email === legacyOwnerEmail,
      );
      if (!user) return { status: "email_taken" };
      return { status: "created", user, token: await startSession(user.id) };
    },

    async login({ email, password }) {
      const found = await repository.findCredentials(email);
      const matches = await bcrypt.compare(password, found?.passwordHash ?? (await decoyHash));
      if (!found || !matches) return { status: "invalid_credentials" };
      return { status: "authenticated", user: found.user, token: await startSession(found.user.id) };
    },

    async authenticate(token) {
      const tokenHash = hashToken(token);
      const session = await repository.findSession(tokenHash);
      if (!session) return null;

      const current = now().getTime();
      const remaining = session.expiresAt.getTime() - current;
      if (remaining <= 0) {
        await repository.deleteSession(tokenHash); // AC18.5
        return null;
      }
      if (SESSION_TTL_MS - remaining > EXTEND_AFTER_MS) {
        await repository.extendSession(tokenHash, new Date(current + SESSION_TTL_MS));
      }
      return session.user;
    },

    async logout(token) {
      await repository.deleteSession(hashToken(token));
    },
  };
}
