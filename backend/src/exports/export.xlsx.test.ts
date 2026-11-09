import ExcelJS from "exceljs";
import JSZip from "jszip";
import { PATHY_FIELDS } from "@smartpathy/shared";
import { describe, expect, it } from "vitest";
import { buildExport, buildExportedPersona } from "./export.fixtures.js";
import { renderXlsx } from "./export.xlsx.js";

async function open(data = buildExport()) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load((await renderXlsx(data)) as never);
  return workbook;
}

function rows(sheet: ExcelJS.Worksheet) {
  return sheet.getSheetValues().flatMap((row) => (row ? [(row as unknown[]).slice(1)] : []));
}

const bruno = buildExportedPersona({
  name: "Bruno",
  profile: { ...buildExportedPersona().profile!, name: "Bruno", age: 28 },
});

describe("renderXlsx", () => {
  it("creates one worksheet per content (AC16.3)", async () => {
    const workbook = await open();

    expect(workbook.worksheets.map(({ name }) => name)).toEqual([
      "Functional Requirements",
      "Non-Functional Requirements",
      "Persona",
    ]);
  });

  it("has one row per requirement, with the US6 columns (AC16.3)", async () => {
    const workbook = await open();
    const [header, ...data] = rows(workbook.getWorksheet("Functional Requirements")!);

    expect(header).toEqual(["Code", "Description", "MoSCoW", "Priority", "Derived from", "Edited"]);
    expect(data).toHaveLength(2);
    expect(data[0]).toEqual([
      "FR1",
      "The system shall show the patient's record on a single screen.",
      "Must",
      "High",
      "P1, P2",
      "No",
    ]);
  });

  it("keeps the derived from codes as text (AC16.3)", async () => {
    const workbook = await open();
    const cell = workbook.getWorksheet("Functional Requirements")!.getCell("E2");

    expect(cell.type).toBe(ExcelJS.ValueType.String);
    expect(cell.value).toBe("P1, P2");
  });

  it("freezes the header and enables the filters on every sheet (AC16.4)", async () => {
    const workbook = await open();

    for (const sheet of workbook.worksheets) {
      expect(sheet.views[0]).toMatchObject({ state: "frozen", ySplit: 1 });
      expect(sheet.autoFilter).toBeTruthy();
    }
  });

  it("covers all the rows with the filter (AC16.4)", async () => {
    const workbook = await open();

    expect(workbook.getWorksheet("Functional Requirements")!.autoFilter).toBe("A1:F3");
  });

  it("records the filters where Excel and LibreOffice look for them (AC16.4)", async () => {
    const zip = await JSZip.loadAsync(await renderXlsx(buildExport()));
    const xml = await zip.file("xl/workbook.xml")!.async("string");

    expect(xml).toContain(
      `<definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'Functional Requirements'!$A$1:$F$3</definedName>`,
    );
    expect(xml.match(/_xlnm\._FilterDatabase/g)).toHaveLength(3);
    expect(xml.indexOf("</sheets>")).toBeLessThan(xml.indexOf("<definedNames>"));
  });

  it("uses readable widths and wraps the descriptions (AC16.4)", async () => {
    const workbook = await open();
    const sheet = workbook.getWorksheet("Functional Requirements")!;

    expect(sheet.getColumn(2).width).toBeGreaterThanOrEqual(50);
    expect(sheet.getCell("B2").alignment?.wrapText).toBe(true);
  });

  it("preserves accents (AC16.5)", async () => {
    const persona = buildExportedPersona({ name: "Conceição" });
    const profile = { ...persona.profile!, name: "Conceição" };
    const workbook = await open(buildExport({ personas: [{ ...persona, profile }] }));

    expect(rows(workbook.getWorksheet("Persona")!)[0]).toContain("Conceição");
  });

  it("removes characters that are invalid in XML (AC16.5)", async () => {
    const persona = buildExportedPersona();
    const [first, ...others] = persona.functionalRequirements!;
    const workbook = await open(
      buildExport({
        personas: [
          {
            ...persona,
            functionalRequirements: [{ ...first!, description: "Bad\u0008char" }, ...others],
          },
        ],
      }),
    );

    expect(workbook.getWorksheet("Functional Requirements")!.getCell("B2").value).toBe("Badchar");
  });

  it("marks the requirements the user edited (AC14.5)", async () => {
    const persona = buildExportedPersona();
    const [first, ...others] = persona.functionalRequirements!;
    const workbook = await open(
      buildExport({
        personas: [{ ...persona, functionalRequirements: [{ ...first!, edited: true }, ...others] }],
      }),
    );

    expect(workbook.getWorksheet("Functional Requirements")!.getCell("F2").value).toBe("Yes");
  });

  describe("persona worksheet", () => {
    it("has one row per PATHY field (AC16.3)", async () => {
      const [header, ...data] = rows((await open()).getWorksheet("Persona")!);

      expect(header).toEqual(["Code", "Field", "Maria"]);
      expect(data.map((row) => row[0]).filter(Boolean)).toEqual(PATHY_FIELDS.map((f) => f.code));
      expect(data[2]).toEqual(["W1", "Profession", "Nurse"]);
    });

    it("has one column per persona", async () => {
      const workbook = await open(buildExport({ personas: [buildExportedPersona(), bruno] }));
      const [header, age] = rows(workbook.getWorksheet("Persona")!);

      expect(header).toEqual(["Code", "Field", "Maria", "Bruno"]);
      expect(age).toEqual(["", "Age", 50, 28]);
    });
  });

  describe("several personas", () => {
    it("adds a Persona column, so requirements can be filtered", async () => {
      const workbook = await open(buildExport({ personas: [buildExportedPersona(), bruno] }));
      const [header, ...data] = rows(workbook.getWorksheet("Functional Requirements")!);

      expect(header![0]).toBe("Persona");
      expect(data.map((row) => [row[0], row[1]])).toEqual([
        ["Maria", "FR1"],
        ["Maria", "FR2"],
        ["Bruno", "FR1"],
        ["Bruno", "FR2"],
      ]);
    });
  });

  describe("content selection (AC15.5 / AC16.1)", () => {
    it("creates only the worksheets of the selected content", async () => {
      const { profile: _p, nonFunctionalRequirements: _n, ...persona } = buildExportedPersona();

      const workbook = await open(buildExport({ personas: [persona] }));

      expect(workbook.worksheets.map(({ name }) => name)).toEqual(["Functional Requirements"]);
    });

    it("keeps the worksheet of a selected type that has no items", async () => {
      const workbook = await open(
        buildExport({ personas: [buildExportedPersona({ functionalRequirements: [] })] }),
      );

      expect(rows(workbook.getWorksheet("Functional Requirements")!)).toHaveLength(1);
    });
  });
});
