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
  position,
  createdAt: new Date("2026-10-14T12:00:00.000Z"),
}));

function fakePrisma() {
  const requirement = {
    deleteMany: vi.fn(() => "deleteMany"),
    createMany: vi.fn((_args: unknown) => "createMany" as unknown),
    updateMany: vi.fn((_args: unknown) => "updateMany" as unknown),
    findMany: vi.fn(async (): Promise<unknown[]> => rows),
  };
  const tx = { requirement, $queryRaw: vi.fn(async () => []) };
  const $transaction = vi.fn(async (arg: unknown[] | ((client: typeof tx) => Promise<unknown>)) =>
    typeof arg === "function" ? arg(tx) : [{ count: 0 }, { count: rows.length }, await arg[2]],
  );
  return {
    requirement,
    tx,
    $transaction,
    prisma: { requirement, $transaction } as unknown as PrismaClient,
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
      createdAt: "2026-10-14T12:00:00.000Z",
    });
  });

  describe("append (AC13.1 / AC13.3 / AC13.5)", () => {
    const persona = { id: "persona-1", projectId: "project-1" };
    const stored = (count: number) =>
      Array.from({ length: count }, (_, i) => ({ code: `FR${i + 1}`, position: i }));

    it("continues the numbering and marks only the new ones, in one transaction", async () => {
      const { requirement, tx, $transaction, prisma } = fakePrisma();
      requirement.findMany.mockResolvedValueOnce([
        { code: "FR8", position: 7 },
        { code: "NFR2", position: 8 },
      ]);

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
      expect(result.status).toBe("appended");
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
