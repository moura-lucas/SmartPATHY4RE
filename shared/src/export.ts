import { z } from "zod";
import { personaSchema } from "./pathy.js";
import { requirementSchema } from "./requirement.js";

/** US9 / US10: formats of GET /projects/:id/export?format=... */
export const EXPORT_FORMATS = ["json", "pdf"] as const;
export const exportFormatSchema = z.enum(EXPORT_FORMATS);
export type ExportFormat = z.infer<typeof exportFormatSchema>;

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
  persona: personaSchema,
  requirements: z.array(requirementSchema),
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
