import {
  personaSchema,
  type NewPersonaInput,
  type PersonaDto,
  type PersonaSections,
  type ProjectDto,
} from "@smartpathy/shared";
import type { LlmService } from "../llm/llmService.js";
import type { ProjectRepository } from "../projects/project.repository.js";
import { buildPersonaPrompt, type PersonaProfile } from "./persona.prompt.js";
import type { PersonaRepository } from "./persona.repository.js";

// The level always comes from the request: the LLM does not need to return it.
const generatedPersonaSchema = personaSchema.omit({ techExperienceLevel: true });

export type GeneratePersonaResult =
  | { status: "project_not_found" }
  | { status: "already_has_persona" }
  | { status: "generated"; persona: PersonaDto };

export type AddPersonaResult =
  | { status: "project_not_found" }
  | { status: "no_personas" }
  | { status: "generated"; persona: PersonaDto };

export type UpdatePersonaResult =
  | { status: "project_not_found" }
  | { status: "persona_not_found" }
  | { status: "updated"; persona: PersonaDto };

export type RemovePersonaResult =
  | { status: "project_not_found" }
  | { status: "persona_not_found" }
  | { status: "last_persona" }
  | { status: "deleted" };

export interface PersonaService {
  /** The project's first persona, from the profile given when it was created. */
  generateFirst(projectId: string): Promise<GeneratePersonaResult>;
  /** AC12.1 / AC12.2: another persona, reusing the project's application context. */
  add(projectId: string, input: NewPersonaInput): Promise<AddPersonaResult>;
  /** Returns null when the project does not exist. Oldest first. */
  list(projectId: string): Promise<PersonaDto[] | null>;
  /** AC7.3: name, age and level are kept; only the five sections change. */
  updateSections(
    projectId: string,
    personaId: string,
    sections: PersonaSections,
  ): Promise<UpdatePersonaResult>;
  /** AC12.5 */
  remove(projectId: string, personaId: string): Promise<RemovePersonaResult>;
}

export function createPersonaService(deps: {
  llm: LlmService;
  projects: ProjectRepository;
  personas: PersonaRepository;
}): PersonaService {
  async function generate(
    project: ProjectDto,
    profile: PersonaProfile,
    existingNames: string[],
  ): Promise<PersonaDto> {
    // AC3.1 / AC3.2: the LlmService validates the response and retries.
    const { system, prompt } = buildPersonaPrompt(project, profile, existingNames);
    const generated = await deps.llm.generateJson(generatedPersonaSchema, system, prompt);

    // AC3.3 / AC3.4: user input wins, the LLM only fills the gaps.
    // Saved only after a valid response, so a failure changes nothing (AC3.8).
    return deps.personas.create(project.id, {
      ...generated,
      name: profile.name ?? generated.name,
      age: profile.age ?? generated.age,
      techExperienceLevel: profile.techExperienceLevel,
    }); // AC3.6
  }

  return {
    async generateFirst(projectId) {
      const project = await deps.projects.findById(projectId);
      if (!project) return { status: "project_not_found" };
      const existing = await deps.personas.listByProjectId(project.id);
      if (existing.length > 0) return { status: "already_has_persona" };

      const persona = await generate(
        project,
        {
          name: project.personaName,
          age: project.personaAge,
          techExperienceLevel: project.techExperienceLevel,
        },
        [],
      );
      return { status: "generated", persona };
    },

    async add(projectId, input) {
      const project = await deps.projects.findById(projectId);
      if (!project) return { status: "project_not_found" };
      const existing = await deps.personas.listByProjectId(project.id);
      if (existing.length === 0) return { status: "no_personas" }; // AC12.1

      const persona = await generate(
        project,
        {
          name: input.personaName,
          age: input.personaAge,
          techExperienceLevel: input.techExperienceLevel,
        },
        existing.map(({ name }) => name),
      );
      return { status: "generated", persona };
    },

    async list(projectId) {
      const project = await deps.projects.findById(projectId);
      if (!project) return null;
      return deps.personas.listByProjectId(project.id);
    },

    async updateSections(projectId, personaId, sections) {
      const project = await deps.projects.findById(projectId);
      if (!project) return { status: "project_not_found" };
      if (!(await deps.personas.findById(project.id, personaId))) {
        return { status: "persona_not_found" };
      }
      const persona = await deps.personas.updateSections(personaId, sections);
      return { status: "updated", persona };
    },

    async remove(projectId, personaId) {
      const project = await deps.projects.findById(projectId);
      if (!project) return { status: "project_not_found" };
      return { status: await deps.personas.deleteUnlessLast(project.id, personaId) };
    },
  };
}
