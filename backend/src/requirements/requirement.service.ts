import {
  additionalRequirementsSchema,
  canGenerateMoreRequirements,
  generatedRequirementsSchema,
  type PersonaDto,
  type RequirementDto,
  type RequirementEdit,
} from "@smartpathy/shared";
import type { LlmService } from "../llm/llmService.js";
import type { PersonaRepository } from "../personas/persona.repository.js";
import type { ProjectRepository } from "../projects/project.repository.js";
import { buildAdditionalRequirementsPrompt, buildRequirementsPrompt } from "./requirement.prompt.js";
import type { RequirementRepository } from "./requirement.repository.js";

export type GenerateRequirementsResult =
  | { status: "project_not_found" }
  | { status: "no_personas" }
  | { status: "persona_not_found" }
  | { status: "generated"; requirements: RequirementDto[] };

export type GenerateMoreRequirementsResult =
  | { status: "project_not_found" }
  | { status: "persona_not_found" }
  | { status: "no_requirements" }
  | { status: "limit_reached" }
  | { status: "generated"; requirements: RequirementDto[] };

export type ListRequirementsResult =
  | { status: "project_not_found" }
  | { status: "persona_not_found" }
  | { status: "found"; requirements: RequirementDto[] };

export interface RequirementService {
  generate(projectId: string, personaId: string): Promise<GenerateRequirementsResult>;
  /** AC13.1: adds requirements to the ones the persona already has. */
  generateMore(projectId: string, personaId: string): Promise<GenerateMoreRequirementsResult>;
  /** AC14.1: null when it does not exist. Saving without changes does not mark it as edited. */
  edit(id: string, edit: RequirementEdit): Promise<RequirementDto | null>;
  /** AC14.3: false when it does not exist. */
  remove(id: string): Promise<boolean>;
  /** AC12.4: the requirements of one persona. */
  list(projectId: string, personaId: string): Promise<ListRequirementsResult>;
}

function isSameContent(current: RequirementDto, edit: RequirementEdit): boolean {
  return (
    current.description === edit.description &&
    current.moscow === edit.moscow &&
    current.priority === edit.priority &&
    [...current.derivedFrom].sort().join() === [...edit.derivedFrom].sort().join()
  );
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

    async generateMore(projectId, personaId) {
      const project = await deps.projects.findById(projectId);
      if (!project) return { status: "project_not_found" };
      const persona = await deps.personas.findById(project.id, personaId);
      if (!persona) return { status: "persona_not_found" };

      // The LLM is only called when the result can actually be saved.
      const existing = await deps.requirements.findByPersonaId(persona.id);
      if (existing.length === 0) return { status: "no_requirements" };
      if (!canGenerateMoreRequirements(existing.length)) return { status: "limit_reached" };

      // AC13.4: an invalid response counts as a failure and nothing is saved.
      const { system, prompt } = buildAdditionalRequirementsPrompt(project, persona, existing);
      const { requirements } = await deps.llm.generateJson(
        additionalRequirementsSchema,
        system,
        prompt,
      );

      const result = await deps.requirements.append(persona, requirements);
      return result.status === "appended"
        ? { status: "generated", requirements: result.requirements }
        : result;
    },

    async edit(id, edit) {
      const current = await deps.requirements.findById(id);
      if (!current) return null;
      return isSameContent(current, edit) ? current : deps.requirements.applyEdit(id, edit);
    },

    remove(id) {
      return deps.requirements.deleteById(id);
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
