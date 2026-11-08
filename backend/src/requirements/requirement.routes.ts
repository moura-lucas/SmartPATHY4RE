import { Router, type RequestHandler } from "express";
import type { RequirementService } from "./requirement.service.js";

export function requirementRoutes(
  service: RequirementService,
  generationLimit: RequestHandler<{ id: string; personaId: string }>,
) {
  const router = Router();

  // AC5.1 / AC5.7 / AC12.4. LLM failures become 502 in the errorHandler (AC5.10).
  router.post(
    "/:id/personas/:personaId/generate-requirements",
    generationLimit,
    async (req, res) => {
      const { id, personaId } = req.params;
      const result = await service.generate(id, personaId);
      switch (result.status) {
        case "project_not_found":
          res.status(404).json({ error: "Project not found." });
          return;
        case "no_personas":
          res.status(409).json({
            error: "The project does not have a persona yet. Generate the PATHY persona first.",
          });
          return;
        case "persona_not_found":
          res.status(404).json({ error: "Persona not found." });
          return;
        case "generated":
          res
            .status(201)
            .location(`/projects/${id}/requirements?persona=${personaId}`)
            .json(result.requirements);
      }
    },
  );

  // AC13.1. LLM failures become 502 in the errorHandler (AC13.4).
  router.post(
    "/:id/personas/:personaId/generate-more-requirements",
    generationLimit,
    async (req, res) => {
      const { id, personaId } = req.params;
      const result = await service.generateMore(id, personaId);
      switch (result.status) {
        case "project_not_found":
          res.status(404).json({ error: "Project not found." });
          return;
        case "persona_not_found":
          res.status(404).json({ error: "Persona not found." });
          return;
        case "no_requirements":
          res.status(409).json({ error: "Generate the persona's requirements first." });
          return;
        case "limit_reached":
          res.status(409).json({ error: "This persona has reached the requirements limit." });
          return;
        case "generated":
          res
            .status(201)
            .location(`/projects/${id}/requirements?persona=${personaId}`)
            .json(result.requirements);
      }
    },
  );

  router.get("/:id/personas/:personaId/requirements", async (req, res) => {
    const result = await service.list(req.params.id, req.params.personaId);
    switch (result.status) {
      case "project_not_found":
        res.status(404).json({ error: "Project not found." });
        return;
      case "persona_not_found":
        res.status(404).json({ error: "Persona not found." });
        return;
      case "found":
        res.json(result.requirements);
    }
  });

  return router;
}
