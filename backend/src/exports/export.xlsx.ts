import ExcelJS from "exceljs";
import JSZip from "jszip";
import {
  MOSCOW_LABELS,
  PATHY_FIELDS,
  PRIORITY_LABELS,
  TECH_EXPERIENCE_LEVEL_LABELS,
  pathyAnswer,
  type ExportedPersona,
  type Persona,
  type ProjectExport,
} from "@smartpathy/shared";
import { cleanText } from "./export.text.js";

type ExportedRequirement = NonNullable<ExportedPersona["functionalRequirements"]>[number];

interface Column {
  header: string;
  width: number;
  wrap?: boolean;
}

/** AC16.4: frozen header, active filters, readable widths and wrapped long text. */
function addSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  columns: Column[],
  rows: (string | number)[][],
) {
  const sheet = workbook.addWorksheet(name, {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  sheet.columns = columns.map(({ header, width }) => ({ header, width }));
  rows.forEach((row) => sheet.addRow(row.map((value) => (typeof value === "string" ? cleanText(value) : value))));

  sheet.getRow(1).font = { bold: true };
  columns.forEach(({ wrap }, index) => {
    sheet.getColumn(index + 1).alignment = { vertical: "top", wrapText: wrap ?? false };
  });
  sheet.getRow(1).alignment = { vertical: "middle", wrapText: false };

  const lastColumn = sheet.getColumn(columns.length).letter;
  sheet.autoFilter = `A1:${lastColumn}${Math.max(rows.length + 1, 1)}`;
}

function requirementsSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  personas: ExportedPersona[],
  pick: (persona: ExportedPersona) => ExportedRequirement[] | undefined,
) {
  const severalPersonas = personas.length > 1;
  const columns: Column[] = [
    ...(severalPersonas ? [{ header: "Persona", width: 22, wrap: true }] : []),
    { header: "Code", width: 10 },
    { header: "Description", width: 70, wrap: true },
    { header: "MoSCoW", width: 12 },
    { header: "Priority", width: 11 },
    { header: "Derived from", width: 20, wrap: true },
    { header: "Edited", width: 9 }, // AC14.5
  ];
  const rows = personas.flatMap((persona) =>
    (pick(persona) ?? []).map((req) => [
      ...(severalPersonas ? [persona.name] : []),
      req.code,
      req.description,
      MOSCOW_LABELS[req.moscow],
      PRIORITY_LABELS[req.priority],
      req.derivedFrom.join(", "),
      req.edited ? "Yes" : "No",
    ]),
  );
  addSheet(workbook, name, columns, rows);
}

/** One row per PATHY field and one column per persona, to compare them side by side. */
function personaSheet(workbook: ExcelJS.Workbook, profiles: Persona[]) {
  const columns: Column[] = [
    { header: "Code", width: 8 },
    { header: "Field", width: 34, wrap: true },
    ...profiles.map(({ name }) => ({ header: cleanText(name), width: 48, wrap: true })),
  ];
  const rows: (string | number)[][] = [
    ["", "Age", ...profiles.map(({ age }) => age)],
    [
      "",
      "Technology experience",
      ...profiles.map((p) => TECH_EXPERIENCE_LEVEL_LABELS[p.techExperienceLevel]),
    ],
    ...PATHY_FIELDS.map((field) => [
      field.code,
      field.label,
      ...profiles.map((profile) => pathyAnswer(profile, field)),
    ]),
  ];
  addSheet(workbook, "Persona", columns, rows);
}

/** AC16.3 / AC15.5: one worksheet per selected content. */
export function buildXlsxWorkbook(data: ProjectExport): ExcelJS.Workbook {
  const { personas } = data;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SmartPATHY";
  workbook.created = new Date(data.exportedAt);

  if (personas.some((persona) => persona.functionalRequirements)) {
    requirementsSheet(workbook, "Functional Requirements", personas, (p) => p.functionalRequirements);
  }
  if (personas.some((persona) => persona.nonFunctionalRequirements)) {
    requirementsSheet(workbook, "Non-Functional Requirements", personas, (p) => p.nonFunctionalRequirements);
  }
  const profiles = personas.flatMap((persona) => (persona.profile ? [persona.profile] : []));
  if (profiles.length > 0) personaSheet(workbook, profiles);

  return workbook;
}

/**
 * AC16.4: Excel and LibreOffice record a sheet's filter in a hidden defined name too, and
 * LibreOffice ignores the filter without it. ExcelJS only writes the <autoFilter> element.
 */
async function addFilterNames(workbook: ExcelJS.Workbook, content: ArrayBuffer): Promise<Buffer> {
  const names = workbook.worksheets
    .map((sheet, index) => {
      const [from, to] = (sheet.autoFilter as string).split(":") as [string, string];
      const absolute = (cell: string) => cell.replace(/^([A-Z]+)(\d+)$/, "$$$1$$$2");
      return `<definedName name="_xlnm._FilterDatabase" localSheetId="${index}" hidden="1">'${sheet.name}'!${absolute(from)}:${absolute(to)}</definedName>`;
    })
    .join("");

  const zip = await JSZip.loadAsync(content);
  const path = "xl/workbook.xml";
  const xml = await zip.file(path)!.async("string");
  // <definedNames> must come right after <sheets>; ExcelJS leaves an empty one there.
  const patched = xml
    .replace(/<definedNames\s*\/>|<definedNames>.*?<\/definedNames>/s, "")
    .replace("</sheets>", `</sheets><definedNames>${names}</definedNames>`);
  zip.file(path, patched);
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

export async function renderXlsx(data: ProjectExport): Promise<Buffer> {
  const workbook = buildXlsxWorkbook(data);
  return addFilterNames(workbook, (await workbook.xlsx.writeBuffer()) as ArrayBuffer);
}
