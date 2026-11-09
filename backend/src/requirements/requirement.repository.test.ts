import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../generated/prisma/client.js";
import { buildRequirements } from "./requirement.fixtures.js";
import { createRequirementRepository } from "./requirement.repository.js";

const rows = buildRequirements().map((req, position) => ({
  ...req,
  id: `requirement-${position + 1}`,
  projectId: "project-1",
  personaId: "persona-1",
  isNew: false,
  edited: false,
  position,
  createdAt: new Date("2026-10-14T12:00:00.000Z"),
}));

function fakePrisma() {
  const requirement = {
    createMany: vi.fn((_args: unknown) => "createMany" as unknown),
    updateMany: vi.fn((_args: unknown) => "updateMany" as unknown),
    findMany: vi.fn(async (): Promise<unknown[]> => rows),
    findUnique: vi.fn(async (): Promise<unknown> => rows[0]),
    update: vi.fn(async (_args: unknown): Promise<unknown> => ({ ...rows[0], edited: true })),
    deleteMany: vi.fn(async (): Promise<unknown> => ({ count: 1 })),
    count: vi.fn(async () => 1),
  };
  const persona = {
    findUniqueOrThrow: vi.fn(async () => ({ lastFunctionalNumber: 8, lastNonFunctionalNumber: 2 })),
  };
  const $executeRaw = vi.fn(async () => 1);
  const tx = { requirement, persona, $executeRaw, $queryRaw: vi.fn(async () => []) };
  const $transaction = vi.fn(async (arg: unknown[] | ((client: typeof tx) => Promise<unknown>)) =>
    typeof arg === "function" ? arg(tx) : [{ count: 0 }, { count: rows.length }, 1, await arg[3]],
  );
  return {
    requirement,
    persona,
    $executeRaw,
    tx,
    $transaction,
    prisma: { requirement, $transaction, $executeRaw } as unknown as PrismaClient,
  };
}

describe("createRequirementRepository", () => {
  it("swaps only the persona's requirements in a single transaction (AC5.7 / AC5.8 / AC12.4)", async () => {
    const { requirement, $transaction, prisma } = fakePrisma();

    const saved = await createRequirementRepository(prisma).replaceAll(
      { id: "persona-1", projectId: "project-1" },
      buildRequirements(),
    );

    expect($transaction).toHaveBeenCalledTimes(1);
    expect(requirement.deleteMany).toHaveBeenCalledWith({ where: { personaId: "persona-1" } });
    expect(requirement.createMany).toHaveBeenCalledWith({
      data: buildRequirements().map((req, position) => ({
        projectId: "project-1",
        personaId: "persona-1",
        position,
        ...req,
      })),
    });
    expect(saved).toHaveLength(3);
    expect(saved[0]).toEqual({
      ...buildRequirements()[0],
      id: "requirement-1",
      projectId: "project-1",
      personaId: "persona-1",
      isNew: false,
      edited: false,
      createdAt: "2026-10-14T12:00:00.000Z",
    });
  });

  describe("append (AC13.1 / AC13.3 / AC13.5)", () => {
    const persona = { id: "persona-1", projectId: "project-1" };
    const stored = (count: number) =>
      Array.from({ length: count }, (_, i) => ({ position: i }));

    it("continues the numbering and marks only the new ones, in one transaction", async () => {
      const { requirement, tx, $transaction, prisma } = fakePrisma();
      requirement.findMany.mockResolvedValueOnce([{ position: 7 }, { position: 8 }]);

      const result = await createRequirementRepository(prisma).append(persona, buildRequirements());

      expect($transaction).toHaveBeenCalledTimes(1);
      expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
      expect(requirement.updateMany).toHaveBeenCalledWith({
        where: { personaId: "persona-1", isNew: true },
        data: { isNew: false },
      });
      const { data } = requirement.createMany.mock.calls[0]![0] as {
        data: { code: string; position: number; isNew: boolean }[];
      };
      expect(data.map((r) => r.code)).toEqual(["FR9", "FR10", "NFR3"]);
      expect(data.map((r) => r.position)).toEqual([9, 10, 11]);
      expect(data.every((r) => r.isNew)).toBe(true);
      expect(requirement.deleteMany).not.toHaveBeenCalled();
      expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
      expect(result.status).toBe("appended");
    });

    it("uses the highest numbers ever used, not the highest code left (AC14.4)", async () => {
      const { requirement, persona: personaTable, prisma } = fakePrisma();
      personaTable.findUniqueOrThrow.mockResolvedValueOnce({
        lastFunctionalNumber: 12,
        lastNonFunctionalNumber: 5,
      });
      requirement.findMany.mockResolvedValueOnce([{ position: 0 }]);

      await createRequirementRepository(prisma).append(persona, buildRequirements());

      const { data } = requirement.createMany.mock.calls[0]![0] as { data: { code: string }[] };
      expect(data.map((r) => r.code)).toEqual(["FR13", "FR14", "NFR6"]);
    });

    it("refuses a batch that would pass the limit, changing nothing", async () => {
      const { requirement, prisma } = fakePrisma();
      requirement.findMany.mockResolvedValueOnce(stored(38));

      await expect(
        createRequirementRepository(prisma).append(persona, buildRequirements()),
      ).resolves.toEqual({ status: "limit_reached" });

      expect(requirement.updateMany).not.toHaveBeenCalled();
      expect(requirement.createMany).not.toHaveBeenCalled();
    });
  });

  it("checks a requirement against the owner of its project (AC18.4)", async () => {
    const { requirement, prisma } = fakePrisma();

    await expect(createRequirementRepository(prisma).isOwnedBy("r1", "user-1")).resolves.toBe(true);
    expect(requirement.count).toHaveBeenCalledWith({
      where: { id: "r1", project: { userId: "user-1" } },
    });
  });

  describe("edit and delete (US14)", () => {
    const edit = {
      description: "New text.",
      moscow: "could" as const,
      priority: "low" as const,
      derivedFrom: ["C1" as const],
    };

    it("finds a requirement by id", async () => {
      const { requirement, prisma } = fakePrisma();

      const found = await createRequirementRepository(prisma).findById("requirement-1");

      expect(requirement.findUnique).toHaveBeenCalledWith({ where: { id: "requirement-1" } });
      expect(found?.code).toBe("FR1");
    });

    it("returns null for an unknown id", async () => {
      const { requirement, prisma } = fakePrisma();
      requirement.findUnique.mockResolvedValueOnce(null);

      await expect(createRequirementRepository(prisma).findById("x")).resolves.toBeNull();
    });

    it("saves the changes and marks it as edited, never touching code or type (AC14.1 / AC14.5)", async () => {
      const { requirement, prisma } = fakePrisma();

      const saved = await createRequirementRepository(prisma).applyEdit("requirement-1", edit);

      expect(requirement.update).toHaveBeenCalledWith({
        where: { id: "requirement-1" },
        data: { ...edit, edited: true },
      });
      expect(saved.edited).toBe(true);
    });

    it("deletes only that requirement (AC14.3 / AC14.4)", async () => {
      const { requirement, prisma } = fakePrisma();

      await expect(createRequirementRepository(prisma).deleteById("requirement-1")).resolves.toBe(true);
      expect(requirement.deleteMany).toHaveBeenCalledWith({ where: { id: "requirement-1" } });
      expect(requirement.update).not.toHaveBeenCalled();
    });

    it("reports a requirement that no longer exists", async () => {
      const { requirement, prisma } = fakePrisma();
      requirement.deleteMany.mockResolvedValueOnce({ count: 0 });

      await expect(createRequirementRepository(prisma).deleteById("x")).resolves.toBe(false);
    });
  });

  it("lists the requirements sorted numerically by code (AC6.5)", async () => {
    const { requirement, prisma } = fakePrisma();
    const [fr1, , nfr1] = rows;
    requirement.findMany.mockResolvedValueOnce([
      { ...nfr1!, id: "nfr1", code: "NFR1" },
      { ...fr1!, id: "fr10", code: "FR10", position: 0 },
      { ...fr1!, id: "fr2", code: "FR2", position: 1 },
    ]);

    const found = await createRequirementRepository(prisma).findByPersonaId("persona-1");

    expect(found.map((r) => r.code)).toEqual(["FR2", "FR10", "NFR1"]);
  });

  it("queries only the persona's requirements (AC12.4)", async () => {
    const { requirement, prisma } = fakePrisma();

    const found = await createRequirementRepository(prisma).findByPersonaId("persona-1");

    expect(requirement.findMany).toHaveBeenCalledWith({
      where: { personaId: "persona-1" },
      orderBy: { position: "asc" },
    });
    expect(found.map((r) => r.code)).toEqual(["FR1", "FR2", "NFR1"]);
  });
});
