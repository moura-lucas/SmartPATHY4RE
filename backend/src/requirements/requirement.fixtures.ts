import type { Requirement, RequirementDto } from "@smartpathy/shared";

// Test data shared by the requirement tests.

/** Returns a new, valid list (both types, unique codes) on each call. */
export function buildRequirements(): Requirement[] {
  return [
    {
      code: "FR1",
      type: "functional",
      description: "The system shall show the patient's record on a single screen.",
      moscow: "must",
      priority: "high",
      derivedFrom: ["P1", "P2"],
    },
    {
      code: "FR2",
      type: "functional",
      description: "The system shall guide the nurse step by step when recording vital signs.",
      moscow: "should",
      priority: "medium",
      derivedFrom: ["E4", "E5"],
    },
    {
      code: "NFR1",
      type: "non_functional",
      description: "The interface shall use large buttons and avoid technical jargon.",
      moscow: "must",
      priority: "high",
      derivedFrom: ["E1", "E2"],
    },
  ];
}

export function buildRequirementDtos(projectId = "project-1"): RequirementDto[] {
  return buildRequirements().map((req, i) => ({
    ...req,
    id: `requirement-${i + 1}`,
    projectId,
    createdAt: "2026-10-14T12:00:00.000Z",
  }));
}

/** What the LLM returns, as raw JSON text. */
export function llmRequirementsResponse(requirements: unknown[] = buildRequirements()): string {
  return JSON.stringify({ requirements });
}
