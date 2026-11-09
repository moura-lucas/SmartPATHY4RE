import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  EXPORT_CONTENTS,
  personaSchema,
  requirementSchema,
  type ExportSelection,
} from "@smartpathy/shared";
import type { PersonaRepository } from "../personas/persona.repository.js";
import {
  buildPersona,
  buildPersonaDto,
  fakePersonaRepository,
  project,
} from "../personas/persona.fixtures.js";
import type { ProjectRepository } from "../projects/project.repository.js";
import { buildRequirementDtos } from "../requirements/requirement.fixtures.js";
import type { RequirementRepository } from "../requirements/requirement.repository.js";
import { buildExportedPersona, EXPORTED_AT } from "./export.fixtures.js";
import { createExportService } from "./export.service.js";

let projects: ProjectRepository;
let personas: PersonaRepository;
let requirements: RequirementRepository;

const everything: ExportSelection = { personas: undefined, include: [...EXPORT_CONTENTS] };
const bruno = { ...buildPersonaDto(), id: "persona-2", name: "Bruno" };

function service() {
  return createExportService({
    projects,
    personas,
    requirements,
    now: () => new Date(EXPORTED_AT),
  });
}

beforeEach(() => {
  projects = {
    create: vi.fn(),
    findById: vi.fn(async (id) => (id === project.id ? project : null)),
    listSummaries: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };
  personas = fakePersonaRepository([buildPersonaDto()]);
  requirements = {
    replaceAll: vi.fn(),
    append: vi.fn(),
    findById: vi.fn(),
    applyEdit: vi.fn(),
    deleteById: vi.fn(),
    findByPersonaId: vi.fn(async () => buildRequirementDtos()),
  };
});

async function ready(selection: ExportSelection) {
  const result = await service().load(project.id, selection);
  if (result.status !== "ready") throw new Error(result.status);
  return result.data;
}

describe("ExportService.load", () => {
  it("gathers project, personas and the export date (AC9.2)", async () => {
    await expect(service().load(project.id, everything)).resolves.toEqual({
      status: "ready",
      data: {
        exportedAt: EXPORTED_AT,
        project: {
          name: project.name,
          domain: project.domain,
          description: project.description,
          additionalContext: null,
        },
        personas: [buildExportedPersona()],
      },
    });
  });

  it("exports only what the shared schemas describe (AC9.3)", async () => {
    const data = await ready(everything);
    const [persona] = data.personas;

    expect(persona!.profile).toEqual(buildPersona());
    expect(personaSchema.safeParse(persona!.profile).success).toBe(true);
    for (const req of persona!.functionalRequirements!) {
      expect(req).not.toHaveProperty("id");
      expect(requirementSchema.safeParse(req).success).toBe(true);
    }
  });

  it("includes all personas by default", async () => {
    personas = fakePersonaRepository([buildPersonaDto(), bruno]);

    const data = await ready(everything);

    expect(data.personas.map(({ name }) => name)).toEqual(["Maria", "Bruno"]);
  });

  it("includes only the chosen personas, in the project's order (AC15.2)", async () => {
    personas = fakePersonaRepository([buildPersonaDto(), bruno]);

    const data = await ready({ ...everything, personas: ["persona-2"] });

    expect(data.personas.map(({ name }) => name)).toEqual(["Bruno"]);
    expect(requirements.findByPersonaId).toHaveBeenCalledWith("persona-2");
    expect(requirements.findByPersonaId).not.toHaveBeenCalledWith("persona-1");
  });

  it("omits the deselected sections instead of sending them empty (AC15.5)", async () => {
    const data = await ready({ personas: undefined, include: ["functional"] });
    const [persona] = data.personas;

    expect(persona).not.toHaveProperty("profile");
    expect(persona).not.toHaveProperty("nonFunctionalRequirements");
    expect(persona!.name).toBe("Maria");
    expect(persona!.functionalRequirements!.map(({ code }) => code)).toEqual(["FR1", "FR2"]);
  });

  it("sends a selected section that has no content as empty", async () => {
    requirements.findByPersonaId = vi.fn(async () => []);

    const data = await ready(everything);

    expect(data.personas[0]).toMatchObject({
      functionalRequirements: [],
      nonFunctionalRequirements: [],
    });
  });

  it("refuses a selection with no items to export (AC15.4)", async () => {
    requirements.findByPersonaId = vi.fn(async () => []);

    await expect(
      service().load(project.id, { personas: undefined, include: ["functional"] }),
    ).resolves.toEqual({ status: "nothing_to_export" });
  });

  it("reports a missing persona or project (AC9.5 / AC10.5)", async () => {
    personas = fakePersonaRepository();
    await expect(service().load(project.id, everything)).resolves.toEqual({
      status: "persona_missing",
    });
    await expect(service().load("missing", everything)).resolves.toEqual({
      status: "project_not_found",
    });
  });

  it("reports a chosen persona that is not in the project", async () => {
    await expect(
      service().load(project.id, { ...everything, personas: ["persona-1", "other"] }),
    ).resolves.toEqual({ status: "persona_not_found" });
  });

  it("says which requirements the user edited (AC14.5)", async () => {
    const [first, ...others] = buildRequirementDtos();
    requirements.findByPersonaId = vi.fn(async () => [{ ...first!, edited: true }, ...others]);

    const data = await ready(everything);

    expect(data.personas[0]!.functionalRequirements!.map(({ edited }) => edited)).toEqual([
      true,
      false,
    ]);
  });
});
