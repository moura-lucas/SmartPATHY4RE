"use client";

import {
  EXPORT_CONTENTS,
  type ExportContent,
  type ExportFormat,
  type TechExperienceLevel,
} from "@smartpathy/shared";
import { useState, type ComponentType, type ReactNode } from "react";
import { ListIcon, ShieldCheckIcon, UploadIcon, UserIcon } from "@/app/_layout/icons";
import { exportUrl } from "@/lib/api";
import { LEVEL_LABELS } from "@/lib/labels";
import { FormatIcon } from "./FormatIcon";

export interface ExportablePersona {
  id: string;
  name: string;
  techExperienceLevel: TechExperienceLevel;
  functionalCount: number;
  nonFunctionalCount: number;
}

const FORMAT_OPTIONS: Record<ExportFormat, { label: string; description: string }> = {
  pdf: {
    label: "Export as PDF",
    description: "Export requirements in a structured PDF report.",
  },
  json: { label: "Export as JSON", description: "Export requirements in JSON format." },
  docx: {
    label: "Export as DOCX",
    description: "Export requirements in Microsoft Word format.",
  },
  xlsx: {
    label: "Export as XLSX",
    description: "Export requirements in Microsoft Excel format.",
  },
};

type IconComponent = ComponentType<{ className?: string }>;

// Display order of Figure 31; what is sent to the backend follows the selection.
const CONTENT_OPTIONS: { content: ExportContent; label: string; description: string; icon: IconComponent }[] = [
  {
    content: "functional",
    label: "Include Functional Requirements",
    description: "Include all generated functional requirements.",
    icon: ListIcon,
  },
  {
    content: "non_functional",
    label: "Include Non-functional Requirements",
    description: "Include all generated non-functional requirements.",
    icon: ShieldCheckIcon,
  },
  {
    content: "profile",
    label: "Include PATHY Persona",
    description: "Include the generated PATHY persona and all its attributes.",
    icon: UserIcon,
  },
];

const FORMAT_ORDER: ExportFormat[] = ["pdf", "json", "docx", "xlsx"];

const CHECKBOX_CLASS = "size-4 shrink-0 accent-brand";

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
    <div className="mt-6 flex flex-col gap-6">
      <Card
        title="1. Choose Export Format"
        hint="Select the format you want to export the requirements in."
      >
        <fieldset>
          <legend className="sr-only">Format</legend>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {FORMAT_ORDER.map((option) => {
              const { label, description } = FORMAT_OPTIONS[option];
              return (
                <label
                  key={option}
                  className="relative flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-zinc-200 p-4 pt-5 text-center has-[:checked]:border-brand has-[:checked]:bg-violet-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/40 dark:border-zinc-800 dark:has-[:checked]:border-violet-400 dark:has-[:checked]:bg-violet-950/40"
                >
                  <input
                    type="radio"
                    name="format"
                    checked={format === option}
                    onChange={() => setFormat(option)}
                    aria-labelledby={`format-${option}`}
                    aria-describedby={`format-${option}-description`}
                    className="absolute top-3 right-3 size-4 accent-brand"
                  />
                  <FormatIcon format={option} className="h-12 w-10" />
                  <span id={`format-${option}`} className="text-sm font-semibold">
                    {label}
                  </span>
                  <span
                    id={`format-${option}-description`}
                    className="text-xs text-zinc-600 dark:text-zinc-400"
                  >
                    {description}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </Card>

      <Card
        title="2. Choose Content to Include"
        hint="Select the sections you want to include in the exported file."
      >
        <fieldset>
          <legend className="sr-only">Content</legend>
          <div className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
            {CONTENT_OPTIONS.map(({ content, label, description, icon }) => (
              <label key={content} className="flex cursor-pointer items-center gap-4 py-3">
                <input
                  type="checkbox"
                  checked={include.includes(content)}
                  onChange={() => setInclude((items) => toggled(items, content))}
                  aria-labelledby={`content-${content}`}
                  aria-describedby={`content-${content}-description`}
                  className={CHECKBOX_CLASS}
                />
                <IconTile icon={icon} />
                <span className="min-w-0 text-sm">
                  <span id={`content-${content}`} className="block font-semibold">
                    {label}
                  </span>
                  <span
                    id={`content-${content}-description`}
                    className="block text-zinc-600 dark:text-zinc-400"
                  >
                    {description}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {personas.length > 1 && (
          <fieldset className="mt-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <legend className="float-left mb-2 w-full text-sm font-semibold">Personas</legend>
            <div className="clear-both flex flex-col gap-2">
              {personas.map((persona) => (
                <label key={persona.id} className="flex min-w-0 cursor-pointer items-center gap-4 text-sm break-words">
                  <input
                    type="checkbox"
                    checked={personaIds.includes(persona.id)}
                    onChange={() => setPersonaIds((ids) => toggled(ids, persona.id))}
                    className={CHECKBOX_CLASS}
                  />
                  <span className="min-w-0">
                    {persona.name} · {LEVEL_LABELS[persona.techExperienceLevel]}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
      </Card>

      {/* AC15.3 */}
      <Card
        title="3. Export Summary"
        hint="Review the summary of the content to be exported."
        titleId="export-summary-heading"
      >
        <dl
          aria-live="polite"
          className="flex flex-col gap-3 rounded-lg border border-violet-100 bg-violet-50/50 p-4 text-sm dark:border-violet-950 dark:bg-violet-950/20"
        >
          <SummaryRow icon={ListIcon} label="Functional Requirements" value={functional} unit="requirement" />
          <SummaryRow
            icon={ShieldCheckIcon}
            label="Non-functional Requirements"
            value={nonFunctional}
            unit="requirement"
          />
          <SummaryRow icon={UserIcon} label="PATHY Persona" value={profiles} unit="persona" />
          <div className="flex justify-between gap-4 border-t border-zinc-200 pt-3 font-semibold dark:border-zinc-800">
            <dt>Total Items</dt>
            <dd className="text-brand dark:text-violet-300">
              {total} {total === 1 ? "item" : "items"}
            </dd>
          </div>
        </dl>
      </Card>

      <div className="flex flex-col items-center gap-2">
        {blockedReason ? (
          <>
            <button
              type="button"
              disabled
              aria-describedby="export-blocked-reason"
              className="btn-primary gap-2 px-8"
            >
              <UploadIcon className="size-4" />
              Export Requirements
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
            className="btn-primary gap-2 px-8"
          >
            <UploadIcon className="size-4" />
            Export Requirements
          </a>
        )}
      </div>
    </div>
  );
}

function Card({
  title,
  hint,
  titleId,
  children,
}: {
  title: string;
  hint: string;
  titleId?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={titleId}
      className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800"
    >
      <h2 id={titleId} className="font-semibold text-brand dark:text-violet-300">
        {title}
      </h2>
      <p className="mt-1 mb-4 text-sm text-zinc-600 dark:text-zinc-400">{hint}</p>
      {children}
    </section>
  );
}

function IconTile({ icon: TileIcon }: { icon: IconComponent }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-violet-200 bg-violet-50 text-brand dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300"
    >
      <TileIcon className="size-5" />
    </span>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  unit,
}: {
  icon: IconComponent;
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="flex min-w-0 items-center gap-3 font-medium">
        <IconTile icon={icon} />
        {label}
      </dt>
      <dd className="shrink-0">
        {value} {unit}
        {value === 1 ? "" : "s"}
      </dd>
    </div>
  );
}
