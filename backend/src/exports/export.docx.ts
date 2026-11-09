import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type IParagraphOptions,
  type IRunOptions,
} from "docx";
import {
  MOSCOW_LABELS,
  PATHY_SECTIONS,
  PRIORITY_LABELS,
  REQUIREMENT_TYPE_LABELS,
  TECH_EXPERIENCE_LEVEL_LABELS,
  pathyAnswer,
  pathyFieldsOf,
  type ExportedPersona,
  type Persona,
  type ProjectExport,
  type RequirementType,
} from "@smartpathy/shared";
import { cleanText } from "./export.text.js";

type Block = Paragraph | Table;
type ExportedRequirements = NonNullable<ExportedPersona["functionalRequirements"]>;

const MUTED = "52525B";
// A4 with Word's default margins leaves 9026 twentieths of a point.
const COLUMN_WIDTHS = [1100, 4226, 1100, 1100, 1500];
const COLUMN_TITLES = ["Code", "Description", "MoSCoW", "Priority", "Derived from"];

/** Keeps line breaks, which a single run would lose. */
function runs(value: string, options: IRunOptions = {}): TextRun[] {
  return cleanText(value)
    .split("\n")
    .map((text, index) => new TextRun({ ...options, text, ...(index > 0 ? { break: 1 } : {}) }));
}

function paragraph(value: string, options: IRunOptions = {}, extra: IParagraphOptions = {}) {
  return new Paragraph({ ...extra, children: runs(value, options) });
}

function heading(
  value: string,
  level: (typeof HeadingLevel)[keyof typeof HeadingLevel],
  pageBreakBefore = false,
) {
  return new Paragraph({ heading: level, pageBreakBefore, children: runs(value) });
}

function labelled(label: string, value: string) {
  return new Paragraph({
    children: [new TextRun({ text: `${label}: `, bold: true }), ...runs(value)],
  });
}

function cell(children: Paragraph[], column: number, header = false) {
  return new TableCell({
    children,
    width: { size: COLUMN_WIDTHS[column]!, type: WidthType.DXA },
    ...(header ? { shading: { type: ShadingType.CLEAR, fill: "F4F4F5" } } : {}),
  });
}

/** AC16.2: a native, editable table. */
function requirementsTable(type: RequirementType, requirements: ExportedRequirements): Block[] {
  const title = `${REQUIREMENT_TYPE_LABELS[type]} requirements (${requirements.length})`;
  if (requirements.length === 0) {
    return [
      heading(title, HeadingLevel.HEADING_3),
      paragraph(`No ${REQUIREMENT_TYPE_LABELS[type].toLowerCase()} requirements.`, {
        italics: true,
        color: MUTED,
      }),
    ];
  }

  const headerRow = new TableRow({
    tableHeader: true, // repeated on every page
    children: COLUMN_TITLES.map((text, column) =>
      cell([paragraph(text, { bold: true })], column, true),
    ),
  });
  const rows = requirements.map(
    (req) =>
      new TableRow({
        cantSplit: true,
        children: [
          cell(
            [
              paragraph(req.code, { bold: true }),
              // AC14.5
              ...(req.edited ? [paragraph("edited", { italics: true, color: MUTED, size: 16 })] : []),
            ],
            0,
          ),
          cell([paragraph(req.description)], 1),
          cell([paragraph(MOSCOW_LABELS[req.moscow])], 2),
          cell([paragraph(PRIORITY_LABELS[req.priority])], 3),
          cell([paragraph(req.derivedFrom.join(", "))], 4),
        ],
      }),
  );

  return [
    heading(title, HeadingLevel.HEADING_3),
    new Table({
      width: { size: 9026, type: WidthType.DXA },
      columnWidths: COLUMN_WIDTHS,
      rows: [headerRow, ...rows],
    }),
  ];
}

function personaProfile(profile: Persona, breakBefore: boolean): Block[] {
  return [
    heading(`PATHY persona: ${profile.name}`, HeadingLevel.HEADING_2, breakBefore),
    labelled("Age", String(profile.age)),
    labelled("Technology experience", TECH_EXPERIENCE_LEVEL_LABELS[profile.techExperienceLevel]),
    ...PATHY_SECTIONS.flatMap(({ key, label }): Block[] => [
      heading(label, HeadingLevel.HEADING_3),
      ...pathyFieldsOf(key).flatMap((field) => [
        new Paragraph({
          keepNext: true,
          children: [
            new TextRun({ text: `${field.code}  `, bold: true, color: MUTED }),
            new TextRun({ text: field.label, color: MUTED }),
          ],
        }),
        paragraph(pathyAnswer(profile, field), {}, { spacing: { after: 160 } }),
      ]),
    ]),
  ];
}

function personaRequirements(persona: ExportedPersona, breakBefore: boolean): Block[] {
  const { functionalRequirements: functional, nonFunctionalRequirements: nonFunctional } = persona;
  if (!functional && !nonFunctional) return []; // AC15.5

  const body: Block[] =
    functional?.length === 0 && nonFunctional?.length === 0
      ? [paragraph("Requirements have not been generated yet.", { italics: true, color: MUTED })]
      : [
          ...(functional ? requirementsTable("functional", functional) : []),
          ...(nonFunctional ? requirementsTable("non_functional", nonFunctional) : []),
        ];

  return [heading(`Requirements: ${persona.name}`, HeadingLevel.HEADING_2, breakBefore), ...body];
}

function formatDate(iso: string): string {
  const date = new Date(iso).toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "UTC",
  });
  return `${date} UTC`;
}

/** AC16.2: the same order as the PDF (AC10.2), with the editor's heading styles. */
export function buildDocxDocument(data: ProjectExport): Document {
  const { project, personas } = data;

  const header: Block[] = [
    paragraph("PATHY persona and requirements report", { color: MUTED, size: 18 }),
    heading(project.name, HeadingLevel.HEADING_1),
    labelled("Domain", project.domain),
    labelled("Description", project.description),
    ...(project.additionalContext
      ? [labelled("Additional context", project.additionalContext)]
      : []),
    labelled("Generated on", formatDate(data.exportedAt)),
  ];

  const body = personas.flatMap((persona, index): Block[] => [
    ...(persona.profile ? personaProfile(persona.profile, index > 0) : []),
    ...personaRequirements(persona, index > 0 || persona.profile !== undefined),
  ]);

  return new Document({
    title: `${cleanText(project.name)} — PATHY report`,
    creator: "SmartPATHY",
    sections: [{ children: [...header, ...body] }],
  });
}

export function renderDocx(data: ProjectExport): Promise<Buffer> {
  return Packer.toBuffer(buildDocxDocument(data));
}
