"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  pathyAnswer,
  pathyFieldPath,
  pathyFieldsOf,
  validatePersonaSections,
  type PathySection,
  type PersonaDto,
  type PersonaSections,
  type PersonaSectionsFieldErrors,
} from "@smartpathy/shared";
import { updatePersona } from "@/lib/api";

function sectionsOf(persona: PersonaDto): PersonaSections {
  const { who, context, experienceWithTechnology, problems, existingSolutions } = persona;
  return { who, context, experienceWithTechnology, problems, existingSolutions };
}

export function PersonaSection({
  persona,
  section,
  label,
  editing,
  disabled,
  savedMessage,
  onEdit,
  onCancel,
  onSaved,
}: {
  persona: PersonaDto;
  section: PathySection;
  label: string;
  editing: boolean;
  /** Another section is being edited (AC7.1). */
  disabled: boolean;
  /** Confirmation shown after this section was saved (AC7.3). */
  savedMessage: string | null;
  onEdit: () => void;
  onCancel: () => void;
  onSaved: (persona: PersonaDto) => void;
}) {
  const fields = pathyFieldsOf(section);
  const headingId = `section-${section}`;
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const wasEditing = useRef(editing);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<PersonaSectionsFieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Focus moves into the form when editing starts and back to "Edit" when it ends.
  useEffect(() => {
    if (editing) formRef.current?.querySelector("textarea")?.focus();
    else if (wasEditing.current) editButtonRef.current?.focus();
    wasEditing.current = editing;
  }, [editing]);

  function startEditing() {
    // AC7.1: pre-filled with the current values.
    setDraft(Object.fromEntries(fields.map((f) => [f.field, pathyAnswer(persona, f)])));
    setFieldErrors({});
    setError(null);
    onEdit();
  }

  function showErrors(errors: PersonaSectionsFieldErrors) {
    setFieldErrors(errors);
    const first = fields.find((f) => errors[pathyFieldPath(f)]);
    if (first) formRef.current?.querySelector<HTMLTextAreaElement>(`[name="${first.field}"]`)?.focus();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    const sections = { ...sectionsOf(persona), [section]: draft } as PersonaSections;

    // AC7.2: blocked before reaching the backend.
    const validation = validatePersonaSections(sections);
    if (!validation.success) {
      showErrors(validation.fieldErrors);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const result = await updatePersona(persona.projectId, validation.data);
      if (result.ok) onSaved(result.persona);
      else showErrors(result.fieldErrors);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the changes.");
    }
    setSaving(false);
  }

  return (
    <section
      aria-labelledby={headingId}
      className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-800"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={headingId} className="text-lg font-semibold">
          {label}
        </h2>
        {!editing && (
          <button
            ref={editButtonRef}
            type="button"
            onClick={startEditing}
            disabled={disabled}
            aria-label={`Edit ${label}`}
            className="btn-secondary h-8 px-3 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Edit
          </button>
        )}
      </div>

      {savedMessage && !editing && (
        <p
          role="status"
          className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
        >
          {savedMessage}
        </p>
      )}

      {editing ? (
        <form ref={formRef} onSubmit={handleSubmit} noValidate className="mt-4 flex flex-col gap-5">
          {fields.map((field) => {
            const path = pathyFieldPath(field);
            const inputId = `${section}-${field.field}`;
            const errors = fieldErrors[path];
            return (
              <div key={field.code} className="min-w-0">
                <label
                  htmlFor={inputId}
                  className="flex flex-wrap items-baseline gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-400"
                >
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
                    {field.code}
                  </span>{" "}
                  {field.label}
                </label>
                <textarea
                  id={inputId}
                  name={field.field}
                  value={draft[field.field] ?? ""}
                  onChange={(event) => {
                    const value = event.target.value;
                    setDraft((current) => ({ ...current, [field.field]: value }));
                  }}
                  aria-invalid={errors ? true : undefined}
                  aria-describedby={errors ? `${inputId}-error` : undefined}
                  rows={3}
                  className="input mt-1 min-h-20 [field-sizing:content]"
                />
                {errors && (
                  <p id={`${inputId}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors[0]}
                  </p>
                )}
              </div>
            );
          })}

          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={saving} aria-busy={saving} className="btn-primary">
              {saving ? "Saving…" : "Save"}
            </button>
            {/* AC7.4: the draft is discarded; the read-only view still has the previous values. */}
            <button type="button" onClick={onCancel} disabled={saving} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <dl className="mt-4 flex flex-col gap-5">
          {fields.map((field) => (
            <div key={field.code} className="min-w-0">
              <dt className="flex flex-wrap items-baseline gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
                  {field.code}
                </span>
                {field.label}
              </dt>
              {/* AC4.9: full text, keeping line breaks and wrapping long words. */}
              <dd className="mt-1 whitespace-pre-wrap break-words">{pathyAnswer(persona, field)}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
