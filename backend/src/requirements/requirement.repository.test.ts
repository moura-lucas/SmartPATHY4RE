import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../generated/prisma/client.js";
import { buildRequirements } from "./requirement.fixtures.js";
import { createRequirementRepository } from "./requirement.repository.js";

const rows = buildRequirements().map((req, position) => ({
  ...req,
  id: `requirement-${position + 1}`,
  projectId: "project-1",
  position,
  createdAt: new Date("2026-10-14T12:00:00.000Z"),
}));

function fakePrisma() {
  const requirement = {
    deleteMany: vi.fn(() => "deleteMany"),
    createMany: vi.fn(() => "createMany"),
    findMany: vi.fn(async () => rows),
  };
  const $transaction = vi.fn(async (ops: unknown[]) => [
    { count: 0 },
    { count: rows.length },
    await ops[2],
  ]);
  return {
    requirement,
    $transaction,
    prisma: { requirement, $transaction } as unknown as PrismaClient,
  };
}

describe("createRequirementRepository", () => {
  it("swaps the project's requirements in a single transaction (AC5.7 / AC5.8)", async () => {
    const { requirement, $transaction, prisma } = fakePrisma();

    const saved = await createRequirementRepository(prisma).replaceAll(
      "project-1",
      buildRequirements(),
    );

    expect($transaction).toHaveBeenCalledTimes(1);
    expect(requirement.deleteMany).toHaveBeenCalledWith({ where: { projectId: "project-1" } });
    expect(requirement.createMany).toHaveBeenCalledWith({
      data: buildRequirements().map((req, position) => ({
        projectId: "project-1",
        position,
        ...req,
      })),
    });
    expect(saved).toHaveLength(3);
    expect(saved[0]).toEqual({
      ...buildRequirements()[0],
      id: "requirement-1",
      projectId: "project-1",
      createdAt: "2026-10-14T12:00:00.000Z",
    });
  });

  it("lists the requirements in generation order", async () => {
    const { requirement, prisma } = fakePrisma();

    const found = await createRequirementRepository(prisma).findByProjectId("project-1");

    expect(requirement.findMany).toHaveBeenCalledWith({
      where: { projectId: "project-1" },
      orderBy: { position: "asc" },
    });
    expect(found.map((r) => r.code)).toEqual(["FR1", "FR2", "NFR1"]);
  });
});
