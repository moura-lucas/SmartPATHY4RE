import type {
  CreateProjectFieldErrors,
  CreateProjectInput,
  PersonaDto,
  PersonaSections,
  PersonaSectionsFieldErrors,
  ProjectDto,
  RequirementDto,
} from "@smartpathy/shared";

const PUBLIC_API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export const API_URL =
  typeof window === "undefined"
    ? (process.env.API_INTERNAL_URL ?? PUBLIC_API_URL)
    : PUBLIC_API_URL;

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

export async function getProject(id: string): Promise<ProjectDto | null> {
  const response = await fetch(
    `${API_URL}/projects/${encodeURIComponent(id)}`,
    { cache: "no-store" },
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Unexpected status ${response.status}`);
  return response.json();
}

/** AC4.1: null when the project has no persona yet (AC4.6). */
export async function getPersona(
  projectId: string,
): Promise<PersonaDto | null> {
  const response = await fetch(
    `${API_URL}/projects/${encodeURIComponent(projectId)}/persona`,
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
  sections: PersonaSections,
): Promise<UpdatePersonaResult> {
  const response = await fetch(
    `${API_URL}/projects/${encodeURIComponent(projectId)}/persona`,
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
  const response = await fetch(
    `${API_URL}/projects/${encodeURIComponent(projectId)}/generate-persona`,
    { method: "POST" },
  );
  if (response.status === 201) return response.json();
  if (response.status === 404) throw new Error("Project not found.");
  if (response.status === 502) {
    throw new Error(
      "The AI could not generate the persona right now. Please try again in a few moments.",
    );
  }
  throw new Error("Could not generate the persona. Please try again.");
}

/** AC5.8: null when the project does not exist; empty when nothing was generated yet. */
export async function getRequirements(
  projectId: string,
): Promise<RequirementDto[] | null> {
  const response = await fetch(
    `${API_URL}/projects/${encodeURIComponent(projectId)}/requirements`,
    { cache: "no-store" },
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Unexpected status ${response.status}`);
  return response.json();
}

/** AC5.2: the backend builds the prompt from the stored project and persona. */
export async function generateRequirements(
  projectId: string,
): Promise<RequirementDto[]> {
  const response = await fetch(
    `${API_URL}/projects/${encodeURIComponent(projectId)}/generate-requirements`,
    { method: "POST" },
  );
  if (response.status === 201) return response.json();
  if (response.status === 404) throw new Error("Project not found.");
  if (response.status === 409) {
    throw new Error("Generate the PATHY persona before generating requirements.");
  }
  if (response.status === 502) {
    throw new Error(
      "The AI could not generate the requirements right now. Please try again in a few moments.",
    );
  }
  throw new Error("Could not generate the requirements. Please try again.");
}
