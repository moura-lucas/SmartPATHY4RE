import {
  personaSchema,
  type Persona,
  type PersonaDto,
  type PersonaSections,
} from "@smartpathy/shared";
import type {
  PrismaClient,
  Persona as PersonaRow,
} from "../generated/prisma/client.js";

export type DeletePersonaResult = "deleted" | "persona_not_found" | "last_persona";

export interface PersonaRepository {
  /** Adds a persona to the project, keeping the existing ones (AC12.2). */
  create(projectId: string, persona: Persona): Promise<PersonaDto>;
  /** Oldest first (AC12.3). */
  listByProjectId(projectId: string): Promise<PersonaDto[]>;
  findById(projectId: string, personaId: string): Promise<PersonaDto | null>;
  /** Replaces the five PATHY sections of an existing persona (AC7.3). */
  updateSections(personaId: string, sections: PersonaSections): Promise<PersonaDto>;
  /** Deletes the persona and its requirements, unless it is the last one (AC12.5). */
  deleteUnlessLast(projectId: string, personaId: string): Promise<DeletePersonaResult>;
}

function toDto(row: PersonaRow): PersonaDto {
  // The Json columns come back as JsonValue: Zod validates and types them.
  const persona = personaSchema.parse(row);
  return {
    ...persona,
    id: row.id,
    projectId: row.projectId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function createPersonaRepository(
  prisma: PrismaClient,
): PersonaRepository {
  return {
    async create(projectId, persona) {
      const row = await prisma.persona.create({
        data: {
          projectId,
          name: persona.name,
          age: persona.age,
          techExperienceLevel: persona.techExperienceLevel,
          who: persona.who,
          context: persona.context,
          experienceWithTechnology: persona.experienceWithTechnology,
          problems: persona.problems,
          existingSolutions: persona.existingSolutions,
        },
      });
      return toDto(row);
    },
    async listByProjectId(projectId) {
      const rows = await prisma.persona.findMany({
        where: { projectId },
        orderBy: { createdAt: "asc" },
      });
      return rows.map(toDto);
    },
    async findById(projectId, personaId) {
      const row = await prisma.persona.findFirst({ where: { id: personaId, projectId } });
      return row ? toDto(row) : null;
    },
    async updateSections(personaId, sections) {
      const row = await prisma.persona.update({
        where: { id: personaId },
        data: {
          who: sections.who,
          context: sections.context,
          experienceWithTechnology: sections.experienceWithTechnology,
          problems: sections.problems,
          existingSolutions: sections.existingSolutions,
        },
      });
      return toDto(row);
    },
    async deleteUnlessLast(projectId, personaId) {
      return prisma.$transaction(async (tx) => {
        // Locks the project, so two simultaneous deletions cannot both pass the check.
        await tx.$queryRaw`SELECT id FROM Project WHERE id = ${projectId} FOR UPDATE`;
        const ids = await tx.persona.findMany({ where: { projectId }, select: { id: true } });
        if (!ids.some(({ id }) => id === personaId)) return "persona_not_found";
        if (ids.length === 1) return "last_persona";
        // The foreign key removes the persona's requirements too.
        await tx.persona.delete({ where: { id: personaId } });
        return "deleted";
      });
    },
  };
}
