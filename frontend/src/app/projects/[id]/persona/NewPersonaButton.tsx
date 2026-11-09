"use client";

import {
  TECH_EXPERIENCE_LEVELS,
  validateNewPersona,
  type NewPersonaFieldErrors,
  type NewPersonaInput,
} from "@smartpathy/shared";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { Field } from "@/app/_dialog/modal";
import { GenerationProgress } from "@/app/_generation/GenerationProgress";
import { useGeneration } from "@/app/_generation/useGeneration";
import { createPersona } from "@/lib/api";
import { LEVEL_LABELS } from "@/lib/labels";
import { personaQuery } from "@/lib/personas";

function readForm(form: HTMLFormElement) {
  const data = new FormData(form);
  const age = String(data.get("personaAge") ?? "").trim();
  return {
    techExperienceLevel: String(data.get("techExperienceLevel") ?? ""),
    personaName: String(data.get("personaName") ?? ""),
    personaAge: age === "" ? undefined : Number(age),
  };
}

/** AC12.1: only the profile is asked for; the application context comes from the project. */
export function NewPersonaButton({
  projectId,
  children,
}: {
  projectId: string;
  /** Other actions shown beside the button. */
  children?: ReactNode;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  // AC11.4: Retry resends what was submitted, even if the form changes meanwhile.
  const submitted = useRef<NewPersonaInput | null>(null);
  const [errors, setErrors] = useState<NewPersonaFieldErrors>({});

  const generation = useGeneration(async () => {
    const persona = await createPersona(projectId, submitted.current!);
    router.push(`/projects/${projectId}/persona${personaQuery(persona.id)}`);
  });

  function open() {
    setErrors({});
    formRef.current?.reset();
    dialogRef.current?.showModal();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateNewPersona(readForm(event.currentTarget));
    if (!validation.success) {
      setErrors(validation.fieldErrors);
      return;
    }
    submitted.current = validation.data;
    dialogRef.current?.close();
    void generation.start();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={open}
          disabled={generation.locked} // AC11.1
          aria-busy={generation.busy}
          className="btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
        >
          Generate new persona
        </button>
        {children}
      </div>

      <GenerationProgress generation={generation} stepMessage="Generating PATHY persona…" />

      <dialog
        ref={dialogRef}
        aria-labelledby="new-persona-title"
        aria-describedby="new-persona-description"
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border border-zinc-200 bg-white p-6 text-zinc-900 shadow-xl backdrop:bg-black/50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
      >
        <h2 id="new-persona-title" className="text-lg font-semibold">
          Generate new persona
        </h2>
        <p id="new-persona-description" className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          The application context comes from the project. Existing personas are kept.
        </p>

        <form ref={formRef} onSubmit={handleSubmit} noValidate className="mt-4 flex flex-col gap-4">
          <Field label="Technology experience level" name="techExperienceLevel" required errors={errors.techExperienceLevel}>
            <select id="techExperienceLevel" name="techExperienceLevel" defaultValue="" className="input">
              <option value="" disabled>
                Select…
              </option>
              {TECH_EXPERIENCE_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {LEVEL_LABELS[level]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Name" name="personaName" errors={errors.personaName}>
            <input id="personaName" name="personaName" type="text" maxLength={80} className="input" />
          </Field>
          <Field label="Age" name="personaAge" errors={errors.personaAge}>
            <input id="personaAge" name="personaAge" type="number" min={1} max={120} className="input" />
          </Field>

          <div className="mt-2 flex flex-wrap justify-end gap-3">
            <button type="button" onClick={() => dialogRef.current?.close()} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Generate persona
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
