import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { ProjectExport } from "@smartpathy/shared";
import { buildPersona } from "../personas/persona.fixtures.js";
import { buildRequirements } from "../requirements/requirement.fixtures.js";

// Test data shared by the export tests.

export const EXPORTED_AT = "2026-10-26T15:30:00.000Z";

/** Accented on purpose (AC9.4 / AC10.4). */
export function buildExport(overrides: Partial<ProjectExport> = {}): ProjectExport {
  return {
    exportedAt: EXPORTED_AT,
    project: {
      name: "Gestão Clínica",
      domain: "Saúde",
      description: "Aplicação para enfermeiros registrarem sinais vitais — com acentuação.",
      additionalContext: "Über-Krankenhaus em São Paulo",
    },
    persona: buildPersona(),
    requirements: buildRequirements(),
    ...overrides,
  };
}

/** Text of each page of a PDF, so tests can check what a reader would see. */
export async function pdfPages(buffer: Buffer): Promise<string[]> {
  const task = getDocument({ data: new Uint8Array(buffer), verbosity: 0 });
  const pdf = await task.promise;
  const pages: string[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const content = await (await pdf.getPage(n)).getTextContent();
    pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
  }
  await task.destroy();
  return pages;
}
