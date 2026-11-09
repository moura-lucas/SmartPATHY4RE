import {
  projectStage,
  type CreateProjectInput,
  type ProjectDto,
  type ProjectSummaryDto,
  type UpdateProjectInput,
  type TechExperienceLevel,
} from "@smartpathy/shared";
import type { PrismaClient, Project } from "../generated/prisma/client.js";

export interface ProjectRepository {
  create(input: CreateProjectInput): Promise<ProjectDto>;
  findById(id: string): Promise<ProjectDto | null>;
  /** AC17.1: null when the project does not exist. */
  update(id: string, input: UpdateProjectInput): Promise<ProjectDto | null>;
  /** AC17.4: removes the project, personas and requirements together; false when not found. */
  remove(id: string): Promise<boolean>;
  /** AC8.1: newest first, with each project's progress. */
  listSummaries(): Promise<ProjectSummaryDto[]>;
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
    async update(id, input) {
      const { count } = await prisma.project.updateMany({
        where: { id },
        data: {
          name: input.name,
          domain: input.domain,
          description: input.description,
          additionalContext: input.additionalContext ?? null,
        },
      });
      if (count === 0) return null;
      return this.findById(id);
    },
    async remove(id) {
      const [, , deleted] = await prisma.$transaction([
        prisma.requirement.deleteMany({ where: { projectId: id } }),
        prisma.persona.deleteMany({ where: { projectId: id } }),
        prisma.project.deleteMany({ where: { id } }),
      ]);
      return deleted.count > 0;
    },
    async listSummaries() {
      const rows = await prisma.project.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { personas: true, requirements: true } },
        },
      });
      return rows.map(({ _count, ...project }) => {
        const progress = {
          hasPersona: _count.personas > 0,
          requirementsCount: _count.requirements,
        };
        return { ...toDto(project), ...progress, stage: projectStage(progress) };
      });
    },
  };
}
