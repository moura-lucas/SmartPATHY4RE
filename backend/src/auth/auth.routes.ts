import { Router, type CookieOptions, type RequestHandler } from "express";
import { loginSchema, SESSION_COOKIE, SESSION_TTL_MS, validateRegister, type UserDto } from "@smartpathy/shared";
import { authAttemptRateLimit, loginRateLimit } from "../http/rateLimit.js";
import type { AuthService } from "./auth.service.js";

declare module "express-serve-static-core" {
  interface Request {
    /** Set by requireAuth. */
    user?: UserDto;
  }
}

export interface AuthModule {
  requireAuth: RequestHandler;
  routes: Router;
}

const INVALID_CREDENTIALS = "Invalid email or password."; // AC18.2

export function createAuthModule(
  service: AuthService,
  options: { cookieSecure: boolean },
): AuthModule {
  // AC18.2. Lax keeps the cookie on normal navigation and off cross-site writes.
  const cookieOptions: CookieOptions = {
    httpOnly: true,
    secure: options.cookieSecure,
    sameSite: "lax",
    path: "/",
  };

  const requireAuth: RequestHandler = async (req, res, next) => {
    const token: unknown = req.cookies?.[SESSION_COOKIE];
    const user = typeof token === "string" ? await service.authenticate(token) : null;
    if (!user) {
      res.status(401).json({ error: "Authentication required." }); // AC18.3
      return;
    }
    req.user = user;
    next();
  };

  const routes = Router();
  const attempts = authAttemptRateLimit();

  // AC18.1
  routes.post("/register", attempts, async (req, res) => {
    const validation = validateRegister(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: "Invalid registration data.",
        fieldErrors: validation.fieldErrors,
      });
      return;
    }
    const result = await service.register(validation.data);
    if (result.status === "email_taken") {
      res.status(409).json({
        error: "This email is already registered.",
        fieldErrors: { email: ["This email is already registered."] },
      });
      return;
    }
    res
      .status(201)
      .cookie(SESSION_COOKIE, result.token, { ...cookieOptions, maxAge: SESSION_TTL_MS })
      .json(result.user);
  });

  // AC18.2
  routes.post("/login", attempts, loginRateLimit(), async (req, res) => {
    const input = loginSchema.safeParse(req.body);
    const result = input.success ? await service.login(input.data) : null;
    if (!result || result.status === "invalid_credentials") {
      res.status(401).json({ error: INVALID_CREDENTIALS });
      return;
    }
    res
      .cookie(SESSION_COOKIE, result.token, { ...cookieOptions, maxAge: SESSION_TTL_MS })
      .json(result.user);
  });

  // AC18.5
  routes.post("/logout", requireAuth, async (req, res) => {
    await service.logout(req.cookies[SESSION_COOKIE]);
    res.clearCookie(SESSION_COOKIE, cookieOptions).status(204).end();
  });

  routes.get("/me", requireAuth, (req, res) => {
    res.json(req.user);
  });

  return { requireAuth, routes };
}
