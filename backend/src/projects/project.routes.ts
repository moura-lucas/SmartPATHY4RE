import { Router } from "express";
import { validateCreateProject } from "@smartpathy/shared";
import type { ProjectRepository } from "./project.repository.js";

export function projectRoutes(repository: ProjectRepository) {
  const router = Router();

  // AC2.5 / AC2.6
  router.post("/", async (req, res) => {
    const validation = validateCreateProject(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: "Invalid project data.",
        fieldErrors: validation.fieldErrors,
      });
      return;
    }
    const project = await repository.create(validation.data);
    res.status(201).location(`/projects/${project.id}`).json(project);
  });

  // AC8.1 / AC8.2: the dashboard derives its indicators from this list.
  router.get("/", async (_req, res) => {
    res.json(await repository.listSummaries());
  });

  router.get("/:id", async (req, res) => {
    const project = await repository.findById(req.params.id);
    if (!project) {
      res.status(404).json({ error: "Project not found." });
      return;
    }
    res.json(project);
  });

  return router;
}
