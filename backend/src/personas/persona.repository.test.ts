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
    create: vi.fn(async () => row),
    update: vi.fn(async () => row),
    delete: vi.fn(async () => row),
    findFirst: vi.fn(async (): Promise<typeof row | null> => row),
    findMany: vi.fn(async (): Promise<unknown[]> => [row]),
  };
  const $queryRaw = vi.fn(async () => []);
  const tx = { persona, $queryRaw };
  const $transaction = vi.fn(async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx));
  return { persona, $queryRaw, $transaction, prisma: { persona, $transaction } as unknown as PrismaClient };
}

describe("createPersonaRepository", () => {
  it("adds a persona to the project and returns a DTO (AC3.6 / AC12.2)", async () => {
    const { persona, prisma } = fakePrisma();
    const { who } = buildPersona();

    const saved = await createPersonaRepository(prisma).create("project-1", buildPersona());

    expect(persona.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ projectId: "project-1", name: "Maria", who }),
    });
    expect(saved).toEqual({
      ...buildPersona(),
      id: "persona-1",
      projectId: "project-1",
      createdAt: "2026-10-12T12:00:00.000Z",
      updatedAt: "2026-10-12T13:00:00.000Z",
    });
  });

  it("lists the project's personas, oldest first (AC12.3)", async () => {
    const { persona, prisma } = fakePrisma();

    const found = await createPersonaRepository(prisma).listByProjectId("project-1");

    expect(persona.findMany).toHaveBeenCalledWith({
      where: { projectId: "project-1" },
      orderBy: { createdAt: "asc" },
    });
    expect(found.map(({ id }) => id)).toEqual(["persona-1"]);
  });

  it("only finds a persona inside its own project", async () => {
    const { persona, prisma } = fakePrisma();

    const found = await createPersonaRepository(prisma).findById("project-1", "persona-1");

    expect(persona.findFirst).toHaveBeenCalledWith({
      where: { id: "persona-1", projectId: "project-1" },
    });
    expect(found?.id).toBe("persona-1");
  });

  it("returns null when the persona is not in the project", async () => {
    const { persona, prisma } = fakePrisma();
    persona.findFirst.mockResolvedValueOnce(null);

    await expect(
      createPersonaRepository(prisma).findById("project-1", "other"),
    ).resolves.toBeNull();
  });

  it("replaces only the five PATHY sections of the persona (AC7.3)", async () => {
    const { persona, prisma } = fakePrisma();

    const saved = await createPersonaRepository(prisma).updateSections("persona-1", buildSections());

    expect(persona.update).toHaveBeenCalledWith({
      where: { id: "persona-1" },
      data: buildSections(),
    });
    expect(saved.id).toBe("persona-1");
  });

  describe("deleteUnlessLast (AC12.5)", () => {
    it("deletes a persona when others remain, locking the project first", async () => {
      const { persona, $queryRaw, prisma } = fakePrisma();
      persona.findMany.mockResolvedValueOnce([{ id: "persona-1" }, { id: "persona-2" }]);

      await expect(
        createPersonaRepository(prisma).deleteUnlessLast("project-1", "persona-2"),
      ).resolves.toBe("deleted");

      expect($queryRaw).toHaveBeenCalledTimes(1);
      expect(persona.delete).toHaveBeenCalledWith({ where: { id: "persona-2" } });
    });

    it("blocks deleting the last persona", async () => {
      const { persona, prisma } = fakePrisma();
      persona.findMany.mockResolvedValueOnce([{ id: "persona-1" }]);

      await expect(
        createPersonaRepository(prisma).deleteUnlessLast("project-1", "persona-1"),
      ).resolves.toBe("last_persona");

      expect(persona.delete).not.toHaveBeenCalled();
    });

    it("reports a persona that is not in the project", async () => {
      const { persona, prisma } = fakePrisma();
      persona.findMany.mockResolvedValueOnce([{ id: "persona-1" }, { id: "persona-2" }]);

      await expect(
        createPersonaRepository(prisma).deleteUnlessLast("project-1", "other"),
      ).resolves.toBe("persona_not_found");

      expect(persona.delete).not.toHaveBeenCalled();
    });
  });
});
