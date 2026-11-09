"use client";

import {
  EXPORT_CONTENTS,
  EXPORT_FORMATS,
  type ExportContent,
  type ExportFormat,
  type TechExperienceLevel,
} from "@smartpathy/shared";
import { useState, type ReactNode } from "react";
import { exportUrl } from "@/lib/api";
import { LEVEL_LABELS } from "@/lib/labels";

export interface ExportablePersona {
  id: string;
  name: string;
  techExperienceLevel: TechExperienceLevel;
  functionalCount: number;
  nonFunctionalCount: number;
}

const FORMAT_LABELS: Record<ExportFormat, string> = {
  json: "JSON",
  pdf: "PDF",
  docx: "DOCX",
  xlsx: "XLSX",
};

const CONTENT_LABELS: Record<ExportContent, string> = {
  profile: "PATHY persona",
  functional: "Functional requirements",
  non_functional: "Non-functional requirements",
};

const NOTHING_SELECTED = "Select at least one persona and one type of content to export.";
const NOTHING_TO_EXPORT = "The selected content has no items to export.";

function toggled<T>(items: T[], item: T): T[] {
  return items.includes(item) ? items.filter((other) => other !== item) : [...items, item];
}

/** AC15.1 to AC15.5: format, content and a summary that follows the selection. */
export function ExportForm({
  projectId,
  personas,
}: {
  projectId: string;
  personas: ExportablePersona[];
}) {
  const [format, setFormat] = useState<ExportFormat>("pdf");
  // AC15.2: everything is selected by default.
  const [personaIds, setPersonaIds] = useState(() => personas.map(({ id }) => id));
  const [include, setInclude] = useState<ExportContent[]>([...EXPORT_CONTENTS]);

  const chosen = personas.filter(({ id }) => personaIds.includes(id));
  const sum = (content: ExportContent, count: (persona: ExportablePersona) => number) =>
    include.includes(content) ? chosen.reduce((total, persona) => total + count(persona), 0) : 0;
  const profiles = sum("profile", () => 1);
  const functional = sum("functional", (persona) => persona.functionalCount);
  const nonFunctional = sum("non_functional", (persona) => persona.nonFunctionalCount);
  const total = profiles + functional + nonFunctional;

  // AC15.4
  const blockedReason =
    chosen.length === 0 || include.length === 0
      ? NOTHING_SELECTED
      : total === 0
        ? NOTHING_TO_EXPORT
        : null;

  return (
    <div className="mt-6 flex flex-col gap-8">
      <Group legend="Format">
        {EXPORT_FORMATS.map((option) => (
          <Choice
            key={option}
            type="radio"
            name="format"
            label={FORMAT_LABELS[option]}
            checked={format === option}
            onChange={() => setFormat(option)}
          />
        ))}
      </Group>

      {personas.length > 1 && (
        <Group legend="Personas">
          {personas.map((persona) => (
            <Choice
              key={persona.id}
              type="checkbox"
              label={`${persona.name} · ${LEVEL_LABELS[persona.techExperienceLevel]}`}
              checked={personaIds.includes(persona.id)}
              onChange={() => setPersonaIds((ids) => toggled(ids, persona.id))}
            />
          ))}
        </Group>
      )}

      <Group legend="Content">
        {EXPORT_CONTENTS.map((content) => (
          <Choice
            key={content}
            type="checkbox"
            label={CONTENT_LABELS[content]}
            checked={include.includes(content)}
            onChange={() => setInclude((items) => toggled(items, content))}
          />
        ))}
      </Group>

      {/* AC15.3 */}
      <section aria-labelledby="export-summary-heading">
        <h2 id="export-summary-heading" className="text-sm font-medium">
          Summary
        </h2>
        <dl
          aria-live="polite"
          className="mt-2 flex flex-col gap-1 rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800"
        >
          <SummaryRow label="PATHY personas" value={profiles} />
          <SummaryRow label="Functional requirements" value={functional} />
          <SummaryRow label="Non-functional requirements" value={nonFunctional} />
          <div className="mt-1 border-t border-zinc-200 pt-2 font-semibold dark:border-zinc-800">
            <SummaryRow label="Total" value={total} />
          </div>
        </dl>
      </section>

      <div className="flex flex-col items-start gap-2">
        {blockedReason ? (
          <>
            <button
              type="button"
              disabled
              aria-describedby="export-blocked-reason"
              className="btn-primary"
            >
              Export
            </button>
            <p id="export-blocked-reason" className="text-sm text-zinc-600 dark:text-zinc-400">
              {blockedReason}
            </p>
          </>
        ) : (
          // The backend answers with Content-Disposition: attachment, so the page stays.
          <a
            href={exportUrl(projectId, format, { personaIds, include })}
            download
            className="btn-primary"
          >
            Export
          </a>
        )}
      </div>
    </div>
  );
}

function Group({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="mt-2 flex flex-col gap-2">{children}</div>
    </fieldset>
  );
}

function Choice({
  type,
  name,
  label,
  checked,
  onChange,
}: {
  type: "radio" | "checkbox";
  name?: string;
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex min-w-0 items-start gap-2 text-sm break-words">
      <input
        type={type}
        name={name}
        checked={checked}
        onChange={onChange}
        className="mt-0.5 shrink-0"
      />
      <span className="min-w-0">{label}</span>
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between gap-4">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
