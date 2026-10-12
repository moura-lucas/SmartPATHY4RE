import { personaSchema, type Persona, type PersonaDto } from "@smartpathy/shared";
import type {
  PrismaClient,
  Persona as PersonaRow,
} from "../generated/prisma/client.js";

export interface PersonaRepository {
  /** Creates the project's persona, or replaces it when regenerating. */
  upsert(projectId: string, persona: Persona): Promise<PersonaDto>;
  findByProjectId(projectId: string): Promise<PersonaDto | null>;
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
    async upsert(projectId, persona) {
      const data = {
        name: persona.name,
        age: persona.age,
        techExperienceLevel: persona.techExperienceLevel,
        who: persona.who,
        context: persona.context,
        experienceWithTechnology: persona.experienceWithTechnology,
        problems: persona.problems,
        existingSolutions: persona.existingSolutions,
      };
      const row = await prisma.persona.upsert({
        where: { projectId },
        create: { projectId, ...data },
        update: data,
      });
      return toDto(row);
    },
    async findByProjectId(projectId) {
      const row = await prisma.persona.findUnique({ where: { projectId } });
      return row ? toDto(row) : null;
    },
  };
}
