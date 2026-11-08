"use client";

import { canGenerateMoreRequirements, MAX_REQUIREMENTS_PER_PERSONA } from "@smartpathy/shared";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { GenerationProgress } from "@/app/_generation/GenerationProgress";
import { useGeneration } from "@/app/_generation/useGeneration";
import { generateMoreRequirements } from "@/lib/api";

/** AC13.1: adds requirements for the selected persona, keeping the existing ones. */
export function GenerateMoreRequirementsButton({
  projectId,
  personaId,
  requirementsCount,
  children,
}: {
  projectId: string;
  personaId: string;
  requirementsCount: number;
  /** Other actions shown beside the button. */
  children?: ReactNode;
}) {
  const router = useRouter();
  const allowed = canGenerateMoreRequirements(requirementsCount);
  const generation = useGeneration(async () => {
    await generateMoreRequirements(projectId, personaId);
    router.refresh(); // AC13.5: shows the new requirements and the updated counts
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void generation.start()}
          disabled={generation.locked || !allowed} // AC11.1
          aria-busy={generation.busy}
          aria-describedby={allowed ? undefined : "more-requirements-limit"}
          className="btn-primary"
        >
          {generation.busy ? "Generating…" : "Generate more requirements"}
        </button>
        {children}
      </div>

      {!allowed && (
        <p id="more-requirements-limit" className="text-sm text-zinc-600 dark:text-zinc-400">
          A persona can have at most {MAX_REQUIREMENTS_PER_PERSONA} requirements.
        </p>
      )}

      {/* AC13.4: on failure the existing requirements stay on the screen, unchanged. */}
      <GenerationProgress
        generation={generation}
        stepMessage="Generating additional requirements…"
      />
    </div>
  );
}
