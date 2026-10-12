import { Router } from "express";
import type { PersonaService } from "./persona.service.js";

export function personaRoutes(service: PersonaService) {
  const router = Router();

  // AC3.1 / AC3.6. LLM failures become 502 in the errorHandler (AC3.8).
  router.post("/:id/generate-persona", async (req, res) => {
    const persona = await service.generate(req.params.id);
    if (!persona) {
      res.status(404).json({ error: "Project not found." });
      return;
    }
    res
      .status(201)
      .location(`/projects/${persona.projectId}/persona`)
      .json(persona);
  });

  return router;
}
