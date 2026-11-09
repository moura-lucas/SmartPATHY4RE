import { describe, expect, it } from "vitest";
import {
  EXPORT_CONTENTS,
  exportFileName,
  exportSelectionSchema,
  projectExportSchema,
} from "./export.js";

const date = new Date("2026-10-26T15:30:00.000Z");

describe("exportFileName", () => {
  it("builds <project-name>-<date>.<format> (AC9.1 / AC10.1)", () => {
    expect(exportFileName("Clinic App", date, "json")).toBe("clinic-app-2026-10-26.json");
    expect(exportFileName("Clinic App", date, "pdf")).toBe("clinic-app-2026-10-26.pdf");
    expect(exportFileName("Clinic App", date, "docx")).toBe("clinic-app-2026-10-26.docx");
    expect(exportFileName("Clinic App", date, "xlsx")).toBe("clinic-app-2026-10-26.xlsx");
  });

  it("removes accents and characters that file systems reject", () => {
    expect(exportFileName("Sistema de Gestão: Ações/Über", date, "json")).toBe(
      "sistema-de-gestao-acoes-uber-2026-10-26.json",
    );
  });

  it("falls back to a generic name when nothing is left", () => {
    expect(exportFileName("???", date, "pdf")).toBe("project-2026-10-26.pdf");
  });
});

describe("projectExportSchema", () => {
  it("requires the export date, project and personas (AC9.2)", () => {
    const result = projectExportSchema.safeParse({});
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.map((i) => i.path[0])).toEqual([
      "exportedAt",
      "project",
      "personas",
    ]);
  });

  it("accepts a persona with only its name and one section (AC15.5)", () => {
    const result = projectExportSchema.safeParse({
      exportedAt: date.toISOString(),
      project: { name: "A", domain: "B", description: "C", additionalContext: null },
      personas: [{ name: "Ana", functionalRequirements: [] }],
    });
    expect(result.success).toBe(true);
  });
});

describe("exportSelectionSchema (AC15.2 / AC15.4)", () => {
  it("means everything when the parameters are absent", () => {
    expect(exportSelectionSchema.parse({})).toEqual({
      personas: undefined,
      include: [...EXPORT_CONTENTS],
    });
  });

  it("reads comma-separated lists", () => {
    expect(
      exportSelectionSchema.parse({ personas: "a, b", include: "profile,non_functional" }),
    ).toEqual({ personas: ["a", "b"], include: ["profile", "non_functional"] });
  });

  it.each([
    ["no content", { include: "" }],
    ["no persona", { personas: "" }],
    ["an unknown content", { include: "functional,other" }],
    ["a repeated parameter", { include: ["functional", "profile"] }],
  ])("rejects %s", (_name, query) => {
    expect(exportSelectionSchema.safeParse(query).success).toBe(false);
  });
});
