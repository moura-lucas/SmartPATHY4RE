import Link from "next/link";

/** AC15.1: the entry point to the export screen. */
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
          ? "Choose what to include and download it as a JSON file or a PDF report."
          : // AC9.5 / AC10.5: the reason the option is disabled.
            "Generate the persona first to export it."}
      </p>
      <div className="mt-4">
        {hasPersona ? (
          <Link href={`/projects/${projectId}/export`} className="btn-secondary">
            Export
          </Link>
        ) : (
          <button
            type="button"
            disabled
            aria-describedby="export-description"
            className="btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            Export
          </button>
        )}
      </div>
    </section>
  );
}
