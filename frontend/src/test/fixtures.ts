import type { PersonaDto, ProjectDto, RequirementDto } from "@smartpathy/shared";

export function buildProject(overrides: Partial<ProjectDto> = {}): ProjectDto {
  return {
    id: "project-1",
    name: "CareTrack",
    domain: "Healthcare",
    description: "An app that helps nurses record vital signs.",
    additionalContext: null,
    personaName: null,
    personaAge: null,
    techExperienceLevel: "low",
    createdAt: "2026-10-14T12:00:00.000Z",
    ...overrides,
  };
}

export function buildPersona(overrides: Partial<PersonaDto> = {}): PersonaDto {
  return {
    id: "persona-1",
    projectId: "project-1",
    createdAt: "2026-10-14T12:00:00.000Z",
    updatedAt: "2026-10-14T12:00:00.000Z",
    name: "Ana",
    age: 34,
    techExperienceLevel: "low",
    who: {
      profession: "Nurse",
      educationLevel: "Bachelor's degree in nursing",
      selfDescription: "Caring and organized, but always short on time.",
      fearsConcernsFrustrations: "Afraid of making mistakes in patient records.",
    },
    context: { routineTasks: "Records vital signs and checks medication schedules." },
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
    ...overrides,
  };
}

export function buildRequirement(overrides: Partial<RequirementDto> = {}): RequirementDto {
  const code = overrides.code ?? "FR1";
  return {
    id: `requirement-${code}`,
    projectId: "project-1",
    createdAt: "2026-10-14T12:00:00.000Z",
    code,
    type: code.startsWith("NFR") ? "non_functional" : "functional",
    description: `Description of ${code}.`,
    moscow: "must",
    priority: "high",
    derivedFrom: ["C1"],
    ...overrides,
  };
}
