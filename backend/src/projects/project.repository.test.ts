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
    updateMany: vi.fn(async () => ({ count: 1 })),
    findMany: vi.fn(async () => [
      { ...row, id: "project-2", _count: { personas: 2, requirements: 16 } },
      { ...row, id: "project-3", _count: { personas: 1, requirements: 0 } },
      { ...row, _count: { personas: 0, requirements: 0 } },
    ]),
  };
  const requirement = { deleteMany: vi.fn(() => "requirements") };
  const persona = { deleteMany: vi.fn(() => "personas") };
  Object.assign(project, { deleteMany: vi.fn(() => "project") });
  const $transaction = vi.fn(async (_ops: unknown[]) => [
    { count: 16 },
    { count: 2 },
    { count: 1 },
  ]);
  return {
    project: project as typeof project & { deleteMany: ReturnType<typeof vi.fn> },
    requirement,
    persona,
    $transaction,
    prisma: { project, requirement, persona, $transaction } as unknown as PrismaClient,
  };
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
        _count: { select: { personas: true, requirements: true } },
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
  });
});

describe("createProjectRepository: editing and deleting (US17)", () => {
  const input = {
    name: "New name",
    domain: "Education",
    description: "New description.",
    additionalContext: undefined,
  };

  it("changes only the editable fields, clearing an absent context (AC17.1)", async () => {
    const { project, prisma } = fakePrisma();

    const updated = await createProjectRepository(prisma).update("project-1", input);

    expect(project.updateMany).toHaveBeenCalledWith({
      where: { id: "project-1" },
      data: { name: "New name", domain: "Education", description: "New description.", additionalContext: null },
    });
    expect(updated?.id).toBe("project-1");
  });

  it("returns null when the project does not exist", async () => {
    const { project, prisma } = fakePrisma();
    project.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(createProjectRepository(prisma).update("missing", input)).resolves.toBeNull();
  });

  it("removes requirements, personas and project in one transaction (AC17.4)", async () => {
    const { project, requirement, persona, $transaction, prisma } = fakePrisma();

    await expect(createProjectRepository(prisma).remove("project-1")).resolves.toBe(true);

    expect($transaction).toHaveBeenCalledTimes(1);
    expect($transaction.mock.calls[0]![0]).toEqual(["requirements", "personas", "project"]);
    expect(requirement.deleteMany).toHaveBeenCalledWith({ where: { projectId: "project-1" } });
    expect(persona.deleteMany).toHaveBeenCalledWith({ where: { projectId: "project-1" } });
    expect(project.deleteMany).toHaveBeenCalledWith({ where: { id: "project-1" } });
  });

  it("reports a project that does not exist", async () => {
    const { $transaction, prisma } = fakePrisma();
    $transaction.mockResolvedValueOnce([{ count: 0 }, { count: 0 }, { count: 0 }]);

    await expect(createProjectRepository(prisma).remove("missing")).resolves.toBe(false);
  });
});
