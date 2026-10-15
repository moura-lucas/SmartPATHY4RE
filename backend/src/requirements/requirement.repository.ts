import {
  compareRequirementCodes,
  requirementSchema,
  type Requirement,
  type RequirementDto,
} from "@smartpathy/shared";
import type {
  PrismaClient,
  Requirement as RequirementRow,
} from "../generated/prisma/client.js";

export interface RequirementRepository {
  /** Swaps all of the project's requirements in a single transaction (AC5.7 / AC5.8). Sorted by code. */
  replaceAll(projectId: string, requirements: Requirement[]): Promise<RequirementDto[]>;
  /** Sorted by code: FR before NFR, then numerically (AC6.5). */
  findByProjectId(projectId: string): Promise<RequirementDto[]>;
}

// The numeric order of codes (FR2 before FR10) cannot be expressed in SQL on a string column.
function sortedDtos(rows: RequirementRow[]): RequirementDto[] {
  return rows.map(toDto).sort((a, b) => compareRequirementCodes(a.code, b.code));
}

function toDto(row: RequirementRow): RequirementDto {
  // derivedFrom comes back as JsonValue: Zod validates and types it.
  const requirement = requirementSchema.parse(row);
  return {
    ...requirement,
    id: row.id,
    projectId: row.projectId,
    createdAt: row.createdAt.toISOString(),
  };
}

export function createRequirementRepository(
  prisma: PrismaClient,
): RequirementRepository {
  const byPosition = (projectId: string) =>
    prisma.requirement.findMany({
      where: { projectId },
      orderBy: { position: "asc" },
    });

  return {
    async replaceAll(projectId, requirements) {
      // Either all are saved, or none (the old ones stay intact).
      const [, , rows] = await prisma.$transaction([
        prisma.requirement.deleteMany({ where: { projectId } }),
        prisma.requirement.createMany({
          data: requirements.map((req, position) => ({
            projectId,
            position,
            code: req.code,
            type: req.type,
            description: req.description,
            moscow: req.moscow,
            priority: req.priority,
            derivedFrom: req.derivedFrom,
          })),
        }),
        byPosition(projectId),
      ]);
      return sortedDtos(rows);
    },
    async findByProjectId(projectId) {
      return sortedDtos(await byPosition(projectId));
    },
  };
}
