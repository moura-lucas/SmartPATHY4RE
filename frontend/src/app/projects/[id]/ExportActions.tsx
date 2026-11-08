"use client";

import { EXPORT_FORMATS, type ExportFormat, type PersonaDto } from "@smartpathy/shared";
import { useState } from "react";
import { exportUrl } from "@/lib/api";
import { LEVEL_LABELS } from "@/lib/labels";

const LABELS: Record<ExportFormat, string> = {
  json: "Export JSON",
  pdf: "Export PDF",
};

/** US9 / US10: downloads one persona and its requirements. */
export function ExportActions({
  projectId,
  personas,
}: {
  projectId: string;
  personas: Pick<PersonaDto, "id" | "name" | "techExperienceLevel">[];
}) {
  const hasPersona = personas.length > 0;
  const [selectedId, setSelectedId] = useState(personas[0]?.id);
  // With a single persona the backend already exports it.
  const personaId = personas.length > 1 ? selectedId : undefined;

  return (
    <section
      aria-labelledby="export-heading"
      className="mt-10 border-t border-zinc-200 pt-6 dark:border-zinc-800"
    >
      <h2 id="export-heading" className="text-lg font-semibold">
        Export
      </h2>
      <p id="export-description" className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        {hasPersona
          ? "Download the persona and its requirements as a JSON file or a PDF report."
          : // AC9.5 / AC10.5: the reason the options are disabled.
            "Generate the persona first to export it."}
      </p>
      {personas.length > 1 && (
        <div className="mt-4 flex flex-col gap-1.5">
          <label htmlFor="export-persona" className="text-sm font-medium">
            Persona to export
          </label>
          <select
            id="export-persona"
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
            className="input"
          >
            {personas.map((persona) => (
              <option key={persona.id} value={persona.id}>
                {persona.name} · {LEVEL_LABELS[persona.techExperienceLevel]}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-3">
        {EXPORT_FORMATS.map((format) =>
          hasPersona ? (
            // The backend answers with Content-Disposition: attachment, so the page stays.
            <a
              key={format}
              href={exportUrl(projectId, format, personaId)}
              download
              className="btn-secondary"
            >
              {LABELS[format]}
            </a>
          ) : (
            <button
              key={format}
              type="button"
              disabled
              aria-describedby="export-description"
              className="btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {LABELS[format]}
            </button>
          ),
        )}
      </div>
    </section>
  );
}
