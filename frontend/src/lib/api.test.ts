import { afterEach, describe, expect, it, vi } from "vitest";
import { buildPersona } from "@/test/fixtures";
import { listProjects, updatePersona } from "./api";

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
