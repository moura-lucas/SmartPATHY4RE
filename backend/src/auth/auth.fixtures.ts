import { Router, type RequestHandler } from "express";
import type { UserDto } from "@smartpathy/shared";
import type { AuthModule } from "./auth.routes.js";

export const TEST_USER: UserDto = { id: "user-1", name: "Ana", email: "ana@example.com" };

const signedIn: RequestHandler = (req, _res, next) => {
  req.user = TEST_USER;
  next();
};

/** For tests of the protected routes: every request is signed in as TEST_USER. */
export const testAuth: AuthModule = { requireAuth: signedIn, routes: Router() };
