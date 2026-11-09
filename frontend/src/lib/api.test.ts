import { afterEach, describe, expect, it, vi } from "vitest";
import { buildPersona } from "@/test/fixtures";
import {
  createPersona,
  deletePersona,
  generateMoreRequirements,
  generatePersona,
  generateRequirements,
  getPersonas,
  getRequirements,
  deleteProject,
  deleteRequirement,
  listProjects,
  updatePersona,
  updateProject,
  updateRequirement,
} from "./api";
import { GENERATION_ERROR_MESSAGES, GenerationError, SERVER_UNREACHABLE_MESSAGE } from "./generation";

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const { who, context, experienceWithTechnology, problems, existingSolutions } = buildPersona();
const sections = { who, context, experienceWithTechnology, problems, existingSolutions };

describe("updatePersona", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("PUTs the sections and returns the updated persona (AC7.3)", async () => {
    const fetchMock = mockFetch(200, buildPersona());

    await expect(updatePersona("project-1", "persona-1", sections)).resolves.toEqual({
      ok: true,
      persona: buildPersona(),
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/projects\/project-1\/personas\/persona-1$/),
      expect.objectContaining({ method: "PUT", body: JSON.stringify(sections) }),
    );
  });

  it("returns the backend field errors on 400 (AC7.2)", async () => {
    mockFetch(400, { error: "Invalid", fieldErrors: { "who.profession": ["Required"] } });

    await expect(updatePersona("project-1", "persona-1", sections)).resolves.toEqual({
      ok: false,
      fieldErrors: { "who.profession": ["Required"] },
    });
  });

  it("throws a readable message on other errors", async () => {
    mockFetch(404, { error: "Persona not found." });
    await expect(updatePersona("project-1", "persona-1", sections)).rejects.toThrow("no longer exists");

    mockFetch(500, {});
    await expect(updatePersona("project-1", "persona-1", sections)).rejects.toThrow("Could not save");
  });
});

describe("listProjects", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("fetches the project summaries without caching (AC8.1)", async () => {
    const fetchMock = mockFetch(200, []);

    await expect(listProjects()).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/projects$/), {
      cache: "no-store",
    });
  });

  it("throws when the backend fails", async () => {
    mockFetch(500, {});
    await expect(listProjects()).rejects.toThrow("Unexpected status 500");
  });
});

describe("generation requests (US11)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns the generated persona on 201", async () => {
    const fetchMock = mockFetch(201, buildPersona());

    await expect(generatePersona("project-1")).resolves.toEqual(buildPersona());
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/projects\/project-1\/generate-persona$/),
      { method: "POST" },
    );
  });

  it.each(["ai_unavailable", "ai_rate_limited", "ai_invalid_response"] as const)(
    "explains the cause %s in plain language (AC11.3)",
    async (code) => {
      mockFetch(502, { error: "Technical text", code });

      const error = await generateRequirements("project-1", "persona-1").catch((e: unknown) => e);

      expect(error).toBeInstanceOf(GenerationError);
      expect(error).toMatchObject({ code, message: GENERATION_ERROR_MESSAGES[code] });
    },
  );

  it("explains the per-IP generation limit like the AI usage limit", async () => {
    mockFetch(429, { error: "Technical text", code: "ai_rate_limited" });

    await expect(generatePersona("project-1")).rejects.toMatchObject({
      code: "ai_rate_limited",
      message: GENERATION_ERROR_MESSAGES.ai_rate_limited,
    });
  });

  it("treats a 502 without a known code as the AI being unavailable", async () => {
    mockFetch(502, { error: "Bad gateway" });

    await expect(generatePersona("project-1")).rejects.toMatchObject({
      code: "ai_unavailable",
    });
  });

  it("says when the server cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("fetch failed"))));

    await expect(generatePersona("project-1")).rejects.toMatchObject({
      code: null,
      message: SERVER_UNREACHABLE_MESSAGE,
    });
  });

  it("asks for the persona first on 409 (AC5.1)", async () => {
    mockFetch(409, { error: "No persona" });

    await expect(generateRequirements("project-1", "persona-1")).rejects.toThrow(
      "Generate the PATHY persona before generating requirements.",
    );
  });

  it("reports a missing project on 404", async () => {
    mockFetch(404, { error: "Project not found." });

    await expect(generatePersona("project-1")).rejects.toThrow("Project not found.");
  });
});

describe("personas (US12)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("lists the project's personas", async () => {
    const fetchMock = mockFetch(200, [buildPersona()]);

    await expect(getPersonas("project-1")).resolves.toEqual([buildPersona()]);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/projects\/project-1\/personas$/),
      { cache: "no-store" },
    );
  });

  it("returns null when the project does not exist", async () => {
    mockFetch(404, { error: "Project not found." });

    await expect(getPersonas("missing")).resolves.toBeNull();
  });

  it("POSTs the chosen profile for a new persona (AC12.1)", async () => {
    const fetchMock = mockFetch(201, buildPersona());
    const input = { techExperienceLevel: "high" as const, personaName: "Bruno" };

    await createPersona("project-1", input);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/projects\/project-1\/personas$/),
      expect.objectContaining({ method: "POST", body: JSON.stringify(input) }),
    );
  });

  it("fetches the requirements of one persona (AC12.4)", async () => {
    const fetchMock = mockFetch(200, []);

    await expect(getRequirements("project-1", "persona-2")).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/personas\/persona-2\/requirements$/),
      { cache: "no-store" },
    );
  });

  it("deletes a persona (AC12.5)", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(deletePersona("project-1", "persona-2")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/personas\/persona-2$/),
      { method: "DELETE" },
    );
  });

  it("explains why the last persona cannot be deleted (AC12.5)", async () => {
    mockFetch(409, { error: "x" });

    await expect(deletePersona("project-1", "persona-1")).rejects.toThrow(
      "A project must keep at least one persona.",
    );
  });
});

describe("generateMoreRequirements (US13)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("POSTs for the selected persona (AC13.1)", async () => {
    const fetchMock = mockFetch(201, []);

    await generateMoreRequirements("project-1", "persona-2");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/personas\/persona-2\/generate-more-requirements$/),
      { method: "POST" },
    );
  });

  it("explains that the limit was reached", async () => {
    mockFetch(409, { error: "x" });

    await expect(generateMoreRequirements("project-1", "persona-1")).rejects.toThrow(
      "This persona has reached the requirements limit.",
    );
  });
});

describe("requirement editing (US14)", () => {
  afterEach(() => vi.unstubAllGlobals());

  const edit = {
    description: "New text.",
    moscow: "could" as const,
    priority: "low" as const,
    derivedFrom: ["C1" as const],
  };

  it("PATCHes the changes (AC14.1)", async () => {
    const fetchMock = mockFetch(200, { id: "r1", edited: true });

    await expect(updateRequirement("r1", edit)).resolves.toEqual({
      ok: true,
      requirement: { id: "r1", edited: true },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/requirements\/r1$/),
      expect.objectContaining({ method: "PATCH", body: JSON.stringify(edit) }),
    );
  });

  it("returns the backend field errors on 400 (AC14.2)", async () => {
    mockFetch(400, { error: "x", fieldErrors: { description: ["Description is required"] } });

    await expect(updateRequirement("r1", edit)).resolves.toEqual({
      ok: false,
      fieldErrors: { description: ["Description is required"] },
    });
  });

  it("deletes a requirement (AC14.3)", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(deleteRequirement("r1")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/requirements\/r1$/), {
      method: "DELETE",
    });
  });

  it("explains a requirement that no longer exists", async () => {
    mockFetch(404, { error: "x" });

    await expect(deleteRequirement("r1")).rejects.toThrow("no longer exists");
  });
});

describe("project editing (US17)", () => {
  afterEach(() => vi.unstubAllGlobals());

  const input = {
    name: "New name",
    domain: "Education",
    description: "A description.",
    additionalContext: undefined,
  };

  it("PATCHes the changes (AC17.1)", async () => {
    const fetchMock = mockFetch(200, { id: "p1" });

    await expect(updateProject("p1", input)).resolves.toEqual({ ok: true, project: { id: "p1" } });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/projects\/p1$/),
      expect.objectContaining({ method: "PATCH", body: JSON.stringify(input) }),
    );
  });

  it("returns the backend field errors on 400 (AC17.1)", async () => {
    mockFetch(400, { error: "x", fieldErrors: { name: ["Project name is required"] } });

    await expect(updateProject("p1", input)).resolves.toEqual({
      ok: false,
      fieldErrors: { name: ["Project name is required"] },
    });
  });

  it("deletes a project (AC17.4)", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(deleteProject("p1")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/projects\/p1$/), {
      method: "DELETE",
    });
  });

  it("explains a project that no longer exists (AC17.5)", async () => {
    mockFetch(404, { error: "x" });

    await expect(deleteProject("p1")).rejects.toThrow("no longer exists");
  });
});
