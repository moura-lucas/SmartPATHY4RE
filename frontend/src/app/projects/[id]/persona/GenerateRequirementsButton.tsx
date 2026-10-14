"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { generateRequirements } from "@/lib/api";

export function GenerateRequirementsButton({
  projectId,
  hasRequirements,
  children,
}: {
  projectId: string;
  hasRequirements: boolean;
  /** Other actions shown beside the button. */
  children?: ReactNode;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (generating) return;
    // AC5.8: replacing the current requirements needs confirmation.
    if (hasRequirements) dialogRef.current?.showModal();
    else void generate();
  }

  async function generate() {
    if (generating) return; // AC5.9: no duplicate requests
    setGenerating(true);
    setError(null);
    try {
      await generateRequirements(projectId);
      router.push(`/projects/${projectId}/requirements`); // AC5.11
      return; // keeps the button disabled during navigation
    } catch (err) {
      // AC5.10: the persona and the previous requirements stay intact.
      setError(err instanceof Error ? err.message : "Could not generate the requirements.");
    }
    setGenerating(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleClick}
          disabled={generating}
          aria-busy={generating}
          className="btn-primary gap-2"
        >
          {generating && (
            <span
              aria-hidden="true"
              className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            />
          )}
          {generating ? "Generating requirements…" : "Generate Requirements"}
        </button>
        {children}
      </div>

      {generating && (
        <p role="status" className="text-sm text-zinc-600 dark:text-zinc-400">
          This may take up to a minute.
        </p>
      )}

      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 text-sm text-red-600 dark:text-red-400"
        >
          <span>{error}</span>
          {/* The user already confirmed the replacement: retry directly. */}
          <button type="button" onClick={generate} className="btn-secondary">
            Try again
          </button>
        </div>
      )}

      <dialog
        ref={dialogRef}
        aria-labelledby="replace-requirements-title"
        aria-describedby="replace-requirements-description"
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border border-zinc-200 bg-white p-6 text-zinc-900 shadow-xl backdrop:bg-black/50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
      >
        <h2 id="replace-requirements-title" className="text-lg font-semibold">
          Replace current requirements?
        </h2>
        <p
          id="replace-requirements-description"
          className="mt-2 text-sm text-zinc-600 dark:text-zinc-400"
        >
          This project already has requirements. Generating new ones will replace all of
          them, and this cannot be undone.
        </p>
        {/* method="dialog" closes the modal; Escape also cancels. */}
        <form method="dialog" className="mt-6 flex flex-wrap justify-end gap-3">
          <button type="submit" value="cancel" className="btn-secondary" autoFocus>
            Cancel
          </button>
          <button type="submit" value="replace" onClick={() => void generate()} className="btn-primary">
            Replace requirements
          </button>
        </form>
      </dialog>
    </div>
  );
}
