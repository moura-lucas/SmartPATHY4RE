import { z } from "zod";
import { personaSchema } from "./pathy.js";
import { exportedRequirementSchema } from "./requirement.js";

/** US9 / US10 / US16: formats of GET /projects/:id/export?format=... */
export const EXPORT_FORMATS = ["json", "pdf", "docx", "xlsx"] as const;
export const exportFormatSchema = z.enum(EXPORT_FORMATS);
export type ExportFormat = z.infer<typeof exportFormatSchema>;

/** AC15.2: what can be included for each chosen persona. */
export const EXPORT_CONTENTS = ["profile", "functional", "non_functional"] as const;
export const exportContentSchema = z.enum(EXPORT_CONTENTS);
export type ExportContent = z.infer<typeof exportContentSchema>;

const commaList = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

/**
 * The `personas` and `include` query parameters, as comma-separated lists. When absent they
 * mean "everything"; sent empty they mean nothing was selected, which is rejected (AC15.4).
 */
export const exportSelectionSchema = z
  .object({
    personas: z
      .string()
      .optional()
      .transform((value) => (value === undefined ? undefined : commaList(value))),
    include: z
      .string()
      .optional()
      .transform((value) => (value === undefined ? [...EXPORT_CONTENTS] : commaList(value)))
      .pipe(z.array(exportContentSchema)),
  })
  .refine(
    ({ personas, include }) => include.length > 0 && (personas === undefined || personas.length > 0),
    { message: "Select at least one item to export." },
  );
export type ExportSelection = z.infer<typeof exportSelectionSchema>;

/** One chosen persona. AC15.5: a deselected section is omitted, never sent empty. */
export const exportedPersonaSchema = z.object({
  /** Always present, so the requirements can be identified without the profile. */
  name: z.string(),
  profile: personaSchema.optional(),
  functionalRequirements: z.array(exportedRequirementSchema).optional(),
  nonFunctionalRequirements: z.array(exportedRequirementSchema).optional(),
});
export type ExportedPersona = z.infer<typeof exportedPersonaSchema>;

/**
 * Content of the exported JSON file (AC9.2). The persona and the requirements use the
 * same schemas as the rest of the system, so other tools can validate the file (AC9.3).
 */
export const projectExportSchema = z.object({
  exportedAt: z.iso.datetime(),
  project: z.object({
    name: z.string(),
    domain: z.string(),
    description: z.string(),
    additionalContext: z.string().nullable(),
  }),
  personas: z.array(exportedPersonaSchema).min(1),
});
export type ProjectExport = z.infer<typeof projectExportSchema>;

/**
 * "<project-name>-<date>.<ext>" (AC9.1 / AC10.1), safe for any file system:
 * "Sistema de Gestão" exported on 2026-10-26 becomes "sistema-de-gestao-2026-10-26.json".
 */
export function exportFileName(projectName: string, date: Date, format: ExportFormat): string {
  const slug =
    projectName
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "project";
  return `${slug}-${date.toISOString().slice(0, 10)}.${format}`;
}
