import type {
  CreateProjectFieldErrors,
  LoginInput,
  RegisterFieldErrors,
  RegisterInput,
  UserDto,
  CreateProjectInput,
  ExportContent,
  ExportFormat,
  NewPersonaInput,
  PersonaDto,
  PersonaSections,
  PersonaSectionsFieldErrors,
  ProjectDto,
  ProjectSummaryDto,
  UpdateProjectFieldErrors,
  UpdateProjectInput,
  RequirementDto,
  RequirementEdit,
  RequirementEditFieldErrors,
} from "@smartpathy/shared";
import { isGenerationErrorCode } from "@smartpathy/shared";
import { redirect } from "next/navigation";
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

/** Server Components forward the visitor's cookie; the browser sends it by itself. */
async function forwardedCookies(): Promise<HeadersInit> {
  if (typeof window !== "undefined") return {};
  const { cookies } = await import("next/headers");
  const cookie = (await cookies()).toString();
  return cookie ? { cookie } : {};
}

/** Any request to the API. AC18.3: an expired or missing session goes to the login screen. */
async function apiFetch(
  url: string,
  init: RequestInit = {},
  { redirectOn401 = true } = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  new Headers(await forwardedCookies()).forEach((value, key) => headers.set(key, value));
  const response = await fetch(url, { ...init, credentials: "include", headers });

  if (response.status === 401 && redirectOn401) {
    if (typeof window === "undefined") redirect("/login");
    // Outside React, and a full reload also resets the signed-in header.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/login");
    throw new Error("Your session has expired. Please log in again.");
  }
  return response;
}

export type RegisterResult =
  | { ok: true; user: UserDto }
  | { ok: false; fieldErrors: RegisterFieldErrors };

/** AC18.1 */
export async function register(input: RegisterInput): Promise<RegisterResult> {
  const response = await apiFetch(
    `${API_URL}/auth/register`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    { redirectOn401: false },
  );
  if (response.status === 201) return { ok: true, user: await response.json() };
  if (response.status === 400 || response.status === 409) {
    const body = await response.json();
    return { ok: false, fieldErrors: body.fieldErrors ?? {} };
  }
  if (response.status === 429) throw new Error("Too many attempts. Please try again later.");
  throw new Error("Could not create the account. Please try again.");
}

/** AC18.2: false for wrong credentials. */
export async function login(input: LoginInput): Promise<boolean> {
  const response = await apiFetch(
    `${API_URL}/auth/login`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    { redirectOn401: false },
  );
  if (response.ok) return true;
  if (response.status === 401) return false;
  if (response.status === 429) throw new Error("Too many attempts. Please try again later.");
  throw new Error("Could not log in. Please try again.");
}

/** AC18.5 */
export async function logout(): Promise<void> {
  await apiFetch(`${API_URL}/auth/logout`, { method: "POST" }, { redirectOn401: false });
}

/** The signed-in user, or null. Never redirects: the login screen uses it too. */
export async function getCurrentUser(): Promise<UserDto | null> {
  try {
    const response = await apiFetch(
      `${API_URL}/auth/me`,
      { cache: "no-store" },
      { redirectOn401: false },
    );
    return response.ok ? response.json() : null;
  } catch {
    return null;
  }
}

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
  const response = await apiFetch(`${API_URL}/projects`, {
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
  const response = await apiFetch(`${API_URL}/projects`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Unexpected status ${response.status}`);
  return response.json();
}

export async function getProject(id: string): Promise<ProjectDto | null> {
  const response = await apiFetch(
    `${API_URL}/projects/${encodeURIComponent(id)}`,
    { cache: "no-store" },
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Unexpected status ${response.status}`);
  return response.json();
}

export type UpdateProjectResult =
  | { ok: true; project: ProjectDto }
  | { ok: false; fieldErrors: UpdateProjectFieldErrors };

/** AC17.1: the backend validates with the same shared schema (400 = field errors). */
export async function updateProject(
  id: string,
  input: UpdateProjectInput,
): Promise<UpdateProjectResult> {
  const response = await apiFetch(`${API_URL}/projects/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (response.ok) return { ok: true, project: await response.json() };
  if (response.status === 400) {
    const body = await response.json();
    return { ok: false, fieldErrors: body.fieldErrors ?? {} };
  }
  if (response.status === 404) {
    throw new Error("This project no longer exists. Reload the page.");
  }
  throw new Error("Could not save the changes. Please try again.");
}

/** AC17.4: the backend also removes the project's personas and requirements. */
export async function deleteProject(id: string): Promise<void> {
  const response = await apiFetch(`${API_URL}/projects/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (response.status === 204) return;
  if (response.status === 404) {
    throw new Error("This project no longer exists. Reload the page.");
  }
  throw new Error("Could not delete the project. Please try again.");
}

/** AC4.1 / AC12.3: oldest first; empty when the project has no persona yet. Null when it does not exist. */
export async function getPersonas(projectId: string): Promise<PersonaDto[] | null> {
  const response = await apiFetch(
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
  const response = await apiFetch(
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
  const response = await apiFetch(
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
  const response = await apiFetch(
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
  const response = await apiFetch(`${API_URL}/requirements/${encodeURIComponent(id)}`, {
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
  const response = await apiFetch(`${API_URL}/requirements/${encodeURIComponent(id)}`, {
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
    response = await apiFetch(`${API_URL}${path}`, {
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
