import { z } from "zod";
import { techExperienceLevelSchema } from "./pathy.js";

/**
 * Entrada do formulário "Create New Project" (Figura 28), mais as
 * características da persona que o PATHY4RE recebe (seção 5.5):
 * nome, idade e nível de experiência com tecnologia.
 */
export const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(120),
  domain: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(5000),
  additionalContext: z.string().trim().max(5000).optional(),
  personaName: z.string().trim().min(1).max(80).optional(),
  personaAge: z.number().int().min(1).max(120).optional(),
  techExperienceLevel: techExperienceLevelSchema,
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
