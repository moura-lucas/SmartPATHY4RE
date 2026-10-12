import { personaSchema, type PersonaDto } from "@smartpathy/shared";
import type { LlmService } from "../llm/llmService.js";
import type { ProjectRepository } from "../projects/project.repository.js";
import { buildPersonaPrompt } from "./persona.prompt.js";
import type { PersonaRepository } from "./persona.repository.js";

// The level always comes from the project: the LLM does not need to return it.
const generatedPersonaSchema = personaSchema.omit({ techExperienceLevel: true });

export interface PersonaService {
  /** Returns null when the project does not exist. */
  generate(projectId: string): Promise<PersonaDto | null>;
}

export function createPersonaService(deps: {
  llm: LlmService;
  projects: ProjectRepository;
  personas: PersonaRepository;
}): PersonaService {
  return {
    async generate(projectId) {
      const project = await deps.projects.findById(projectId);
      if (!project) return null;

      // AC3.1 / AC3.2: the LlmService validates the response and retries.
      const { system, prompt } = buildPersonaPrompt(project);
      const generated = await deps.llm.generateJson(
        generatedPersonaSchema,
        system,
        prompt,
      );

      // AC3.3 / AC3.4: user input wins, the LLM only fills the gaps.
      // Saved only after a valid response, so a failure changes nothing (AC3.8).
      return deps.personas.upsert(project.id, {
        ...generated,
        name: project.personaName ?? generated.name,
        age: project.personaAge ?? generated.age,
        techExperienceLevel: project.techExperienceLevel,
      }); // AC3.6
    },
  };
}
