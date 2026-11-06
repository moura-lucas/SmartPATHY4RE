import { afterEach, describe, expect, it, vi } from "vitest";
import { buildPersona } from "@/test/fixtures";
import { generatePersona, generateRequirements, listProjects, updatePersona } from "./api";
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

    await expect(updatePersona("project-1", sections)).resolves.toEqual({
      ok: true,
      persona: buildPersona(),
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/projects\/project-1\/persona$/),
      expect.objectContaining({ method: "PUT", body: JSON.stringify(sections) }),
    );
  });

  it("returns the backend field errors on 400 (AC7.2)", async () => {
    mockFetch(400, { error: "Invalid", fieldErrors: { "who.profession": ["Required"] } });

    await expect(updatePersona("project-1", sections)).resolves.toEqual({
      ok: false,
      fieldErrors: { "who.profession": ["Required"] },
    });
  });

  it("throws a readable message on other errors", async () => {
    mockFetch(404, { error: "Persona not found." });
    await expect(updatePersona("project-1", sections)).rejects.toThrow("no longer exists");

    mockFetch(500, {});
    await expect(updatePersona("project-1", sections)).rejects.toThrow("Could not save");
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

      const error = await generateRequirements("project-1").catch((e: unknown) => e);

      expect(error).toBeInstanceOf(GenerationError);
      expect(error).toMatchObject({ code, message: GENERATION_ERROR_MESSAGES[code] });
    },
  );

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

    await expect(generateRequirements("project-1")).rejects.toThrow(
      "Generate the PATHY persona before generating requirements.",
    );
  });

  it("reports a missing project on 404", async () => {
    mockFetch(404, { error: "Project not found." });

    await expect(generatePersona("project-1")).rejects.toThrow("Project not found.");
  });
});
