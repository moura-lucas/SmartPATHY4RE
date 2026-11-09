import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Requirement } from "@smartpathy/shared";
import { LlmError, LlmUnavailableError } from "../llm/errors.js";
import { LlmService } from "../llm/llmService.js";
import type { LlmProvider } from "../llm/provider.js";
import { buildPersonaDto, fakePersonaRepository, project } from "../personas/persona.fixtures.js";
import type { PersonaRepository } from "../personas/persona.repository.js";
import type { ProjectRepository } from "../projects/project.repository.js";
import {
  buildRequirementDtos,
  buildRequirements,
  llmRequirementsResponse,
} from "./requirement.fixtures.js";
import type { RequirementRepository } from "./requirement.repository.js";
import { createRequirementService } from "./requirement.service.js";

const PERSONA = "persona-1";

let provider: { complete: ReturnType<typeof vi.fn<LlmProvider["complete"]>> };
let projects: ProjectRepository;
let personas: PersonaRepository;
let requirements: {
  replaceAll: ReturnType<typeof vi.fn<RequirementRepository["replaceAll"]>>;
  append: ReturnType<typeof vi.fn<RequirementRepository["append"]>>;
  findById: ReturnType<typeof vi.fn<RequirementRepository["findById"]>>;
  applyEdit: ReturnType<typeof vi.fn<RequirementRepository["applyEdit"]>>;
  deleteById: ReturnType<typeof vi.fn<RequirementRepository["deleteById"]>>;
  isOwnedBy: ReturnType<typeof vi.fn<RequirementRepository["isOwnedBy"]>>;
  findByPersonaId: ReturnType<typeof vi.fn<RequirementRepository["findByPersonaId"]>>;
};

function service(maxRetries = 0) {
  const llm = new LlmService(provider, { maxRetries, baseDelayMs: 0 });
  return createRequirementService({ llm, projects, personas, requirements });
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  provider = { complete: vi.fn<LlmProvider["complete"]>(async () => llmRequirementsResponse()) };
  projects = {
    create: vi.fn(),
    findById: vi.fn(async (id) => (id === project.id ? project : null)),
    listSummaries: vi.fn(),
    isOwnedBy: vi.fn(async () => true),
    update: vi.fn(),
    remove: vi.fn(),
  };
  personas = fakePersonaRepository([buildPersonaDto()]);
  requirements = {
    replaceAll: vi.fn<RequirementRepository["replaceAll"]>(async ({ id, projectId }) =>
      buildRequirementDtos(projectId, id),
    ),
    append: vi.fn<RequirementRepository["append"]>(async ({ id, projectId }) => ({
      status: "appended",
      requirements: buildRequirementDtos(projectId, id),
    })),
    findById: vi.fn<RequirementRepository["findById"]>(async (id) =>
      id === "requirement-1" ? buildRequirementDtos()[0]! : null,
    ),
    applyEdit: vi.fn<RequirementRepository["applyEdit"]>(async (_id, edit) => ({
      ...buildRequirementDtos()[0]!,
      ...edit,
      edited: true,
    })),
    deleteById: vi.fn<RequirementRepository["deleteById"]>(async (id) => id === "requirement-1"),
    isOwnedBy: vi.fn<RequirementRepository["isOwnedBy"]>(async () => true),
    findByPersonaId: vi.fn<RequirementRepository["findByPersonaId"]>(async () =>
      buildRequirementDtos(),
    ),
  };
});

describe("RequirementService.generate", () => {
  it("returns project_not_found without calling the LLM", async () => {
    await expect(service().generate("missing", PERSONA)).resolves.toEqual({ status: "project_not_found" });
    expect(provider.complete).not.toHaveBeenCalled();
  });

  it("returns no_personas without calling the LLM (AC5.1)", async () => {
    personas = fakePersonaRepository();

    await expect(service().generate(project.id, PERSONA)).resolves.toEqual({
      status: "no_personas",
    });
    expect(provider.complete).not.toHaveBeenCalled();
  });

  it("returns persona_not_found for a persona outside the project", async () => {
    await expect(service().generate(project.id, "other")).resolves.toEqual({
      status: "persona_not_found",
    });
    expect(provider.complete).not.toHaveBeenCalled();
  });

  it("uses the selected persona, not the first one (AC12.4)", async () => {
    const other = { ...buildPersonaDto(), id: "persona-2", name: "Bruno" };
    personas = fakePersonaRepository([buildPersonaDto(), other]);

    await service().generate(project.id, "persona-2");

    expect(provider.complete.mock.calls[0]![0].prompt).toContain("Name: Bruno");
    expect(requirements.replaceAll).toHaveBeenCalledWith(
      expect.objectContaining({ id: "persona-2" }),
      buildRequirements(),
    );
  });

  it("builds the prompt from the persona currently stored (AC5.2)", async () => {
    const edited = buildPersonaDto();
    edited.problems.routineProblems = "Edited by the user in US7.";
    personas = fakePersonaRepository([edited]);

    await service().generate(project.id, PERSONA);

    const [request] = provider.complete.mock.calls[0]!;
    expect(request.prompt).toContain("Edited by the user in US7.");
    expect(request.prompt).toContain(project.description);
  });

  it("replaces the persona's requirements with the generated ones (AC5.7 / AC5.8)", async () => {
    const result = await service().generate(project.id, PERSONA);

    expect(requirements.replaceAll).toHaveBeenCalledWith(
      expect.objectContaining({ id: PERSONA, projectId: project.id }),
      buildRequirements(),
    );
    expect(result).toEqual({ status: "generated", requirements: buildRequirementDtos() });
  });

  it.each<[string, Requirement[]]>([
    ["without non-functional requirements (AC5.3)", buildRequirements().slice(0, 2)],
    [
      "with a code that does not match the type (AC5.4)",
      buildRequirements().map((r) => (r.code === "NFR1" ? { ...r, code: "FR3" } : r)),
    ],
    [
      "with duplicate codes (AC5.5)",
      buildRequirements().map((r) => (r.code === "FR2" ? { ...r, code: "FR1" } : r)),
    ],
  ])("discards a response %s and saves nothing (AC5.6)", async (_name, invalid) => {
    provider.complete.mockResolvedValue(llmRequirementsResponse(invalid));

    await expect(service().generate(project.id, PERSONA)).rejects.toBeInstanceOf(LlmUnavailableError);
    expect(requirements.replaceAll).not.toHaveBeenCalled();
  });

  it("retries an invalid response following the US1 rule (AC5.6)", async () => {
    provider.complete
      .mockResolvedValueOnce(llmRequirementsResponse(buildRequirements().slice(0, 2)))
      .mockResolvedValueOnce(llmRequirementsResponse());

    const result = await service(1).generate(project.id, PERSONA);

    expect(provider.complete).toHaveBeenCalledTimes(2);
    expect(result.status).toBe("generated");
  });

  it("keeps the previous requirements when the LLM fails (AC5.10)", async () => {
    provider.complete.mockRejectedValue(new LlmError("HTTP 401", false));

    await expect(service().generate(project.id, PERSONA)).rejects.toBeInstanceOf(LlmUnavailableError);
    expect(requirements.replaceAll).not.toHaveBeenCalled();
  });
});

describe("RequirementService.generateMore", () => {
  /** A list of the given size, as stored for the persona. */
  const stored = (count: number) =>
    Array.from({ length: count }, (_, i) => ({
      ...buildRequirementDtos()[0]!,
      id: `r-${i}`,
      code: `FR${i + 1}`,
    }));

  it("adds the validated requirements to the persona's (AC13.1)", async () => {
    const result = await service().generateMore(project.id, PERSONA);

    expect(requirements.append).toHaveBeenCalledWith(
      expect.objectContaining({ id: PERSONA, projectId: project.id }),
      buildRequirements(),
    );
    expect(requirements.replaceAll).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "generated", requirements: buildRequirementDtos() });
  });

  it("includes the existing requirements in the prompt (AC13.2)", async () => {
    await service().generateMore(project.id, PERSONA);

    const [request] = provider.complete.mock.calls[0]!;
    expect(request.prompt).toContain(buildRequirements()[0]!.description);
  });

  it.each<[string, Requirement[]]>([
    ["without non-functional requirements", buildRequirements().slice(0, 2)],
    [
      "with duplicate codes",
      buildRequirements().map((r) => (r.code === "FR2" ? { ...r, code: "FR1" } : r)),
    ],
    [
      "larger than a batch",
      Array.from({ length: 9 }, (_, i) => ({ ...buildRequirements()[0]!, code: `FR${i + 1}` })).concat(
        buildRequirements()[2]!,
      ),
    ],
  ])("saves nothing for a response %s (AC13.4)", async (_name, invalid) => {
    provider.complete.mockResolvedValue(llmRequirementsResponse(invalid));

    await expect(service().generateMore(project.id, PERSONA)).rejects.toBeInstanceOf(
      LlmUnavailableError,
    );
    expect(requirements.append).not.toHaveBeenCalled();
  });

  it("saves nothing when the LLM fails (AC13.4)", async () => {
    provider.complete.mockRejectedValue(new LlmError("HTTP 503", false));

    await expect(service().generateMore(project.id, PERSONA)).rejects.toBeInstanceOf(
      LlmUnavailableError,
    );
    expect(requirements.append).not.toHaveBeenCalled();
  });

  it("does not call the LLM when the persona has no requirements yet", async () => {
    requirements.findByPersonaId.mockResolvedValue([]);

    await expect(service().generateMore(project.id, PERSONA)).resolves.toEqual({
      status: "no_requirements",
    });
    expect(provider.complete).not.toHaveBeenCalled();
  });

  it("does not call the LLM when there is no room for another batch", async () => {
    requirements.findByPersonaId.mockResolvedValue(stored(33));

    await expect(service().generateMore(project.id, PERSONA)).resolves.toEqual({
      status: "limit_reached",
    });
    expect(provider.complete).not.toHaveBeenCalled();
  });

  it("allows the last batch, up to 40 requirements", async () => {
    requirements.findByPersonaId.mockResolvedValue(stored(32));

    await expect(service().generateMore(project.id, PERSONA)).resolves.toMatchObject({
      status: "generated",
    });
  });

  it("reports the limit when a simultaneous generation took the room", async () => {
    requirements.append.mockResolvedValue({ status: "limit_reached" });

    await expect(service().generateMore(project.id, PERSONA)).resolves.toEqual({
      status: "limit_reached",
    });
  });

  it("reports a missing project or persona", async () => {
    await expect(service().generateMore("missing", PERSONA)).resolves.toEqual({
      status: "project_not_found",
    });
    await expect(service().generateMore(project.id, "other")).resolves.toEqual({
      status: "persona_not_found",
    });
    expect(provider.complete).not.toHaveBeenCalled();
  });
});

describe("RequirementService.edit (AC14.1 / AC14.5)", () => {
  const current = buildRequirementDtos()[0]!;
  const same = {
    description: current.description,
    moscow: current.moscow,
    priority: current.priority,
    derivedFrom: current.derivedFrom,
  };

  it("saves a change and returns the edited requirement", async () => {
    const edit = { ...same, description: "New text." };

    await expect(service().edit("requirement-1", edit)).resolves.toMatchObject({
      description: "New text.",
      edited: true,
      code: current.code,
    });
    expect(requirements.applyEdit).toHaveBeenCalledWith("requirement-1", edit);
  });

  it("does not mark as edited when nothing changed", async () => {
    await expect(service().edit("requirement-1", same)).resolves.toEqual(current);
    expect(requirements.applyEdit).not.toHaveBeenCalled();
  });

  it("treats a different order of the same codes as no change", async () => {
    const edit = { ...same, derivedFrom: [...same.derivedFrom].reverse() };

    await service().edit("requirement-1", edit);

    expect(requirements.applyEdit).not.toHaveBeenCalled();
  });

  it.each([
    ["moscow", { moscow: "wont" as const }],
    ["priority", { priority: "low" as const }],
    ["derived from", { derivedFrom: ["W1" as const] }],
  ])("detects a change in %s", async (_name, change) => {
    await service().edit("requirement-1", { ...same, ...change });

    expect(requirements.applyEdit).toHaveBeenCalledTimes(1);
  });

  it("returns null for an unknown requirement", async () => {
    await expect(service().edit("missing", same)).resolves.toBeNull();
  });
});

describe("RequirementService.remove (AC14.3)", () => {
  it("reports whether the requirement existed", async () => {
    await expect(service().remove("requirement-1")).resolves.toBe(true);
    await expect(service().remove("missing")).resolves.toBe(false);
  });
});

describe("RequirementService.list", () => {
  it("returns the requirements of the selected persona (AC12.4)", async () => {
    await expect(service().list(project.id, PERSONA)).resolves.toEqual({
      status: "found",
      requirements: buildRequirementDtos(),
    });
    expect(requirements.findByPersonaId).toHaveBeenCalledWith(PERSONA);
  });

  it("reports a missing project or persona", async () => {
    await expect(service().list("missing", PERSONA)).resolves.toEqual({
      status: "project_not_found",
    });
    await expect(service().list(project.id, "other")).resolves.toEqual({
      status: "persona_not_found",
    });
    expect(requirements.findByPersonaId).not.toHaveBeenCalled();
  });
});
