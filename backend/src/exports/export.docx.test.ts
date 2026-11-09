import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { buildExport, buildExportedPersona } from "./export.fixtures.js";
import { renderDocx } from "./export.docx.js";

async function documentXml(data = buildExport()) {
  const zip = await JSZip.loadAsync(await renderDocx(data));
  return zip.file("word/document.xml")!.async("string");
}

/** Text of each paragraph with its style. */
function paragraphs(xml: string) {
  return [...xml.matchAll(/<w:p>(.*?)<\/w:p>/gs)].map(([, body]) => ({
    style: /<w:pStyle w:val="([^"]+)"/.exec(body!)?.[1],
    text: [...body!.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map(([, t]) => t).join(""),
  }));
}

describe("renderDocx", () => {
  it("uses the editor's heading styles, in the same order as the PDF (AC16.2)", async () => {
    const headings = paragraphs(await documentXml()).filter((p) => p.style?.startsWith("Heading"));

    expect(headings.map((p) => `${p.style}:${p.text}`)).toEqual([
      "Heading1:Gestão Clínica",
      "Heading2:PATHY persona: Maria",
      "Heading3:Who",
      "Heading3:Context",
      "Heading3:Experience with Technology",
      "Heading3:Problems",
      "Heading3:Existing Solutions",
      "Heading2:Requirements: Maria",
      "Heading3:Functional requirements (2)",
      "Heading3:Non-functional requirements (1)",
    ]);
  });

  it("defines the heading styles it uses (AC16.2)", async () => {
    const zip = await JSZip.loadAsync(await renderDocx(buildExport()));
    const styles = await zip.file("word/styles.xml")!.async("string");

    for (const id of ["Heading1", "Heading2", "Heading3"]) {
      expect(styles).toContain(`w:styleId="${id}"`);
    }
  });

  it("uses native tables, repeating the header on each page (AC16.2)", async () => {
    const xml = await documentXml();

    expect(xml.match(/<w:tbl>/g)).toHaveLength(2);
    expect(xml).toContain("<w:tblHeader/>");
    const text = paragraphs(xml).map((p) => p.text);
    for (const part of ["Code", "Description", "MoSCoW", "Priority", "Derived from", "FR1", "P1, P2"]) {
      expect(text).toContain(part);
    }
  });

  it("preserves accents (AC16.5)", async () => {
    const xml = await documentXml();

    expect(xml).toContain("Gestão Clínica");
    expect(xml).toContain("Über-Krankenhaus em São Paulo");
  });

  it("removes characters that are invalid in XML (AC16.5)", async () => {
    const base = buildExport();
    const xml = await documentXml({
      ...base,
      project: { ...base.project, description: "Before\u0008After\u000Bend" },
    });

    expect(xml).toContain("BeforeAfterend");
    expect(xml).not.toMatch(/[\u0008\u000B]/);
  });

  it("keeps line breaks in long text", async () => {
    const base = buildExport();
    const xml = await documentXml({
      ...base,
      project: { ...base.project, description: "First line\nSecond line" },
    });

    expect(xml).toMatch(/First line<\/w:t>.*<w:br\/>.*Second line/s);
  });

  it("marks only the requirements the user edited (AC14.5)", async () => {
    const persona = buildExportedPersona();
    const [first, ...others] = persona.functionalRequirements!;

    expect(paragraphs(await documentXml()).map((p) => p.text)).not.toContain("edited");
    const marked = await documentXml(
      buildExport({
        personas: [{ ...persona, functionalRequirements: [{ ...first!, edited: true }, ...others] }],
      }),
    );
    expect(paragraphs(marked).map((p) => p.text)).toContain("edited");
  });

  describe("content selection (AC15.5 / AC16.1)", () => {
    it("leaves out the profile when it was deselected", async () => {
      const { profile: _omit, ...persona } = buildExportedPersona();

      const xml = await documentXml(buildExport({ personas: [persona] }));

      expect(xml).not.toContain("PATHY persona: Maria");
      expect(xml).not.toContain("Existing Solutions");
      expect(xml).toContain("Requirements: Maria");
    });

    it("leaves out a deselected requirement type", async () => {
      const { nonFunctionalRequirements: _omit, ...persona } = buildExportedPersona();

      const xml = await documentXml(buildExport({ personas: [persona] }));

      expect(xml).toContain("Functional requirements (2)");
      expect(xml).not.toContain("Non-functional requirements");
    });

    it("notes when nothing was generated yet (AC10.5)", async () => {
      const xml = await documentXml(
        buildExport({
          personas: [
            buildExportedPersona({ functionalRequirements: [], nonFunctionalRequirements: [] }),
          ],
        }),
      );

      expect(xml).toContain("Requirements have not been generated yet.");
      expect(xml.match(/<w:tbl>/g)).toBeNull();
    });

    it("includes every chosen persona, each on a new page", async () => {
      const xml = await documentXml(
        buildExport({
          personas: [
            buildExportedPersona(),
            buildExportedPersona({
              name: "Bruno",
              profile: { ...buildExportedPersona().profile!, name: "Bruno" },
            }),
          ],
        }),
      );

      expect(xml.indexOf("Requirements: Maria")).toBeLessThan(xml.indexOf("PATHY persona: Bruno"));
      expect(xml).toContain("<w:pageBreakBefore");
    });
  });
});
