import { createRequire } from "node:module";
import { dirname } from "node:path";
import pdfmake from "pdfmake";
import type { Content, TableCell, TDocumentDefinitions } from "pdfmake/interfaces.js";
import {
  MOSCOW_LABELS,
  PATHY_SECTIONS,
  PRIORITY_LABELS,
  REQUIREMENT_TYPES,
  REQUIREMENT_TYPE_LABELS,
  TECH_EXPERIENCE_LEVEL_LABELS,
  pathyAnswer,
  pathyFieldsOf,
  type ProjectExport,
  type Requirement,
  type RequirementType,
} from "@smartpathy/shared";

// AC10.4: Roboto (shipped with pdfmake) is embedded, so accents and other Latin
// characters render correctly, unlike the 14 standard PDF fonts.
const require = createRequire(import.meta.url);
const fontDir = dirname(require.resolve("pdfmake/fonts/Roboto/Roboto-Regular.ttf"));
pdfmake.setFonts({
  Roboto: {
    normal: `${fontDir}/Roboto-Regular.ttf`,
    bold: `${fontDir}/Roboto-Medium.ttf`,
    italics: `${fontDir}/Roboto-Italic.ttf`,
    bolditalics: `${fontDir}/Roboto-MediumItalic.ttf`,
  },
});
// Only the bundled fonts may be read from disk, and nothing from the network.
pdfmake.setLocalAccessPolicy((path) => path.startsWith(fontDir));
pdfmake.setUrlAccessPolicy(() => false);

const MUTED = "#52525b";
const BORDER = "#d4d4d8";

function formatDate(iso: string): string {
  const date = new Date(iso).toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "UTC",
  });
  return `${date} UTC`;
}

function details(rows: [string, string][]): Content {
  return {
    table: {
      widths: [110, "*"],
      body: rows.map(([label, value]) => [
        { text: label, color: MUTED },
        { text: value },
      ]),
    },
    layout: "noBorders",
  };
}

function requirementsTable(type: RequirementType, requirements: Requirement[]): Content[] {
  const title = `${REQUIREMENT_TYPE_LABELS[type]} requirements (${requirements.length})`;
  const header: TableCell[] = ["Code", "Description", "MoSCoW", "Priority", "Derived from"].map(
    (text) => ({ text, style: "tableHeader" }),
  );
  const empty: TableCell = {
    text: `No ${REQUIREMENT_TYPE_LABELS[type].toLowerCase()} requirements.`,
    colSpan: 5,
    italics: true,
    color: MUTED,
  };
  const rows: TableCell[][] =
    requirements.length === 0
      ? [[empty, {}, {}, {}, {}]]
      : requirements.map((req) => [
          { text: req.code, bold: true },
          req.description,
          MOSCOW_LABELS[req.moscow],
          PRIORITY_LABELS[req.priority],
          req.derivedFrom.join(", "),
        ]);

  return [
    { text: title, style: "h3" },
    {
      table: {
        headerRows: 1, // repeated on every page
        dontBreakRows: true, // AC10.3: a row is never split across pages
        widths: [38, "*", 46, 46, 62],
        body: [header, ...rows],
      },
      layout: {
        hLineColor: () => BORDER,
        vLineColor: () => BORDER,
        paddingTop: () => 4,
        paddingBottom: () => 4,
        fillColor: (rowIndex) => (rowIndex === 0 ? "#f4f4f5" : null),
      },
      fontSize: 9,
    },
  ];
}

/** AC10.2: header, persona by PATHY section, then one table per requirement type. */
export function buildPdfDocument(data: ProjectExport): TDocumentDefinitions {
  const { project, persona, requirements } = data;

  const header: Content[] = [
    { text: "PATHY persona and requirements report", color: MUTED, fontSize: 9 },
    { text: project.name, style: "h1" },
    details([
      ["Domain", project.domain],
      ["Description", project.description],
      ...(project.additionalContext
        ? ([["Additional context", project.additionalContext]] as [string, string][])
        : []),
      ["Generated on", formatDate(data.exportedAt)],
    ]),
  ];

  const personaContent: Content[] = [
    { text: `PATHY persona: ${persona.name}`, style: "h2", margin: [0, 24, 0, 10] },
    details([
      ["Age", String(persona.age)],
      ["Technology experience", TECH_EXPERIENCE_LEVEL_LABELS[persona.techExperienceLevel]],
    ]),
    ...PATHY_SECTIONS.flatMap(({ key, label }): Content[] => [
      { text: label, style: "h3" },
      ...pathyFieldsOf(key).map(
        (field): Content => ({
          unbreakable: true,
          margin: [0, 0, 0, 8],
          stack: [
            {
              text: [{ text: `${field.code}  `, bold: true }, field.label],
              color: MUTED,
              fontSize: 9,
            },
            { text: pathyAnswer(persona, field) },
          ],
        }),
      ),
    ]),
  ];

  const requirementsContent: Content[] = [
    { text: "Requirements", style: "h2", pageBreak: "before" },
    ...(requirements.length === 0
      ? // AC10.5: the persona alone, with a note.
        [{ text: "Requirements have not been generated yet.", italics: true, color: MUTED }]
      : REQUIREMENT_TYPES.flatMap((type) =>
          requirementsTable(
            type,
            requirements.filter((req) => req.type === type),
          ),
        )),
  ];

  return {
    pageSize: "A4", // AC10.3
    pageMargins: [48, 48, 48, 56],
    info: { title: `${project.name} — PATHY report`, creator: "SmartPATHY" },
    defaultStyle: { font: "Roboto", fontSize: 10, lineHeight: 1.25 },
    styles: {
      h1: { fontSize: 20, bold: true, margin: [0, 2, 0, 12] },
      h2: { fontSize: 15, bold: true, margin: [0, 0, 0, 10] },
      h3: { fontSize: 12, bold: true, margin: [0, 14, 0, 6] },
      tableHeader: { bold: true, color: MUTED },
    },
    footer: (currentPage, pageCount) => ({
      text: `Page ${currentPage} of ${pageCount}`,
      alignment: "center",
      fontSize: 8,
      color: MUTED,
      margin: [0, 20, 0, 0],
    }),
    content: [...header, ...personaContent, ...requirementsContent],
  };
}

export function renderPdf(data: ProjectExport): Promise<Buffer> {
  return pdfmake.createPdf(buildPdfDocument(data)).getBuffer();
}
