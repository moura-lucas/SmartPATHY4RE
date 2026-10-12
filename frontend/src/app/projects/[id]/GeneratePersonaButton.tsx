"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { generatePersona } from "@/lib/api";

export function GeneratePersonaButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (generating) return; // AC3.7: no duplicate requests
    setGenerating(true);
    setError(null);
    try {
      await generatePersona(projectId);
      router.push(`/projects/${projectId}/persona`); // AC3.9
      return; // keeps the button disabled during navigation
    } catch (err) {
      // AC3.8: the user stays on the project page, with its data intact.
      setError(err instanceof Error ? err.message : "Could not generate the persona.");
    }
    setGenerating(false);
  }

  return (
    <div className="mt-10 flex flex-col items-start gap-3">
      <button
        type="button"
        onClick={handleGenerate}
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
        {generating ? "Generating persona…" : "Generate PATHY Persona"}
      </button>

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
          <button type="button" onClick={handleGenerate} className="btn-secondary">
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
