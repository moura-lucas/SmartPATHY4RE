import { Router } from "express";
import { validateCreateProject, validateUpdateProject } from "@smartpathy/shared";
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
    const project = await repository.create(validation.data, req.user!.id);
    res.status(201).location(`/projects/${project.id}`).json(project);
  });

  // AC8.1 / AC8.2: the dashboard derives its indicators from this list.
  router.get("/", async (req, res) => {
    res.json(await repository.listSummaries(req.user!.id));
  });

  router.get("/:id", async (req, res) => {
    const project = await repository.findById(req.params.id);
    if (!project) {
      res.status(404).json({ error: "Project not found." });
      return;
    }
    res.json(project);
  });

  // AC17.1
  router.patch("/:id", async (req, res) => {
    const validation = validateUpdateProject(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: "Invalid project data.",
        fieldErrors: validation.fieldErrors,
      });
      return;
    }
    const project = await repository.update(req.params.id, validation.data);
    if (!project) {
      res.status(404).json({ error: "Project not found." });
      return;
    }
    res.json(project);
  });

  // AC17.4 / AC17.5
  router.delete("/:id", async (req, res) => {
    if (!(await repository.remove(req.params.id))) {
      res.status(404).json({ error: "Project not found." });
      return;
    }
    res.status(204).end();
  });

  return router;
}
