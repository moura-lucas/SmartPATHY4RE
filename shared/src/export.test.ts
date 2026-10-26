import { describe, expect, it } from "vitest";
import { exportFileName, projectExportSchema } from "./export.js";

const date = new Date("2026-10-26T15:30:00.000Z");

describe("exportFileName", () => {
  it("builds <project-name>-<date>.<format> (AC9.1 / AC10.1)", () => {
    expect(exportFileName("Clinic App", date, "json")).toBe("clinic-app-2026-10-26.json");
    expect(exportFileName("Clinic App", date, "pdf")).toBe("clinic-app-2026-10-26.pdf");
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
  it("requires the export date, project, persona and requirements (AC9.2)", () => {
    const result = projectExportSchema.safeParse({});
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.map((i) => i.path[0])).toEqual([
      "exportedAt",
      "project",
      "persona",
      "requirements",
    ]);
  });
});
