import { Router } from "express";
import type { RequirementService } from "./requirement.service.js";

export function requirementRoutes(service: RequirementService) {
  const router = Router();

  // AC5.1 / AC5.7. LLM failures become 502 in the errorHandler (AC5.10).
  router.post("/:id/generate-requirements", async (req, res) => {
    const result = await service.generate(req.params.id);
    switch (result.status) {
      case "project_not_found":
        res.status(404).json({ error: "Project not found." });
        return;
      case "persona_missing":
        res.status(409).json({
          error: "The project does not have a persona yet. Generate the PATHY persona first.",
        });
        return;
      case "generated":
        res
          .status(201)
          .location(`/projects/${req.params.id}/requirements`)
          .json(result.requirements);
    }
  });

  router.get("/:id/requirements", async (req, res) => {
    const requirements = await service.list(req.params.id);
    if (!requirements) {
      res.status(404).json({ error: "Project not found." });
      return;
    }
    res.json(requirements);
  });

  return router;
}
