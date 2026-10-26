import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { personaSchema, projectExportSchema, requirementSchema } from "@smartpathy/shared";
import { createApp } from "../app.js";
import { LlmService } from "../llm/llmService.js";
import type { PersonaRepository } from "../personas/persona.repository.js";
import { buildPersonaDto, project } from "../personas/persona.fixtures.js";
import type { ProjectRepository } from "../projects/project.repository.js";
import { buildRequirementDtos } from "../requirements/requirement.fixtures.js";
import type { RequirementRepository } from "../requirements/requirement.repository.js";
import { pdfPages } from "./export.fixtures.js";

let projectRepository: ProjectRepository;
let personaRepository: PersonaRepository;
let requirementRepository: RequirementRepository;

const accented = { ...project, name: "Gestão Clínica", domain: "Saúde" };

function app() {
  const llm = new LlmService({ complete: async () => "{}" });
  return createApp({ llm, projectRepository, personaRepository, requirementRepository });
}

beforeEach(() => {
  vi.useFakeTimers({ now: new Date("2026-10-26T15:30:00.000Z"), toFake: ["Date"] });
  projectRepository = {
    create: vi.fn(),
    findById: vi.fn(async (id) => (id === project.id ? accented : null)),
    listSummaries: vi.fn(),
  };
  personaRepository = {
    upsert: vi.fn(),
    findByProjectId: vi.fn(async () => buildPersonaDto()),
    updateSections: vi.fn(),
  };
  requirementRepository = {
    replaceAll: vi.fn(),
    findByProjectId: vi.fn(async () => buildRequirementDtos()),
  };
  return () => vi.useRealTimers();
});

describe("GET /projects/:id/export?format=json", () => {
  it("downloads <project-name>-<date>.json (AC9.1)", async () => {
    const res = await request(app()).get("/projects/project-1/export?format=json");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("application/json; charset=utf-8");
    expect(res.headers["content-disposition"]).toBe(
      'attachment; filename="gestao-clinica-2026-10-26.json"',
    );
  });

  it("contains project, persona, requirements and export date (AC9.2 / AC9.3)", async () => {
    const res = await request(app()).get("/projects/project-1/export?format=json");
    const file = JSON.parse(res.text);

    expect(projectExportSchema.safeParse(file).success).toBe(true);
    expect(personaSchema.safeParse(file.persona).success).toBe(true);
    expect(file.requirements.map((r: unknown) => requirementSchema.safeParse(r).success)).toEqual([
      true,
      true,
      true,
    ]);
    expect(file.exportedAt).toBe("2026-10-26T15:30:00.000Z");
    expect(file.project).toEqual({
      name: "Gestão Clínica",
      domain: "Saúde",
      description: project.description,
      additionalContext: null,
    });
  });

  it("is indented UTF-8 with the accents as they are (AC9.4)", async () => {
    const res = await request(app()).get("/projects/project-1/export?format=json");

    expect(res.text).toContain('\n  "project": {\n    "name": "Gestão Clínica"');
    expect(res.text).not.toContain("\\u00");
    expect(Buffer.from(res.text, "utf8").includes(Buffer.from("ã", "utf8"))).toBe(true);
  });
});

describe("GET /projects/:id/export?format=pdf", () => {
  it("downloads <project-name>-<date>.pdf (AC10.1)", async () => {
    const res = await request(app())
      .get("/projects/project-1/export?format=pdf")
      .buffer(true)
      .parse((response, done) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => done(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("application/pdf");
    expect(res.headers["content-disposition"]).toBe(
      'attachment; filename="gestao-clinica-2026-10-26.pdf"',
    );
    const body = res.body as Buffer;
    expect(body.subarray(0, 5).toString()).toBe("%PDF-");
    expect((await pdfPages(body)).join(" ")).toContain("Gestão Clínica");
  });
});

describe("GET /projects/:id/export errors", () => {
  it.each(["json", "pdf"])(
    "responds 409 when the project has no persona (%s) (AC9.5 / AC10.5)",
    async (format) => {
      personaRepository.findByProjectId = vi.fn(async () => null);

      const res = await request(app()).get(`/projects/project-1/export?format=${format}`);

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/persona/);
    },
  );

  it("responds 404 when the project does not exist", async () => {
    const res = await request(app()).get("/projects/missing/export?format=json");
    expect(res.status).toBe(404);
  });

  it.each(["", "?format=xml", "?format=json&format=pdf"])(
    "responds 400 for an unsupported format (%s)",
    async (query) => {
      const res = await request(app()).get(`/projects/project-1/export${query}`);
      expect(res.status).toBe(400);
    },
  );
});
