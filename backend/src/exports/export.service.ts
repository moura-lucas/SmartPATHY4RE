import {
  personaSchema,
  projectExportSchema,
  requirementSchema,
  type ProjectExport,
} from "@smartpathy/shared";
import type { PersonaRepository } from "../personas/persona.repository.js";
import type { ProjectRepository } from "../projects/project.repository.js";
import type { RequirementRepository } from "../requirements/requirement.repository.js";

export type ExportDataResult =
  | { status: "project_not_found" }
  | { status: "persona_missing" }
  | { status: "ready"; data: ProjectExport };

export interface ExportService {
  /** What both formats export: project, persona, requirements sorted by code and the date. */
  load(projectId: string): Promise<ExportDataResult>;
}

export function createExportService(deps: {
  projects: ProjectRepository;
  personas: PersonaRepository;
  requirements: RequirementRepository;
  now?: () => Date;
}): ExportService {
  const now = deps.now ?? (() => new Date());

  return {
    async load(projectId) {
      const project = await deps.projects.findById(projectId);
      if (!project) return { status: "project_not_found" };
      const persona = await deps.personas.findByProjectId(project.id);
      if (!persona) return { status: "persona_missing" }; // AC9.5 / AC10.5
      const requirements = await deps.requirements.findByProjectId(project.id);

      // Parsing with the shared schemas drops internal fields (ids, timestamps) and
      // guarantees the file validates against them (AC9.3).
      const data = projectExportSchema.parse({
        exportedAt: now().toISOString(),
        project: {
          name: project.name,
          domain: project.domain,
          description: project.description,
          additionalContext: project.additionalContext,
        },
        persona: personaSchema.parse(persona),
        requirements: requirements.map((req) => requirementSchema.parse(req)),
      });
      return { status: "ready", data };
    },
  };
}
