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
  /** Swaps all of the persona's requirements in a single transaction (AC5.7 / AC5.8 / AC12.4). Sorted by code. */
  replaceAll(
    persona: { id: string; projectId: string },
    requirements: Requirement[],
  ): Promise<RequirementDto[]>;
  /** Sorted by code: FR before NFR, then numerically (AC6.5). */
  findByPersonaId(personaId: string): Promise<RequirementDto[]>;
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
    personaId: row.personaId,
    createdAt: row.createdAt.toISOString(),
  };
}

export function createRequirementRepository(
  prisma: PrismaClient,
): RequirementRepository {
  const byPosition = (personaId: string) =>
    prisma.requirement.findMany({
      where: { personaId },
      orderBy: { position: "asc" },
    });

  return {
    async replaceAll({ id: personaId, projectId }, requirements) {
      // Either all are saved, or none (the old ones stay intact).
      const [, , rows] = await prisma.$transaction([
        prisma.requirement.deleteMany({ where: { personaId } }),
        prisma.requirement.createMany({
          data: requirements.map((req, position) => ({
            projectId,
            personaId,
            position,
            code: req.code,
            type: req.type,
            description: req.description,
            moscow: req.moscow,
            priority: req.priority,
            derivedFrom: req.derivedFrom,
          })),
        }),
        byPosition(personaId),
      ]);
      return sortedDtos(rows);
    },
    async findByPersonaId(personaId) {
      return sortedDtos(await byPosition(personaId));
    },
  };
}
