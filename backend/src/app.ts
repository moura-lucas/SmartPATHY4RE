import express from "express";
import cors from "cors";
import type { LlmService } from "./llm/llmService.js";
import { exportRoutes } from "./exports/export.routes.js";
import { createExportService } from "./exports/export.service.js";
import { errorHandler } from "./http/errorHandler.js";
import type { PersonaRepository } from "./personas/persona.repository.js";
import { personaRoutes } from "./personas/persona.routes.js";
import { createPersonaService } from "./personas/persona.service.js";
import type { ProjectRepository } from "./projects/project.repository.js";
import { projectRoutes } from "./projects/project.routes.js";
import type { RequirementRepository } from "./requirements/requirement.repository.js";
import { requirementRoutes } from "./requirements/requirement.routes.js";
import { createRequirementService } from "./requirements/requirement.service.js";

export interface AppDeps {
  llm: LlmService;
  projectRepository: ProjectRepository;
  personaRepository: PersonaRepository;
  requirementRepository: RequirementRepository;
}

export function createApp(deps: AppDeps) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/projects", projectRoutes(deps.projectRepository));
  app.use(
    "/projects",
    personaRoutes(
      createPersonaService({
        llm: deps.llm,
        projects: deps.projectRepository,
        personas: deps.personaRepository,
      }),
    ),
  );
  app.use(
    "/projects",
    requirementRoutes(
      createRequirementService({
        llm: deps.llm,
        projects: deps.projectRepository,
        personas: deps.personaRepository,
        requirements: deps.requirementRepository,
      }),
    ),
  );

  app.use(
    "/projects",
    exportRoutes(
      createExportService({
        projects: deps.projectRepository,
        personas: deps.personaRepository,
        requirements: deps.requirementRepository,
      }),
    ),
  );

  app.use(errorHandler); // always last
  return app;
}
