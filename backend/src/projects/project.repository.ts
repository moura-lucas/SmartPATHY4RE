import type {
  CreateProjectInput,
  ProjectDto,
  TechExperienceLevel,
} from "@smartpathy/shared";
import type { PrismaClient, Project } from "../generated/prisma/client.js";

export interface ProjectRepository {
  create(input: CreateProjectInput): Promise<ProjectDto>;
  findById(id: string): Promise<ProjectDto | null>;
}

function toDto(project: Project): ProjectDto {
  return {
    ...project,
    techExperienceLevel: project.techExperienceLevel as TechExperienceLevel,
    createdAt: project.createdAt.toISOString(),
  };
}

export function createProjectRepository(
  prisma: PrismaClient,
): ProjectRepository {
  return {
    async create(input) {
      const project = await prisma.project.create({
        data: {
          name: input.name,
          domain: input.domain,
          description: input.description,
          // exactOptionalPropertyTypes: Prisma does not accept an explicit `undefined`.
          additionalContext: input.additionalContext ?? null,
          personaName: input.personaName ?? null,
          personaAge: input.personaAge ?? null,
          techExperienceLevel: input.techExperienceLevel,
        },
      });
      return toDto(project);
    },
    async findById(id) {
      const project = await prisma.project.findUnique({ where: { id } });
      return project ? toDto(project) : null;
    },
  };
}
