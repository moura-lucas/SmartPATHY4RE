"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useGenerationLock } from "@/app/_generation/GenerationLock";
import { deletePersona } from "@/lib/api";

/** AC12.5: deletes the persona and its requirements; the last persona cannot be deleted. */
export function DeletePersonaButton({
  projectId,
  personaId,
  personaName,
  isLast,
}: {
  projectId: string;
  personaId: string;
  personaName: string;
  isLast: boolean;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { locked } = useGenerationLock();

  async function handleConfirm() {
    setDeleting(true);
    setError(null);
    try {
      await deletePersona(projectId, personaId);
      router.replace(`/projects/${projectId}/persona`);
      router.refresh(); // the URL may not change when deleting the default persona
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the persona.");
      setDeleting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        disabled={isLast || deleting || locked}
        aria-describedby={isLast ? "delete-persona-hint" : undefined}
        className="btn-secondary text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400"
      >
        {deleting ? "Deleting…" : "Delete persona"}
      </button>
      {isLast && (
        <p id="delete-persona-hint" className="text-sm text-zinc-600 dark:text-zinc-400">
          A project must keep at least one persona.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <dialog
        ref={dialogRef}
        aria-labelledby="delete-persona-title"
        aria-describedby="delete-persona-description"
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border border-zinc-200 bg-white p-6 text-zinc-900 shadow-xl backdrop:bg-black/50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
      >
        <h2 id="delete-persona-title" className="text-lg font-semibold break-words">
          Delete {personaName}?
        </h2>
        <p
          id="delete-persona-description"
          className="mt-2 text-sm text-zinc-600 dark:text-zinc-400"
        >
          This persona and the requirements generated from it will be permanently removed.
        </p>
        {/* method="dialog" closes the modal; Escape also cancels. */}
        <form method="dialog" className="mt-6 flex flex-wrap justify-end gap-3">
          <button type="submit" value="cancel" className="btn-secondary" autoFocus>
            Cancel
          </button>
          <button
            type="submit"
            value="delete"
            onClick={() => void handleConfirm()}
            className="btn-primary"
          >
            Delete persona
          </button>
        </form>
      </dialog>
    </>
  );
}
