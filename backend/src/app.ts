import express from "express";
import cors from "cors";
import type { LlmService } from "./llm/llmService.js";
import { errorHandler } from "./http/errorHandler.js";
import type { ProjectRepository } from "./projects/project.repository.js";
import { projectRoutes } from "./projects/project.routes.js";

export interface AppDeps {
  llm: LlmService;
  projectRepository: ProjectRepository;
}

export function createApp(deps: AppDeps) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/projects", projectRoutes(deps.projectRepository));

  app.use(errorHandler); // always last
  return app;
}
