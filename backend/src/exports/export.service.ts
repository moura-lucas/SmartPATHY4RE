import {
  projectExportSchema,
  type ExportedPersona,
  type ExportSelection,
  type ProjectExport,
  type RequirementType,
} from "@smartpathy/shared";
import type { PersonaRepository } from "../personas/persona.repository.js";
import type { ProjectRepository } from "../projects/project.repository.js";
import type { RequirementRepository } from "../requirements/requirement.repository.js";

export type ExportDataResult =
  | { status: "project_not_found" }
  | { status: "persona_missing" }
  | { status: "persona_not_found" }
  | { status: "nothing_to_export" }
  | { status: "ready"; data: ProjectExport };

export interface ExportService {
  /** AC15.5: only the chosen personas and sections, with the requirements sorted by code. */
  load(projectId: string, selection: ExportSelection): Promise<ExportDataResult>;
}

export function createExportService(deps: {
  projects: ProjectRepository;
  personas: PersonaRepository;
  requirements: RequirementRepository;
  now?: () => Date;
}): ExportService {
  const now = deps.now ?? (() => new Date());

  return {
    async load(projectId, { personas: chosenIds, include }) {
      const project = await deps.projects.findById(projectId);
      if (!project) return { status: "project_not_found" };
      const all = await deps.personas.listByProjectId(project.id);
      if (all.length === 0) return { status: "persona_missing" }; // AC9.5 / AC10.5

      if (chosenIds?.some((id) => !all.some((persona) => persona.id === id))) {
        return { status: "persona_not_found" };
      }
      const chosen = chosenIds ? all.filter(({ id }) => chosenIds.includes(id)) : all;

      const personas = await Promise.all(
        chosen.map(async (persona): Promise<ExportedPersona> => {
          const requirements = await deps.requirements.findByPersonaId(persona.id);
          const ofType = (type: RequirementType) =>
            requirements.filter((req) => req.type === type);
          return {
            name: persona.name,
            ...(include.includes("profile") ? { profile: persona } : {}),
            ...(include.includes("functional")
              ? { functionalRequirements: ofType("functional") }
              : {}),
            ...(include.includes("non_functional")
              ? { nonFunctionalRequirements: ofType("non_functional") }
              : {}),
          };
        }),
      );

      const items = personas.reduce(
        (total, persona) =>
          total +
          (persona.profile ? 1 : 0) +
          (persona.functionalRequirements?.length ?? 0) +
          (persona.nonFunctionalRequirements?.length ?? 0),
        0,
      );
      if (items === 0) return { status: "nothing_to_export" }; // AC15.4

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
        personas,
      });
      return { status: "ready", data };
    },
  };
}
