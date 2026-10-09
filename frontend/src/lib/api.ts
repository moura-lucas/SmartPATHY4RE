import type {
  CreateProjectFieldErrors,
  CreateProjectInput,
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
