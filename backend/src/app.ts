import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import type { AuthModule } from "./auth/auth.routes.js";
import type { LlmService } from "./llm/llmService.js";
import { exportRoutes } from "./exports/export.routes.js";
import { createExportService } from "./exports/export.service.js";
import { errorHandler } from "./http/errorHandler.js";
import { generationRateLimit } from "./http/rateLimit.js";
import type { PersonaRepository } from "./personas/persona.repository.js";
import { personaRoutes } from "./personas/persona.routes.js";
import { createPersonaService } from "./personas/persona.service.js";
import type { ProjectRepository } from "./projects/project.repository.js";
import { projectRoutes } from "./projects/project.routes.js";
import type { RequirementRepository } from "./requirements/requirement.repository.js";
import { requirementItemRoutes, requirementRoutes } from "./requirements/requirement.routes.js";
import { createRequirementService } from "./requirements/requirement.service.js";

export interface AppDeps {
  auth: AuthModule;
  /** The origin allowed to call the API with credentials. */
  corsOrigin?: string;
  llm: LlmService;
  projectRepository: ProjectRepository;
  personaRepository: PersonaRepository;
  requirementRepository: RequirementRepository;
}

export function createApp(deps: AppDeps) {
  const app = express();
  app.set("trust proxy", 1); // Caddy: the rate limit must see the visitor's IP
  // One limiter for both generation routes: they spend the same quota.
  const generationLimit = generationRateLimit();
  app.use(cors({ origin: deps.corsOrigin ?? "http://localhost:3000", credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/auth", deps.auth.routes);

  // AC18.3: everything below requires a session.
  app.use(deps.auth.requireAuth);

  // AC18.4: 404 rather than 403, so as not to reveal that it exists. Every route under
  // these paths goes through here, so the services can trust the ids they receive.
  app.use("/projects/:id", async (req, res, next) => {
    if (await deps.projectRepository.isOwnedBy(req.params.id, req.user!.id)) {
      next();
      return;
    }
    res.status(404).json({ error: "Project not found." });
  });
  app.use("/requirements/:id", async (req, res, next) => {
    if (await deps.requirementRepository.isOwnedBy(req.params.id, req.user!.id)) {
      next();
      return;
    }
    res.status(404).json({ error: "Requirement not found." });
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
      generationLimit,
    ),
  );
  const requirementService = createRequirementService({
    llm: deps.llm,
    projects: deps.projectRepository,
    personas: deps.personaRepository,
    requirements: deps.requirementRepository,
  });
  app.use("/projects", requirementRoutes(requirementService, generationLimit));
  app.use("/requirements", requirementItemRoutes(requirementService));

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
