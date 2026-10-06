import express from "express";
import cors from "cors";
import type { LlmService } from "./llm/llmService.js";
import { errorHandler } from "./http/errorHandler.js";

export interface AppDeps {
  llm: LlmService;
}

export function createApp(deps: AppDeps) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // In the next steps: app.use("/projects", projectsRouter(deps.llm));

  app.use(errorHandler); // always last
  return app;
}
