"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import {
  TECH_EXPERIENCE_LEVELS,
  validateCreateProject,
  type CreateProjectFieldErrors,
  type CreateProjectInput,
  type TechExperienceLevel,
} from "@smartpathy/shared";
import { createProject } from "@/lib/api";

type FieldName = keyof CreateProjectInput;

// Same order as the form, used to focus the first invalid field.
const FIELD_ORDER: FieldName[] = [
  "name",
  "domain",
  "description",
  "additionalContext",
  "personaName",
  "personaAge",
  "techExperienceLevel",
];

const LEVEL_LABELS: Record<TechExperienceLevel, string> = {
  low: "Low",
  moderate: "Moderate",
  high: "High",
};

function readForm(form: HTMLFormElement) {
  const data = new FormData(form);
  const text = (key: FieldName) => String(data.get(key) ?? "");
  const age = text("personaAge").trim();
  return {
    name: text("name"),
    domain: text("domain"),
    description: text("description"),
    additionalContext: text("additionalContext"),
    personaName: text("personaName"),
    personaAge: age === "" ? undefined : Number(age),
    techExperienceLevel: text("techExperienceLevel"),
  };
}

export default function NewProjectPage() {
  const router = useRouter();
  const [errors, setErrors] = useState<CreateProjectFieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function showErrors(form: HTMLFormElement, fieldErrors: CreateProjectFieldErrors) {
    setErrors(fieldErrors);
    const first = FIELD_ORDER.find((field) => fieldErrors[field]);
    if (first) (form.elements.namedItem(first) as HTMLElement | null)?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    // AC2.2 / AC2.4: same shared schema as the backend.
    const validation = validateCreateProject(readForm(form));
    if (!validation.success) {
      showErrors(form, validation.fieldErrors);
      return;
    }

    setErrors({});
    setSubmitError(null);
    setSubmitting(true);
    try {
      const result = await createProject(validation.data);
      if (result.ok) {
        router.push(`/projects/${result.project.id}`);
        return;
      }
      showErrors(form, result.fieldErrors);
    } catch {
      setSubmitError("Could not create the project. Please try again.");
    }
    setSubmitting(false);
  }

  function clearError(event: FormEvent<HTMLFormElement>) {
    const name = (event.target as HTMLInputElement).name as FieldName;
    if (!errors[name]) return;
    setErrors((current) => {
      const next = { ...current };
      delete next[name];
      return next;
    });
  }

  const control = (name: FieldName) => ({
    id: name,
    name,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
    className: "input",
  });

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold">New Project</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Describe the application. This context is used to generate the PATHY
        persona. Fields marked with * are required.
      </p>

      <form
        noValidate
        onSubmit={handleSubmit}
        onInput={clearError}
        className="mt-8 flex flex-col gap-8"
      >
        <fieldset className="flex flex-col gap-5">
          <legend className="mb-4 text-lg font-medium">Project</legend>
          <Field label="Project name" name="name" required errors={errors.name}>
            <input {...control("name")} maxLength={120} autoComplete="off" />
          </Field>
          <Field label="Application domain" name="domain" required errors={errors.domain}>
            <input
              {...control("domain")}
              maxLength={80}
              placeholder="e.g. Healthcare, Education"
              autoComplete="off"
            />
          </Field>
          <Field label="Description" name="description" required errors={errors.description}>
            <textarea {...control("description")} maxLength={5000} rows={5} />
          </Field>
          <Field
            label="Additional context"
            name="additionalContext"
            errors={errors.additionalContext}
          >
            <textarea {...control("additionalContext")} maxLength={5000} rows={4} />
          </Field>
        </fieldset>

        <fieldset className="flex flex-col gap-5">
          <legend className="mb-4 text-lg font-medium">Persona</legend>
          <div className="grid gap-5 sm:grid-cols-[1fr_12rem]">
            <Field label="Persona name" name="personaName" errors={errors.personaName}>
              <input {...control("personaName")} maxLength={80} autoComplete="off" />
            </Field>
            <Field label="Persona age" name="personaAge" errors={errors.personaAge}>
              <input {...control("personaAge")} inputMode="numeric" autoComplete="off" />
            </Field>
          </div>
          <Field
            label="Technology experience level"
            name="techExperienceLevel"
            required
            errors={errors.techExperienceLevel}
          >
            <select {...control("techExperienceLevel")} defaultValue="">
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
        </fieldset>

        {submitError && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {submitError}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? "Creating…" : "Create Project"}
          </button>
          {/* AC2.8: navigation only, nothing is sent to the backend. */}
          <Link href="/" className="btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}

function Field({
  label,
  name,
  required = false,
  errors,
  children,
}: {
  label: string;
  name: FieldName;
  required?: boolean;
  errors?: string[] | undefined;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
        {required ? (
          <span aria-hidden="true" className="text-red-600 dark:text-red-400"> *</span>
        ) : (
          <span className="font-normal text-zinc-500"> (optional)</span>
        )}
      </label>
      {children}
      {errors?.[0] && (
        <p id={`${name}-error`} className="text-sm text-red-600 dark:text-red-400">
          {errors[0]}
        </p>
      )}
    </div>
  );
}
