import {
  generatedRequirementsSchema,
  type PersonaDto,
  type RequirementDto,
} from "@smartpathy/shared";
import type { LlmService } from "../llm/llmService.js";
import type { PersonaRepository } from "../personas/persona.repository.js";
import type { ProjectRepository } from "../projects/project.repository.js";
import { buildRequirementsPrompt } from "./requirement.prompt.js";
import type { RequirementRepository } from "./requirement.repository.js";

export type GenerateRequirementsResult =
  | { status: "project_not_found" }
  | { status: "no_personas" }
  | { status: "persona_not_found" }
  | { status: "generated"; requirements: RequirementDto[] };

export type ListRequirementsResult =
  | { status: "project_not_found" }
  | { status: "persona_not_found" }
  | { status: "found"; requirements: RequirementDto[] };

export interface RequirementService {
  generate(projectId: string, personaId: string): Promise<GenerateRequirementsResult>;
  /** AC12.4: the requirements of one persona. */
  list(projectId: string, personaId: string): Promise<ListRequirementsResult>;
}

export function createRequirementService(deps: {
  llm: LlmService;
  projects: ProjectRepository;
  personas: PersonaRepository;
  requirements: RequirementRepository;
}): RequirementService {
  return {
    async generate(projectId, personaId) {
      const project = await deps.projects.findById(projectId);
      if (!project) return { status: "project_not_found" };

      // AC5.2 / AC12.4: the selected persona as saved at this moment, including user edits (US7).
      const personas = await deps.personas.listByProjectId(project.id);
      if (personas.length === 0) return { status: "no_personas" }; // AC5.1: the LLM is not called
      const persona: PersonaDto | undefined = personas.find(({ id }) => id === personaId);
      if (!persona) return { status: "persona_not_found" };

      // AC5.3–AC5.6: an invalid response counts as a failure and is retried by the LlmService.
      const { system, prompt } = buildRequirementsPrompt(project, persona);
      const { requirements } = await deps.llm.generateJson(
        generatedRequirementsSchema,
        system,
        prompt,
      );

      // AC5.7 / AC5.8: saved only after a valid response, replacing only this persona's.
      return {
        status: "generated",
        requirements: await deps.requirements.replaceAll(persona, requirements),
      };
    },

    async list(projectId, personaId) {
      const project = await deps.projects.findById(projectId);
      if (!project) return { status: "project_not_found" };
      if (!(await deps.personas.findById(project.id, personaId))) {
        return { status: "persona_not_found" };
      }
      return {
        status: "found",
        requirements: await deps.requirements.findByPersonaId(personaId),
      };
    },
  };
}
