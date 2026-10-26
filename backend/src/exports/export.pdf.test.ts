import { describe, expect, it } from "vitest";
import { buildExport, pdfPages } from "./export.fixtures.js";
import { buildPdfDocument, renderPdf } from "./export.pdf.js";

describe("buildPdfDocument", () => {
  it("uses A4 with page numbers in the footer (AC10.3)", () => {
    const doc = buildPdfDocument(buildExport());

    expect(doc.pageSize).toBe("A4");
    const footer = doc.footer as (page: number, count: number) => { text: string };
    expect(footer(2, 5).text).toBe("Page 2 of 5");
  });
});

describe("renderPdf", () => {
  it("renders header, persona sections and requirement tables in order (AC10.2)", async () => {
    const text = (await pdfPages(await renderPdf(buildExport()))).join(" ");

    const order = [
      "Gestão Clínica",
      "Generated on",
      "October 26, 2026",
      "Who",
      "W1",
      "Profession",
      "Nurse",
      "Context",
      "Experience with Technology",
      "Problems",
      "Existing Solutions",
      "S3",
      "Functional requirements (2)",
      "FR1",
      "Non-functional requirements (1)",
      "NFR1",
    ].map((part) => text.indexOf(part));
    expect(order).not.toContain(-1);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(text).toContain("Must");
    expect(text).toContain("P1, P2");
  });

  it("keeps accented and special characters (AC10.4)", async () => {
    const text = (await pdfPages(await renderPdf(buildExport()))).join(" ");

    expect(text).toContain("Gestão Clínica");
    expect(text).toContain("Saúde");
    expect(text).toContain("acentuação");
    expect(text).toContain("Über-Krankenhaus em São Paulo");
  });

  it("numbers every page (AC10.3)", async () => {
    const pages = await pdfPages(await renderPdf(buildExport()));

    expect(pages.length).toBeGreaterThan(1);
    pages.forEach((page, i) => expect(page).toContain(`Page ${i + 1} of ${pages.length}`));
  });

  it("wraps long text instead of cutting it, without splitting table rows (AC10.3)", async () => {
    const long = "Long requirement text that must wrap across several lines. ".repeat(20);
    const requirements = Array.from({ length: 40 }, (_, i) => ({
      code: `FR${i + 1}`,
      type: "functional" as const,
      description: `${long}ENDMARK${i + 1}`,
      moscow: "must" as const,
      priority: "high" as const,
      derivedFrom: ["C1" as const],
    }));

    const pages = await pdfPages(await renderPdf(buildExport({ requirements })));

    // Every row ends on the same page it starts on.
    for (let i = 1; i <= 40; i++) {
      const start = pages.findIndex((page) => new RegExp(`\\bFR${i}\\b`).test(page));
      const end = pages.findIndex((page) => new RegExp(`\\bENDMARK${i}\\b`).test(page));
      expect(start).toBeGreaterThan(-1);
      expect(end).toBe(start);
    }
  });

  it("notes that requirements were not generated yet (AC10.5)", async () => {
    const text = (await pdfPages(await renderPdf(buildExport({ requirements: [] })))).join(" ");

    expect(text).toContain("Existing Solutions");
    expect(text).toContain("Requirements have not been generated yet.");
    expect(text).not.toContain("Functional requirements");
  });
});
