"use client";

import { useRouter } from "next/navigation";
import { GenerationProgress } from "@/app/_generation/GenerationProgress";
import { useGeneration } from "@/app/_generation/useGeneration";
import { generatePersona } from "@/lib/api";

export function GeneratePersonaButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  // AC11.4: Retry runs the same request, built from the stored project data.
  const generation = useGeneration(async () => {
    await generatePersona(projectId);
    router.push(`/projects/${projectId}/persona`); // AC3.9
  });

  return (
    <div className="mt-10 flex flex-col items-start gap-3">
      <button
        type="button"
        onClick={() => void generation.start()}
        disabled={generation.busy} // AC3.7 / AC11.1
        aria-busy={generation.busy}
        className="btn-primary"
      >
        {generation.busy ? "Generating…" : "Generate PATHY Persona"}
      </button>

      {/* AC3.8: on failure the user stays on the page, with its data intact. */}
      <GenerationProgress generation={generation} stepMessage="Generating PATHY persona…" />
    </div>
  );
}
