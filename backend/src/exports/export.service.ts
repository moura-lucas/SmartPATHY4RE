import {
  exportedRequirementSchema,
  personaSchema,
  projectExportSchema,
  type ProjectExport,
} from "@smartpathy/shared";
import type { PersonaRepository } from "../personas/persona.repository.js";
import type { ProjectRepository } from "../projects/project.repository.js";
import type { RequirementRepository } from "../requirements/requirement.repository.js";

export type ExportDataResult =
  | { status: "project_not_found" }
  | { status: "persona_missing" }
  | { status: "persona_not_found" }
  | { status: "ready"; data: ProjectExport };

export interface ExportService {
  /**
   * What both formats export: project, one persona, its requirements sorted by code
   * and the date. Without `personaId`, the project's first persona.
   */
  load(projectId: string, personaId?: string): Promise<ExportDataResult>;
}

export function createExportService(deps: {
  projects: ProjectRepository;
  personas: PersonaRepository;
  requirements: RequirementRepository;
  now?: () => Date;
}): ExportService {
  const now = deps.now ?? (() => new Date());

  return {
    async load(projectId, personaId) {
      const project = await deps.projects.findById(projectId);
      if (!project) return { status: "project_not_found" };
      const personas = await deps.personas.listByProjectId(project.id);
      if (personas.length === 0) return { status: "persona_missing" }; // AC9.5 / AC10.5
      const persona = personaId ? personas.find(({ id }) => id === personaId) : personas[0];
      if (!persona) return { status: "persona_not_found" };
      const requirements = await deps.requirements.findByPersonaId(persona.id);

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
        requirements: requirements.map((req) => exportedRequirementSchema.parse(req)),
      });
      return { status: "ready", data };
    },
  };
}
