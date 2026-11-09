import { Router } from "express";
import {
  EXPORT_FORMATS,
  exportFileName,
  exportFormatSchema,
  exportSelectionSchema,
  type ExportFormat,
  type ProjectExport,
} from "@smartpathy/shared";
import { renderDocx } from "./export.docx.js";
import { renderJson } from "./export.json.js";
import { renderPdf } from "./export.pdf.js";
import type { ExportService } from "./export.service.js";
import { renderXlsx } from "./export.xlsx.js";

type Renderer = (data: ProjectExport) => Buffer | Promise<Buffer>;

const RENDERERS: Record<ExportFormat, { contentType: string; render: Renderer }> = {
  json: { contentType: "application/json; charset=utf-8", render: renderJson },
  pdf: { contentType: "application/pdf", render: renderPdf },
  docx: {
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    render: renderDocx,
  },
  xlsx: {
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    render: renderXlsx,
  },
};

const NOTHING_SELECTED = "Select at least one item to export.";

export function exportRoutes(service: ExportService) {
  const router = Router();

  // AC9.1 / AC10.1
  router.get("/:id/export", async (req, res) => {
    const format = exportFormatSchema.safeParse(req.query.format);
    if (!format.success) {
      res.status(400).json({
        error: `Unsupported export format. Use one of: ${EXPORT_FORMATS.join(", ")}.`,
      });
      return;
    }

    const selection = exportSelectionSchema.safeParse(req.query);
    if (!selection.success) {
      res.status(400).json({ error: NOTHING_SELECTED }); // AC15.4
      return;
    }

    const result = await service.load(req.params.id, selection.data);
    switch (result.status) {
      case "project_not_found":
        res.status(404).json({ error: "Project not found." });
        return;
      case "persona_missing": // AC9.5 / AC10.5
        res.status(409).json({
          error: "The project does not have a persona yet. Generate the PATHY persona first.",
        });
        return;
      case "persona_not_found":
        res.status(404).json({ error: "Persona not found." });
        return;
      case "nothing_to_export":
        res.status(400).json({ error: NOTHING_SELECTED }); // AC15.4
        return;
      case "ready": {
        const { data } = result;
        const { contentType, render } = RENDERERS[format.data];
        const body = await render(data);
        const fileName = exportFileName(data.project.name, new Date(data.exportedAt), format.data);
        res
          .status(200)
          .type(contentType)
          .attachment(fileName)
          .send(body);
      }
    }
  });

  return router;
}
