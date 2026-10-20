import { z } from "zod";

/**
 * Persona PATHY conforme o template mais recente da dissertação
 * (Figura 10 / Figura 29): Who, Context, Experience with Technology,
 * Problems e Existing Solutions, com campos identificados por código (W1..S3).
 */

export const TECH_EXPERIENCE_LEVELS = ["low", "moderate", "high"] as const;
export const techExperienceLevelSchema = z.enum(TECH_EXPERIENCE_LEVELS);
export type TechExperienceLevel = z.infer<typeof techExperienceLevelSchema>;

const answer = z.string().trim().min(1, "This field is required.");

export const personaSchema = z.object({
  name: z.string().trim().min(1).max(80),
  age: z.number().int().min(1).max(120),
  techExperienceLevel: techExperienceLevelSchema,
  who: z.object({
    profession: answer,
    educationLevel: answer,
    selfDescription: answer,
    fearsConcernsFrustrations: answer,
  }),
  context: z.object({
    routineTasks: answer,
  }),
  experienceWithTechnology: z.object({
    likedParts: answer,
    dislikedParts: answer,
    devicesUsed: answer,
    howLearnsNewApplications: answer,
    stepByStepOrShortcuts: answer,
    informationProcessingStyle: answer,
    virtualSocialBehaviour: answer,
  }),
  problems: z.object({
    routineProblems: answer,
    howApplicationCanHelp: answer,
  }),
  existingSolutions: z.object({
    existingTechnologies: answer,
    positiveCharacteristics: answer,
    negativeCharacteristics: answer,
  }),
});
export type Persona = z.infer<typeof personaSchema>;

export const PATHY_SECTIONS = [
  { key: "who", label: "Who" },
  { key: "context", label: "Context" },
  { key: "experienceWithTechnology", label: "Experience with Technology" },
  { key: "problems", label: "Problems" },
  { key: "existingSolutions", label: "Existing Solutions" },
] as const;
export type PathySection = (typeof PATHY_SECTIONS)[number]["key"];

export const PATHY_CODES = [
  "W1",
  "W2",
  "W3",
  "W4",
  "C1",
  "E1",
  "E2",
  "E3",
  "E4",
  "E5",
  "E6",
  "E7",
  "P1",
  "P2",
  "S1",
  "S2",
  "S3",
] as const;
export const pathyCodeSchema = z.enum(PATHY_CODES);
export type PathyCode = z.infer<typeof pathyCodeSchema>;

type PathyFieldDefinition = {
  [S in PathySection]: {
    code: PathyCode;
    section: S;
    field: keyof Persona[S];
    label: string;
  };
}[PathySection];

/** Catálogo que liga cada código PATHY ao campo correspondente da persona. */
export const PATHY_FIELDS = [
  { code: "W1", section: "who", field: "profession", label: "Profession" },
  {
    code: "W2",
    section: "who",
    field: "educationLevel",
    label: "Education level",
  },
  {
    code: "W3",
    section: "who",
    field: "selfDescription",
    label: "Self-description",
  },
  {
    code: "W4",
    section: "who",
    field: "fearsConcernsFrustrations",
    label: "Fears, concerns and frustrations",
  },
  {
    code: "C1",
    section: "context",
    field: "routineTasks",
    label: "Routine tasks using applications",
  },
  {
    code: "E1",
    section: "experienceWithTechnology",
    field: "likedParts",
    label: "Liked parts of applications",
  },
  {
    code: "E2",
    section: "experienceWithTechnology",
    field: "dislikedParts",
    label: "Disliked parts of applications",
  },
  {
    code: "E3",
    section: "experienceWithTechnology",
    field: "devicesUsed",
    label: "Devices used",
  },
  {
    code: "E4",
    section: "experienceWithTechnology",
    field: "howLearnsNewApplications",
    label: "How learns new applications",
  },
  {
    code: "E5",
    section: "experienceWithTechnology",
    field: "stepByStepOrShortcuts",
    label: "Prefers step-by-step or shortcuts",
  },
  {
    code: "E6",
    section: "experienceWithTechnology",
    field: "informationProcessingStyle",
    label: "Information processing style",
  },
  {
    code: "E7",
    section: "experienceWithTechnology",
    field: "virtualSocialBehaviour",
    label: "Virtual social behaviour",
  },
  {
    code: "P1",
    section: "problems",
    field: "routineProblems",
    label: "Routine problems",
  },
  {
    code: "P2",
    section: "problems",
    field: "howApplicationCanHelp",
    label: "How the application can help",
  },
  {
    code: "S1",
    section: "existingSolutions",
    field: "existingTechnologies",
    label: "Existing technologies",
  },
  {
    code: "S2",
    section: "existingSolutions",
    field: "positiveCharacteristics",
    label: "Positive or essential characteristics",
  },
  {
    code: "S3",
    section: "existingSolutions",
    field: "negativeCharacteristics",
    label: "Negative or dispensable characteristics",
  },
] as const satisfies readonly PathyFieldDefinition[];
export type PathyField = (typeof PATHY_FIELDS)[number];

/** Catalog fields of a section, in catalog order. */
export function pathyFieldsOf<S extends PathySection>(
  section: S,
): Extract<PathyField, { section: S }>[] {
  return PATHY_FIELDS.filter(
    (f): f is Extract<PathyField, { section: S }> => f.section === section,
  );
}

/** Catalog field of a PATHY code. */
export function pathyField(code: PathyCode): PathyField {
  return PATHY_FIELDS.find((f) => f.code === code)!;
}

/** "C1 — Routine tasks using applications" (AC6.7). */
export function pathyFieldLabel(code: PathyCode): string {
  return `${code} — ${pathyField(code).label}`;
}

/** The persona's answer to a catalog field. */
export function pathyAnswer(persona: Persona, { section, field }: PathyField): string {
  return (persona[section] as Record<string, string>)[field] ?? "";
}

/** The five editable sections (US7): the body of PUT /projects/:id/persona. */
export const personaSectionsSchema = personaSchema.pick({
  who: true,
  context: true,
  experienceWithTechnology: true,
  problems: true,
  existingSolutions: true,
});
export type PersonaSections = z.infer<typeof personaSectionsSchema>;

/** Keyed by field path, e.g. "who.profession". */
export type PersonaSectionsFieldErrors = Record<string, string[]>;

export type PersonaSectionsValidation =
  | { success: true; data: PersonaSections }
  | { success: false; fieldErrors: PersonaSectionsFieldErrors };

/** AC7.2: used by the frontend (before saving) and the backend (PUT /projects/:id/persona). */
export function validatePersonaSections(input: unknown): PersonaSectionsValidation {
  const result = personaSectionsSchema.safeParse(input ?? {});
  if (result.success) return { success: true, data: result.data };
  const fieldErrors: PersonaSectionsFieldErrors = {};
  for (const issue of result.error.issues) {
    (fieldErrors[issue.path.join(".")] ??= []).push(issue.message);
  }
  return { success: false, fieldErrors };
}

/** Field path used as the key of PersonaSectionsFieldErrors. */
export function pathyFieldPath({ section, field }: PathyField): string {
  return `${section}.${String(field)}`;
}

/** Persona as returned by the API. */
export interface PersonaDto extends Persona {
  id: string;
  projectId: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
