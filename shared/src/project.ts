import { z } from "zod";
import { TECH_EXPERIENCE_LEVELS, type TechExperienceLevel } from "./pathy.js";

/**
 * "Create New Project" form input (Figure 28), plus the
 * persona characteristics that PATHY4RE receives (Section 5.5):
 * name, age, and level of technology experience.
 */

const requiredText = (label: string, max: number) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be at most ${max} characters`);

/** Optional text: an empty string or one containing only spaces becomes `undefined`. */
const optionalText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be at most ${max} characters`)
    .optional()
    .transform((value) => value || undefined);

export const createProjectSchema = z.object({
  name: requiredText("Project name", 120),
  domain: requiredText("Application domain", 80),
  description: requiredText("Description", 5000),
  additionalContext: optionalText("Additional context", 5000),
  personaName: optionalText("Persona name", 80),
  personaAge: z
    .number({ error: "Age must be a number" })
    .int("Age must be an integer")
    .min(1, "Age must be between 1 and 120")
    .max(120, "Age must be between 1 and 120")
    .optional(),
  techExperienceLevel: z.enum(TECH_EXPERIENCE_LEVELS, {
    error: "Select an experience level: low, moderate or high",
  }),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type CreateProjectFieldErrors = Partial<
  Record<keyof CreateProjectInput, string[]>
>;

export type CreateProjectValidation =
  | { success: true; data: CreateProjectInput }
  | { success: false; fieldErrors: CreateProjectFieldErrors };

/** Used by the frontend (before submission) and the backend (POST /projects). */
export function validateCreateProject(input: unknown): CreateProjectValidation {
  const result = createProjectSchema.safeParse(input ?? {});
  if (result.success) return { success: true, data: result.data };
  return {
    success: false,
    fieldErrors: z.flattenError(result.error).fieldErrors,
  };
}

/** Design how the API returns data (JSON). */
export interface ProjectDto {
  id: string;
  name: string;
  domain: string;
  description: string;
  additionalContext: string | null;
  personaName: string | null;
  personaAge: number | null;
  techExperienceLevel: TechExperienceLevel;
  createdAt: string; // ISO 8601
}
