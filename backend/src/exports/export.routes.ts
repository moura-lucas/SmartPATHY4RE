import { Router } from "express";
import { exportFileName, exportFormatSchema } from "@smartpathy/shared";
import { renderJson } from "./export.json.js";
import { renderPdf } from "./export.pdf.js";
import type { ExportService } from "./export.service.js";

const CONTENT_TYPES = {
  json: "application/json; charset=utf-8",
  pdf: "application/pdf",
} as const;

export function exportRoutes(service: ExportService) {
  const router = Router();

  // AC9.1 / AC10.1
  router.get("/:id/export", async (req, res) => {
    const format = exportFormatSchema.safeParse(req.query.format);
    if (!format.success) {
      res.status(400).json({ error: 'Unsupported export format. Use "json" or "pdf".' });
      return;
    }

    const result = await service.load(req.params.id);
    switch (result.status) {
      case "project_not_found":
        res.status(404).json({ error: "Project not found." });
        return;
      case "persona_missing": // AC9.5 / AC10.5
        res.status(409).json({
          error: "The project does not have a persona yet. Generate the PATHY persona first.",
        });
        return;
      case "ready": {
        const { data } = result;
        const body = format.data === "json" ? renderJson(data) : await renderPdf(data);
        const fileName = exportFileName(data.project.name, new Date(data.exportedAt), format.data);
        res
          .status(200)
          .type(CONTENT_TYPES[format.data])
          .attachment(fileName)
          .send(body);
      }
    }
  });

  return router;
}
