import { Router, type RequestHandler, type Response } from "express";
import { validateNewPersona, validatePersonaSections } from "@smartpathy/shared";
import type { PersonaService } from "./persona.service.js";

function projectNotFound(res: Response) {
  res.status(404).json({ error: "Project not found." });
}

function personaNotFound(res: Response) {
  res.status(404).json({ error: "Persona not found." });
}

export function personaRoutes(
  service: PersonaService,
  generationLimit: RequestHandler<{ id: string }>,
) {
  const router = Router();

  // AC3.1 / AC3.6. LLM failures become 502 in the errorHandler (AC3.8).
  router.post("/:id/generate-persona", generationLimit, async (req, res) => {
    const result = await service.generateFirst(req.params.id);
    switch (result.status) {
      case "project_not_found":
        projectNotFound(res);
        return;
      case "already_has_persona":
        res.status(409).json({
          error: "The project already has a persona. Generate a new one from the persona screen.",
        });
        return;
      case "generated":
        res
          .status(201)
          .location(`/projects/${req.params.id}/persona?persona=${result.persona.id}`)
          .json(result.persona);
    }
  });

  // AC4.1 / AC12.3: an empty list means the project has no persona yet.
  router.get("/:id/personas", async (req, res) => {
    const personas = await service.list(req.params.id);
    if (!personas) {
      projectNotFound(res);
      return;
    }
    res.json(personas);
  });

  // AC12.1 / AC12.2
  router.post("/:id/personas", generationLimit, async (req, res) => {
    const validation = validateNewPersona(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: "Invalid persona data.",
        fieldErrors: validation.fieldErrors,
      });
      return;
    }
    const result = await service.add(req.params.id, validation.data);
    switch (result.status) {
      case "project_not_found":
        projectNotFound(res);
        return;
      case "no_personas":
        res.status(409).json({
          error: "The project does not have a persona yet. Generate the PATHY persona first.",
        });
        return;
      case "generated":
        res
          .status(201)
          .location(`/projects/${req.params.id}/persona?persona=${result.persona.id}`)
          .json(result.persona);
    }
  });

  // AC7.2 / AC7.3: the shared schema is the same one the frontend checks before saving.
  router.put("/:id/personas/:personaId", async (req, res) => {
    const validation = validatePersonaSections(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: "Invalid persona data.",
        fieldErrors: validation.fieldErrors,
      });
      return;
    }
    const result = await service.updateSections(
      req.params.id,
      req.params.personaId,
      validation.data,
    );
    switch (result.status) {
      case "project_not_found":
        projectNotFound(res);
        return;
      case "persona_not_found":
        personaNotFound(res);
        return;
      case "updated":
        res.json(result.persona);
    }
  });

  // AC12.5
  router.delete("/:id/personas/:personaId", async (req, res) => {
    const result = await service.remove(req.params.id, req.params.personaId);
    switch (result.status) {
      case "project_not_found":
        projectNotFound(res);
        return;
      case "persona_not_found":
        personaNotFound(res);
        return;
      case "last_persona":
        res.status(409).json({ error: "A project must keep at least one persona." });
        return;
      case "deleted":
        res.status(204).end();
    }
  });

  return router;
}
