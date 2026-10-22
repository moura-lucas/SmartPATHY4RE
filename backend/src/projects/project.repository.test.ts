import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../generated/prisma/client.js";
import { createProjectRepository } from "./project.repository.js";

const row = {
  id: "project-1",
  name: "Clinic App",
  domain: "Healthcare",
  description: "App for nurses.",
  additionalContext: null,
  personaName: null,
  personaAge: null,
  techExperienceLevel: "low",
  createdAt: new Date("2026-10-09T12:00:00.000Z"),
};

function fakePrisma() {
  const project = {
    create: vi.fn(async () => row),
    findUnique: vi.fn(async (): Promise<typeof row | null> => row),
    findMany: vi.fn(async () => [
      { ...row, id: "project-2", persona: { id: "persona-2" }, _count: { requirements: 16 } },
      { ...row, id: "project-3", persona: { id: "persona-3" }, _count: { requirements: 0 } },
      { ...row, persona: null, _count: { requirements: 0 } },
    ]),
  };
  return { project, prisma: { project } as unknown as PrismaClient };
}

describe("createProjectRepository", () => {
  it("stores absent optional fields as null and returns a DTO", async () => {
    const { project, prisma } = fakePrisma();

    const created = await createProjectRepository(prisma).create({
      name: "Clinic App",
      domain: "Healthcare",
      description: "App for nurses.",
      additionalContext: undefined,
      personaName: undefined,
      techExperienceLevel: "low",
    });

    expect(project.create).toHaveBeenCalledWith({
      data: {
        name: "Clinic App",
        domain: "Healthcare",
        description: "App for nurses.",
        additionalContext: null,
        personaName: null,
        personaAge: null,
        techExperienceLevel: "low",
      },
    });
    expect(created).toEqual({ ...row, createdAt: "2026-10-09T12:00:00.000Z" });
  });

  it("finds a project by id", async () => {
    const { project, prisma } = fakePrisma();

    const found = await createProjectRepository(prisma).findById("project-1");

    expect(project.findUnique).toHaveBeenCalledWith({ where: { id: "project-1" } });
    expect(found?.createdAt).toBe("2026-10-09T12:00:00.000Z");
  });

  it("returns null when the project does not exist", async () => {
    const { project, prisma } = fakePrisma();
    project.findUnique.mockResolvedValueOnce(null);

    expect(await createProjectRepository(prisma).findById("missing")).toBeNull();
  });

  it("lists the projects newest first with their progress (AC8.1)", async () => {
    const { project, prisma } = fakePrisma();

    const summaries = await createProjectRepository(prisma).listSummaries();

    expect(project.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
      include: {
        persona: { select: { id: true } },
        _count: { select: { requirements: true } },
      },
    });
    const progress = summaries.map(({ id, hasPersona, requirementsCount, stage }) => ({
      id,
      hasPersona,
      requirementsCount,
      stage,
    }));
    expect(progress).toEqual([
      { id: "project-2", hasPersona: true, requirementsCount: 16, stage: "requirements_generated" },
      { id: "project-3", hasPersona: true, requirementsCount: 0, stage: "persona_generated" },
      { id: "project-1", hasPersona: false, requirementsCount: 0, stage: "created" },
    ]);
    expect(summaries[0]).toMatchObject({ name: "Clinic App", createdAt: "2026-10-09T12:00:00.000Z" });
    expect(summaries[0]).not.toHaveProperty("_count");
    expect(summaries[0]).not.toHaveProperty("persona");
  });
});
