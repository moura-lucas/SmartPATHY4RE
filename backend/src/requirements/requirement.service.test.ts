import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PersonaDto, Requirement } from "@smartpathy/shared";
import { LlmError, LlmUnavailableError } from "../llm/errors.js";
import { LlmService } from "../llm/llmService.js";
import type { LlmProvider } from "../llm/provider.js";
import { buildPersonaDto, project } from "../personas/persona.fixtures.js";
import type { PersonaRepository } from "../personas/persona.repository.js";
import type { ProjectRepository } from "../projects/project.repository.js";
import {
  buildRequirementDtos,
  buildRequirements,
  llmRequirementsResponse,
} from "./requirement.fixtures.js";
import type { RequirementRepository } from "./requirement.repository.js";
import { createRequirementService } from "./requirement.service.js";

let provider: { complete: ReturnType<typeof vi.fn<LlmProvider["complete"]>> };
let projects: ProjectRepository;
let personas: PersonaRepository;
let requirements: {
  replaceAll: ReturnType<typeof vi.fn<RequirementRepository["replaceAll"]>>;
  findByProjectId: ReturnType<typeof vi.fn<RequirementRepository["findByProjectId"]>>;
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
  };
  personas = {
    upsert: vi.fn(),
    findByProjectId: vi.fn(async (): Promise<PersonaDto | null> => buildPersonaDto()),
    updateSections: vi.fn(),
  };
  requirements = {
    replaceAll: vi.fn<RequirementRepository["replaceAll"]>(async (projectId) =>
      buildRequirementDtos(projectId),
    ),
    findByProjectId: vi.fn<RequirementRepository["findByProjectId"]>(async () =>
      buildRequirementDtos(),
    ),
  };
});

describe("RequirementService.generate", () => {
  it("returns project_not_found without calling the LLM", async () => {
    await expect(service().generate("missing")).resolves.toEqual({ status: "project_not_found" });
    expect(provider.complete).not.toHaveBeenCalled();
  });

  it("returns persona_missing without calling the LLM (AC5.1)", async () => {
    personas.findByProjectId = vi.fn(async () => null);

    await expect(service().generate(project.id)).resolves.toEqual({ status: "persona_missing" });
    expect(provider.complete).not.toHaveBeenCalled();
  });

  it("builds the prompt from the persona currently stored (AC5.2)", async () => {
    const edited = buildPersonaDto();
    edited.problems.routineProblems = "Edited by the user in US7.";
    personas.findByProjectId = vi.fn(async () => edited);

    await service().generate(project.id);

    const [request] = provider.complete.mock.calls[0]!;
    expect(request.prompt).toContain("Edited by the user in US7.");
    expect(request.prompt).toContain(project.description);
  });

  it("replaces the project's requirements with the generated ones (AC5.7 / AC5.8)", async () => {
    const result = await service().generate(project.id);

    expect(requirements.replaceAll).toHaveBeenCalledWith(project.id, buildRequirements());
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

    await expect(service().generate(project.id)).rejects.toBeInstanceOf(LlmUnavailableError);
    expect(requirements.replaceAll).not.toHaveBeenCalled();
  });

  it("retries an invalid response following the US1 rule (AC5.6)", async () => {
    provider.complete
      .mockResolvedValueOnce(llmRequirementsResponse(buildRequirements().slice(0, 2)))
      .mockResolvedValueOnce(llmRequirementsResponse());

    const result = await service(1).generate(project.id);

    expect(provider.complete).toHaveBeenCalledTimes(2);
    expect(result.status).toBe("generated");
  });

  it("keeps the previous requirements when the LLM fails (AC5.10)", async () => {
    provider.complete.mockRejectedValue(new LlmError("HTTP 401", false));

    await expect(service().generate(project.id)).rejects.toBeInstanceOf(LlmUnavailableError);
    expect(requirements.replaceAll).not.toHaveBeenCalled();
  });
});

describe("RequirementService.list", () => {
  it("returns the project's requirements", async () => {
    await expect(service().list(project.id)).resolves.toEqual(buildRequirementDtos());
    expect(requirements.findByProjectId).toHaveBeenCalledWith(project.id);
  });

  it("returns null when the project does not exist", async () => {
    await expect(service().list("missing")).resolves.toBeNull();
    expect(requirements.findByProjectId).not.toHaveBeenCalled();
  });
});
