import {
  requirementSchema,
  type Requirement,
  type RequirementDto,
} from "@smartpathy/shared";
import type {
  PrismaClient,
  Requirement as RequirementRow,
} from "../generated/prisma/client.js";

export interface RequirementRepository {
  /** Swaps all of the project's requirements in a single transaction (AC5.7 / AC5.8). */
  replaceAll(projectId: string, requirements: Requirement[]): Promise<RequirementDto[]>;
  /** In the order PATHY4RE generated them. */
  findByProjectId(projectId: string): Promise<RequirementDto[]>;
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
      return rows.map(toDto);
    },
    async findByProjectId(projectId) {
      return (await byPosition(projectId)).map(toDto);
    },
  };
}
