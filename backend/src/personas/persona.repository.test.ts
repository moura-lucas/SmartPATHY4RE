import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../generated/prisma/client.js";
import { buildPersona, buildSections } from "./persona.fixtures.js";
import { createPersonaRepository } from "./persona.repository.js";

const row = {
  id: "persona-1",
  projectId: "project-1",
  ...buildPersona(),
  createdAt: new Date("2026-10-12T12:00:00.000Z"),
  updatedAt: new Date("2026-10-12T13:00:00.000Z"),
};

function fakePrisma() {
  const persona = {
    upsert: vi.fn(async () => row),
    update: vi.fn(async () => row),
    findUnique: vi.fn(async (): Promise<typeof row | null> => row),
  };
  return { persona, prisma: { persona } as unknown as PrismaClient };
}

describe("createPersonaRepository", () => {
  it("creates or replaces the project's persona and returns a DTO (AC3.6)", async () => {
    const { persona, prisma } = fakePrisma();
    const { who } = buildPersona();

    const saved = await createPersonaRepository(prisma).upsert("project-1", buildPersona());

    expect(persona.upsert).toHaveBeenCalledWith({
      where: { projectId: "project-1" },
      create: expect.objectContaining({ projectId: "project-1", name: "Maria", who }),
      update: expect.objectContaining({ name: "Maria", techExperienceLevel: "low", who }),
    });
    expect(saved).toEqual({
      ...buildPersona(),
      id: "persona-1",
      projectId: "project-1",
      createdAt: "2026-10-12T12:00:00.000Z",
      updatedAt: "2026-10-12T13:00:00.000Z",
    });
  });

  it("finds the persona by project", async () => {
    const { persona, prisma } = fakePrisma();

    const found = await createPersonaRepository(prisma).findByProjectId("project-1");

    expect(persona.findUnique).toHaveBeenCalledWith({ where: { projectId: "project-1" } });
    expect(found?.id).toBe("persona-1");
  });

  it("returns null when the project has no persona", async () => {
    const { persona, prisma } = fakePrisma();
    persona.findUnique.mockResolvedValueOnce(null);

    await expect(
      createPersonaRepository(prisma).findByProjectId("project-1"),
    ).resolves.toBeNull();
  });

  it("replaces only the five PATHY sections of the persona (AC7.3)", async () => {
    const { persona, prisma } = fakePrisma();

    const saved = await createPersonaRepository(prisma).updateSections("project-1", buildSections());

    expect(persona.update).toHaveBeenCalledWith({
      where: { projectId: "project-1" },
      data: buildSections(),
    });
    expect(saved.id).toBe("persona-1");
  });
});
