import type {
  CreateProjectFieldErrors,
  CreateProjectInput,
  ExportContent,
  ExportFormat,
  NewPersonaInput,
  PersonaDto,
  PersonaSections,
  PersonaSectionsFieldErrors,
  ProjectDto,
  ProjectSummaryDto,
  RequirementDto,
  RequirementEdit,
  RequirementEditFieldErrors,
} from "@smartpathy/shared";
import { isGenerationErrorCode } from "@smartpathy/shared";
import {
  GENERATION_ERROR_MESSAGES,
  GenerationError,
  SERVER_UNREACHABLE_MESSAGE,
} from "./generation";

const PUBLIC_API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export const API_URL =
  typeof window === "undefined"
    ? (process.env.API_INTERNAL_URL ?? PUBLIC_API_URL)
    : PUBLIC_API_URL;

/**
 * AC9.1 / AC10.1: downloaded by the browser itself, so it always uses the public URL,
 * even when rendered on the server (where API_URL may be a Docker-internal address).
 */
export function exportUrl(
  projectId: string,
  format: ExportFormat,
  selection: { personaIds: string[]; include: ExportContent[] },
): string {
  const query = new URLSearchParams({
    format,
    personas: selection.personaIds.join(","),
    include: selection.include.join(","),
  });
  return `${PUBLIC_API_URL}/projects/${encodeURIComponent(projectId)}/export?${query}`;
}

export type CreateProjectResult =
  | { ok: true; project: ProjectDto }
  | { ok: false; fieldErrors: CreateProjectFieldErrors };

export async function createProject(
  input: CreateProjectInput,
): Promise<CreateProjectResult> {
  const response = await fetch(`${API_URL}/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (response.status === 201) {
    return { ok: true, project: await response.json() };
  }
  if (response.status === 400) {
    const body = await response.json();
    return { ok: false, fieldErrors: body.fieldErrors ?? {} };
  }
  throw new Error(`Unexpected status ${response.status}`);
}

/** AC8.1: newest first, with each project's progress. */
export async function listProjects(): Promise<ProjectSummaryDto[]> {
  const response = await fetch(`${API_URL}/projects`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Unexpected status ${response.status}`);
  return response.json();
}

export async function getProject(id: string): Promise<ProjectDto | null> {
  const response = await fetch(
    `${API_URL}/projects/${encodeURIComponent(id)}`,
    { cache: "no-store" },
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Unexpected status ${response.status}`);
  return response.json();
}

/** AC4.1 / AC12.3: oldest first; empty when the project has no persona yet. Null when it does not exist. */
export async function getPersonas(projectId: string): Promise<PersonaDto[] | null> {
  const response = await fetch(
    `${API_URL}/projects/${encodeURIComponent(projectId)}/personas`,
    { cache: "no-store" },
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Unexpected status ${response.status}`);
  return response.json();
}

export type UpdatePersonaResult =
  | { ok: true; persona: PersonaDto }
  | { ok: false; fieldErrors: PersonaSectionsFieldErrors };

/** AC7.2 / AC7.3: the backend validates with the same shared schema (400 = field errors). */
export async function updatePersona(
  projectId: string,
  personaId: string,
  sections: PersonaSections,
): Promise<UpdatePersonaResult> {
  const response = await fetch(
    `${API_URL}/projects/${encodeURIComponent(projectId)}/personas/${encodeURIComponent(personaId)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sections),
    },
  );
  if (response.ok) return { ok: true, persona: await response.json() };
  if (response.status === 400) {
    const body = await response.json();
    return { ok: false, fieldErrors: body.fieldErrors ?? {} };
  }
  if (response.status === 404) {
    throw new Error("This persona no longer exists. Reload the page.");
  }
  throw new Error("Could not save the changes. Please try again.");
}

/** AC3.1: the backend builds the prompt from the stored project data. */
export async function generatePersona(projectId: string): Promise<PersonaDto> {
  return requestGeneration(`/projects/${encodeURIComponent(projectId)}/generate-persona`, {
    conflict: "This project already has a persona.",
    fallback: "Could not generate the persona. Please try again.",
  });
}

/** AC12.1 / AC12.2: adds a persona; the backend reuses the project's application context. */
export async function createPersona(
  projectId: string,
  input: NewPersonaInput,
): Promise<PersonaDto> {
  return requestGeneration(`/projects/${encodeURIComponent(projectId)}/personas`, {
    body: input,
    conflict: "Generate the PATHY persona before adding another one.",
    fallback: "Could not generate the persona. Please try again.",
  });
}

/** AC12.5: the backend also removes the persona's requirements. */
export async function deletePersona(projectId: string, personaId: string): Promise<void> {
  const response = await fetch(
    `${API_URL}/projects/${encodeURIComponent(projectId)}/personas/${encodeURIComponent(personaId)}`,
    { method: "DELETE" },
  );
  if (response.status === 204) return;
  if (response.status === 409) throw new Error("A project must keep at least one persona.");
  if (response.status === 404) throw new Error("This persona no longer exists. Reload the page.");
  throw new Error("Could not delete the persona. Please try again.");
}

/** AC5.8 / AC12.4: null when the persona does not exist; empty when nothing was generated yet. */
export async function getRequirements(
  projectId: string,
  personaId: string,
): Promise<RequirementDto[] | null> {
  const response = await fetch(
    `${API_URL}/projects/${encodeURIComponent(projectId)}/personas/${encodeURIComponent(personaId)}/requirements`,
    { cache: "no-store" },
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Unexpected status ${response.status}`);
  return response.json();
}

/** AC5.2 / AC12.4: the backend builds the prompt from the project and the selected persona. */
export async function generateRequirements(
  projectId: string,
  personaId: string,
): Promise<RequirementDto[]> {
  return requestGeneration(
    `/projects/${encodeURIComponent(projectId)}/personas/${encodeURIComponent(personaId)}/generate-requirements`,
    {
      conflict: "Generate the PATHY persona before generating requirements.",
      fallback: "Could not generate the requirements. Please try again.",
    },
  );
}

export type UpdateRequirementResult =
  | { ok: true; requirement: RequirementDto }
  | { ok: false; fieldErrors: RequirementEditFieldErrors };

/** AC14.2: the backend validates with the same shared schema (400 = field errors). */
export async function updateRequirement(
  id: string,
  edit: RequirementEdit,
): Promise<UpdateRequirementResult> {
  const response = await fetch(`${API_URL}/requirements/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(edit),
  });
  if (response.ok) return { ok: true, requirement: await response.json() };
  if (response.status === 400) {
    const body = await response.json();
    return { ok: false, fieldErrors: body.fieldErrors ?? {} };
  }
  if (response.status === 404) {
    throw new Error("This requirement no longer exists. Reload the page.");
  }
  throw new Error("Could not save the changes. Please try again.");
}

/** AC14.3 */
export async function deleteRequirement(id: string): Promise<void> {
  const response = await fetch(`${API_URL}/requirements/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (response.status === 204) return;
  if (response.status === 404) {
    throw new Error("This requirement no longer exists. Reload the page.");
  }
  throw new Error("Could not delete the requirement. Please try again.");
}

/** AC13.1: adds to the requirements the persona already has. */
export async function generateMoreRequirements(
  projectId: string,
  personaId: string,
): Promise<RequirementDto[]> {
  return requestGeneration(
    `/projects/${encodeURIComponent(projectId)}/personas/${encodeURIComponent(personaId)}/generate-more-requirements`,
    {
      conflict: "This persona has reached the requirements limit.",
      fallback: "Could not generate more requirements. Please try again.",
    },
  );
}

/**
 * POSTs a generation request. Failures become a GenerationError whose message
 * states the cause in plain language (AC11.3).
 */
async function requestGeneration<T>(
  path: string,
  options: { body?: unknown; conflict: string; fallback: string },
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      ...(options.body === undefined
        ? {}
        : {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(options.body),
          }),
    });
  } catch {
    throw new GenerationError(SERVER_UNREACHABLE_MESSAGE);
  }
  if (response.status === 201) return response.json();
  if (response.status === 404) throw new GenerationError("Project not found.");
  if (response.status === 409) throw new GenerationError(options.conflict);
  // 502: the AI failed. 429: our own per-IP limit on generations.
  if (response.status === 502 || response.status === 429) {
    const body: unknown = await response.json().catch(() => null);
    const code =
      body && typeof body === "object" && "code" in body && isGenerationErrorCode(body.code)
        ? body.code
        : "ai_unavailable";
    throw new GenerationError(GENERATION_ERROR_MESSAGES[code], code);
  }
  throw new GenerationError(options.fallback);
}
