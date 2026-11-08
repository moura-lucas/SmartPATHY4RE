"use client";

import { useRouter } from "next/navigation";
import { useRef, type ReactNode } from "react";
import { GenerationProgress } from "@/app/_generation/GenerationProgress";
import { useGeneration } from "@/app/_generation/useGeneration";
import { generateRequirements } from "@/lib/api";
import { personaQuery } from "@/lib/personas";

export function GenerateRequirementsButton({
  projectId,
  personaId,
  hasRequirements,
  children,
}: {
  projectId: string;
  /** AC12.4: the persona the requirements are generated from. */
  personaId: string;
  /** Whether this persona already has requirements. */
  hasRequirements: boolean;
  /** Other actions shown beside the button. */
  children?: ReactNode;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  // AC5.10: on failure the persona and the previous requirements stay intact.
  const generation = useGeneration(async () => {
    await generateRequirements(projectId, personaId);
    router.push(`/projects/${projectId}/requirements${personaQuery(personaId)}`); // AC5.11
  });

  function handleClick() {
    if (generation.locked) return;
    // AC5.8: replacing the current requirements needs confirmation.
    // Retry skips it: the user already confirmed (AC11.4).
    if (hasRequirements) dialogRef.current?.showModal();
    else void generation.start();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleClick}
          disabled={generation.locked} // AC5.9 / AC11.1
          aria-busy={generation.busy}
          className="btn-primary"
        >
          {generation.busy ? "Generating…" : "Generate Requirements"}
        </button>
        {children}
      </div>

      <GenerationProgress
        generation={generation}
        stepMessage="Generating requirements from the persona…"
      />

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
          <button
            type="submit"
            value="replace"
            onClick={() => void generation.start()}
            className="btn-primary"
          >
            Replace requirements
          </button>
        </form>
      </dialog>
    </div>
  );
}
