import type { Persona, PersonaDto, PersonaSections, ProjectDto } from "@smartpathy/shared";

// Test data shared by the persona tests.

export const project: ProjectDto = {
  id: "project-1",
  name: "Clinic App",
  domain: "Healthcare",
  description: "App for nurses to manage patient records.",
  additionalContext: null,
  personaName: null,
  personaAge: null,
  techExperienceLevel: "low",
  createdAt: "2026-10-09T12:00:00.000Z",
};

/** Returns a new, fully valid persona on each call, so tests can mutate it freely. */
export function buildPersona(): Persona {
  return {
    name: "Maria",
    age: 50,
    techExperienceLevel: "low",
    who: {
      profession: "Nurse",
      educationLevel: "Bachelor's degree in nursing",
      selfDescription: "Caring and organized, but always short on time.",
      fearsConcernsFrustrations: "Afraid of making mistakes in patient records.",
    },
    context: {
      routineTasks: "Records vital signs and checks medication schedules.",
    },
    experienceWithTechnology: {
      likedParts: "Simple screens with large buttons.",
      dislikedParts: "Long forms and technical jargon.",
      devicesUsed: "Smartphone and the hospital's shared desktop.",
      howLearnsNewApplications: "Asks colleagues to show her step by step.",
      stepByStepOrShortcuts: "Prefers step-by-step guidance.",
      informationProcessingStyle: "Reads carefully and prefers visual cues.",
      virtualSocialBehaviour: "Uses messaging apps only with close colleagues.",
    },
    problems: {
      routineProblems: "Loses time switching between paper and the system.",
      howApplicationCanHelp: "Centralizes patient records in one quick screen.",
    },
    existingSolutions: {
      existingTechnologies: "Paper charts and a legacy hospital system.",
      positiveCharacteristics: "Paper is always available, even offline.",
      negativeCharacteristics: "The legacy system is slow and confusing.",
    },
  };
}

/** The five editable sections of `buildPersona()`: the body of PUT /projects/:id/persona. */
export function buildSections(): PersonaSections {
  const { name: _name, age: _age, techExperienceLevel: _level, ...sections } = buildPersona();
  return sections;
}

/** The persona as stored for `project`. */
export function buildPersonaDto(): PersonaDto {
  return {
    ...buildPersona(),
    id: "persona-1",
    projectId: project.id,
    createdAt: "2026-10-12T12:00:00.000Z",
    updatedAt: "2026-10-12T12:00:00.000Z",
  };
}

/** What the LLM returns: the persona without the level, as raw JSON text. */
export function llmResponse(overrides: Record<string, unknown> = {}): string {
  const { techExperienceLevel: _omit, ...generated } = buildPersona();
  return JSON.stringify({ ...generated, ...overrides });
}
