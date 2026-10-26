import { EXPORT_FORMATS, type ExportFormat } from "@smartpathy/shared";
import { exportUrl } from "@/lib/api";

const LABELS: Record<ExportFormat, string> = {
  json: "Export JSON",
  pdf: "Export PDF",
};

/** US9 / US10: downloads the persona and the requirements. */
export function ExportActions({
  projectId,
  hasPersona,
}: {
  projectId: string;
  hasPersona: boolean;
}) {
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
          ? "Download the persona and the requirements as a JSON file or a PDF report."
          : // AC9.5 / AC10.5: the reason the options are disabled.
            "Generate the persona first to export it."}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        {EXPORT_FORMATS.map((format) =>
          hasPersona ? (
            // The backend answers with Content-Disposition: attachment, so the page stays.
            <a key={format} href={exportUrl(projectId, format)} download className="btn-secondary">
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
