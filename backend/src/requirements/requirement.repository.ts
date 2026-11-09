import {
  compareRequirementCodes,
  continueRequirementCodes,
  highestRequirementNumbers,
  MAX_REQUIREMENTS_PER_PERSONA,
  requirementSchema,
  type Requirement,
  type RequirementDto,
  type RequirementEdit,
} from "@smartpathy/shared";
import type {
  PrismaClient,
  Requirement as RequirementRow,
} from "../generated/prisma/client.js";

export type AppendRequirementsResult =
  | { status: "appended"; requirements: RequirementDto[] }
  | { status: "limit_reached" };

export interface RequirementRepository {
  /** Swaps all of the persona's requirements in a single transaction (AC5.7 / AC5.8 / AC12.4). Sorted by code. */
  replaceAll(
    persona: { id: string; projectId: string },
    requirements: Requirement[],
  ): Promise<RequirementDto[]>;
  /**
   * AC13.1 / AC13.3: adds to the persona's requirements, continuing its numbering and
   * marking only these as new (AC13.5). All or nothing (AC13.4). Sorted by code.
   */
  append(
    persona: { id: string; projectId: string },
    requirements: Requirement[],
  ): Promise<AppendRequirementsResult>;
  /** Sorted by code: FR before NFR, then numerically (AC6.5). */
  findByPersonaId(personaId: string): Promise<RequirementDto[]>;
  findById(id: string): Promise<RequirementDto | null>;
  /** AC14.1 / AC14.5: applies the user's changes and marks the requirement as edited. */
  applyEdit(id: string, edit: RequirementEdit): Promise<RequirementDto>;
  /** AC14.3: false when it no longer exists. The other requirements keep their codes (AC14.4). */
  deleteById(id: string): Promise<boolean>;
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
    isNew: row.isNew,
    edited: row.edited,
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
      const lastUsed = highestRequirementNumbers(requirements.map(({ code }) => code));
      const [, , , rows] = await prisma.$transaction([
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
        // Raw: Prisma's update would touch updatedAt and flag the requirements as outdated (AC7.5).
        prisma.$executeRaw`UPDATE Persona SET lastFunctionalNumber = ${lastUsed.functional}, lastNonFunctionalNumber = ${lastUsed.non_functional} WHERE id = ${personaId}`,
        byPosition(personaId),
      ]);
      return sortedDtos(rows);
    },
    async append({ id: personaId, projectId }, requirements) {
      return prisma.$transaction(async (tx) => {
        // Locks the persona, so simultaneous generations cannot take the same codes.
        await tx.$queryRaw`SELECT id FROM Persona WHERE id = ${personaId} FOR UPDATE`;
        const numbers = await tx.persona.findUniqueOrThrow({
          where: { id: personaId },
          select: { lastFunctionalNumber: true, lastNonFunctionalNumber: true },
        });
        const existing = await tx.requirement.findMany({
          where: { personaId },
          select: { position: true },
        });
        if (existing.length + requirements.length > MAX_REQUIREMENTS_PER_PERSONA) {
          return { status: "limit_reached" };
        }

        const firstPosition = Math.max(-1, ...existing.map(({ position }) => position)) + 1;
        const coded = continueRequirementCodes(
          {
            functional: numbers.lastFunctionalNumber,
            non_functional: numbers.lastNonFunctionalNumber,
          },
          requirements,
        );
        await tx.requirement.updateMany({
          where: { personaId, isNew: true },
          data: { isNew: false },
        });
        await tx.requirement.createMany({
          data: coded.requirements.map((req, index) => ({
            projectId,
            personaId,
            position: firstPosition + index,
            isNew: true,
            code: req.code,
            type: req.type,
            description: req.description,
            moscow: req.moscow,
            priority: req.priority,
            derivedFrom: req.derivedFrom,
          })),
        });
        // Raw for the same reason as in replaceAll.
        await tx.$executeRaw`UPDATE Persona SET lastFunctionalNumber = ${coded.lastUsed.functional}, lastNonFunctionalNumber = ${coded.lastUsed.non_functional} WHERE id = ${personaId}`;
        const rows = await tx.requirement.findMany({ where: { personaId } });
        return { status: "appended", requirements: sortedDtos(rows) };
      });
    },
    async findByPersonaId(personaId) {
      return sortedDtos(await byPosition(personaId));
    },
    async findById(id) {
      const row = await prisma.requirement.findUnique({ where: { id } });
      return row ? toDto(row) : null;
    },
    async applyEdit(id, edit) {
      const row = await prisma.requirement.update({
        where: { id },
        data: {
          description: edit.description,
          moscow: edit.moscow,
          priority: edit.priority,
          derivedFrom: edit.derivedFrom,
          edited: true,
        },
      });
      return toDto(row);
    },
    async deleteById(id) {
      const { count } = await prisma.requirement.deleteMany({ where: { id } });
      return count > 0;
    },
  };
}
