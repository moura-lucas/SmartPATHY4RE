import {
  generatedRequirementsSchema,
  type RequirementDto,
} from "@smartpathy/shared";
import type { LlmService } from "../llm/llmService.js";
import type { PersonaRepository } from "../personas/persona.repository.js";
import type { ProjectRepository } from "../projects/project.repository.js";
import { buildRequirementsPrompt } from "./requirement.prompt.js";
import type { RequirementRepository } from "./requirement.repository.js";

export type GenerateRequirementsResult =
  | { status: "project_not_found" }
  | { status: "persona_missing" }
  | { status: "generated"; requirements: RequirementDto[] };

export interface RequirementService {
  generate(projectId: string): Promise<GenerateRequirementsResult>;
  /** Returns null when the project does not exist. */
  list(projectId: string): Promise<RequirementDto[] | null>;
}

export function createRequirementService(deps: {
  llm: LlmService;
  projects: ProjectRepository;
  personas: PersonaRepository;
  requirements: RequirementRepository;
}): RequirementService {
  return {
    async generate(projectId) {
      const project = await deps.projects.findById(projectId);
      if (!project) return { status: "project_not_found" };

      // AC5.2: the persona saved at this moment, including user edits (US7).
      const persona = await deps.personas.findByProjectId(project.id);
      if (!persona) return { status: "persona_missing" }; // AC5.1: the LLM is not called

      // AC5.3–AC5.6: an invalid response counts as a failure and is retried by the LlmService.
      const { system, prompt } = buildRequirementsPrompt(project, persona);
      const { requirements } = await deps.llm.generateJson(
        generatedRequirementsSchema,
        system,
        prompt,
      );

      // AC5.7 / AC5.8: saved only after a valid response, replacing the old ones.
      return {
        status: "generated",
        requirements: await deps.requirements.replaceAll(project.id, requirements),
      };
    },

    async list(projectId) {
      const project = await deps.projects.findById(projectId);
      if (!project) return null;
      return deps.requirements.findByProjectId(project.id);
    },
  };
}
