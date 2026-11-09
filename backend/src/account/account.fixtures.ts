import { Router } from "express";
import type { AccountModule } from "./account.routes.js";

/** For tests of other routes: every generation goes through with the shared key. */
export const testAccount: AccountModule = {
  routes: Router(),
  generationAccess: (_req, _res, next) => next(),
};
