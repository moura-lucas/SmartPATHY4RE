import { Router } from "express";
import { validatePersonaSections } from "@smartpathy/shared";
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

  // AC4.1 / AC4.6: separate 404 messages so the client can tell the two cases apart.
  router.get("/:id/persona", async (req, res) => {
    const result = await service.find(req.params.id);
    if (!result) {
      res.status(404).json({ error: "Project not found." });
      return;
    }
    if (!result.persona) {
      res.status(404).json({ error: "Persona not found." });
      return;
    }
    res.json(result.persona);
  });

  // AC7.2 / AC7.3: the shared schema is the same one the frontend checks before saving.
  router.put("/:id/persona", async (req, res) => {
    const validation = validatePersonaSections(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: "Invalid persona data.",
        fieldErrors: validation.fieldErrors,
      });
      return;
    }
    const result = await service.updateSections(req.params.id, validation.data);
    switch (result.status) {
      case "project_not_found":
        res.status(404).json({ error: "Project not found." });
        return;
      case "persona_missing":
        res.status(404).json({ error: "Persona not found." });
        return;
      case "updated":
        res.json(result.persona);
    }
  });

  return router;
}
