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
  };
  personas = fakePersonaRepository([buildPersonaDto()]);
  requirements = {
    replaceAll: vi.fn<RequirementRepository["replaceAll"]>(async ({ id, projectId }) =>
      buildRequirementDtos(projectId, id),
    ),
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
