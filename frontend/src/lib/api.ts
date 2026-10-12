import type {
  CreateProjectFieldErrors,
  CreateProjectInput,
  PersonaDto,
  ProjectDto,
} from "@smartpathy/shared";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

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
