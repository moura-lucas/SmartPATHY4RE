"use client";

import {
  validateUpdateProject,
  type ProjectDto,
  type UpdateProjectFieldErrors,
  type UpdateProjectInput,
} from "@smartpathy/shared";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { DIALOG_CLASS, Field, useModal } from "@/app/_dialog/modal";
import { deleteProject, updateProject } from "@/lib/api";

const OUTDATED_WARNING =
  "Project updated. The existing personas and requirements were generated from the previous context and were not changed. Generate them again if needed.";

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function contextChanged(project: ProjectDto, input: UpdateProjectInput): boolean {
  return (
    project.name !== input.name ||
    project.domain !== input.domain ||
    project.description !== input.description ||
    project.additionalContext !== (input.additionalContext ?? null)
  );
}

/** AC17.1 / AC17.3: the dialogs are only mounted while open, so each opening starts fresh. */
export function ProjectActions({
  project,
  personaCount,
  requirementCount,
}: {
  project: ProjectDto;
  personaCount: number;
  requirementCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState<"edit" | "delete" | null>(null);
  const [warning, setWarning] = useState(false);
  const [refreshing, startRefresh] = useTransition();

  function handleSaved(changed: boolean) {
    setOpen(null);
    // AC17.2: only warns; nothing is regenerated automatically.
    setWarning(changed && personaCount > 0);
    startRefresh(() => router.refresh());
  }

  return (
    <div className="mt-6 flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => {
            setWarning(false);
            setOpen("edit");
          }}
          disabled={refreshing}
          className="btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
        >
          Edit project
        </button>
        <button
          type="button"
          onClick={() => setOpen("delete")}
          disabled={refreshing}
          className="btn-secondary text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400"
        >
          Delete project
        </button>
      </div>

      {warning && (
        <p
          role="status"
          className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
        >
          {OUTDATED_WARNING}
        </p>
      )}

      {open === "edit" && (
        <EditDialog project={project} onClose={() => setOpen(null)} onSaved={handleSaved} />
      )}
      {open === "delete" && (
        <DeleteDialog
          project={project}
          personaCount={personaCount}
          requirementCount={requirementCount}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}

function EditDialog({
  project,
  onClose,
  onSaved,
}: {
  project: ProjectDto;
  onClose: () => void;
  onSaved: (changed: boolean) => void;
}) {
  const modal = useModal(onClose);
  const [errors, setErrors] = useState<UpdateProjectFieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const text = (key: string) => String(data.get(key) ?? "");
    // AC17.1: same shared schema as the backend.
    const validation = validateUpdateProject({
      name: text("name"),
      domain: text("domain"),
      description: text("description"),
      additionalContext: text("additionalContext"),
    });
    if (!validation.success) {
      setErrors(validation.fieldErrors);
      return;
    }

    setErrors({});
    setSaving(true);
    setSaveError(null);
    try {
      const result = await updateProject(project.id, validation.data);
      if (result.ok) {
        onSaved(contextChanged(project, validation.data));
        return;
      }
      setErrors(result.fieldErrors);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save the changes.");
    }
    setSaving(false);
  }

  const control = (name: keyof UpdateProjectFieldErrors) => ({
    id: name,
    name,
    "aria-invalid": errors[name] ? true : undefined,
    className: "input",
  });

  return (
    <dialog {...modal} aria-labelledby="edit-project-title" className={DIALOG_CLASS}>
      <h2 id="edit-project-title" className="text-lg font-semibold">
        Edit project
      </h2>
      <form onSubmit={handleSubmit} noValidate className="mt-4 flex flex-col gap-4">
        <Field label="Project name" name="name" required errors={errors.name}>
          <input {...control("name")} defaultValue={project.name} maxLength={120} autoComplete="off" />
        </Field>
        <Field label="Application domain" name="domain" required errors={errors.domain}>
          <input {...control("domain")} defaultValue={project.domain} maxLength={80} autoComplete="off" />
        </Field>
        <Field label="Description" name="description" required errors={errors.description}>
          <textarea {...control("description")} defaultValue={project.description} maxLength={5000} rows={5} />
        </Field>
        <Field
          label="Additional context"
          name="additionalContext"
          errors={errors.additionalContext}
        >
          <textarea
            {...control("additionalContext")}
            defaultValue={project.additionalContext ?? ""}
            maxLength={5000}
            rows={4}
          />
        </Field>

        {saveError && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {saveError}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </dialog>
  );
}

function DeleteDialog({
  project,
  personaCount,
  requirementCount,
  onClose,
}: {
  project: ProjectDto;
  personaCount: number;
  requirementCount: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const modal = useModal(onClose);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setDeleting(true);
    setError(null);
    try {
      await deleteProject(project.id);
      // AC17.4: the dashboard no longer lists it, and its indicators reflect that.
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the project.");
      setDeleting(false);
    }
  }

  return (
    <dialog
      {...modal}
      aria-labelledby="delete-project-title"
      aria-describedby="delete-project-description"
      className={DIALOG_CLASS}
    >
      <h2 id="delete-project-title" className="text-lg font-semibold break-words">
        Delete {project.name}?
      </h2>
      {/* AC17.3 */}
      <p id="delete-project-description" className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        This will permanently remove the project along with {plural(personaCount, "persona")} and{" "}
        {plural(requirementCount, "requirement")}. This cannot be undone.
      </p>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button type="button" onClick={onClose} className="btn-secondary" autoFocus>
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void handleConfirm()}
          disabled={deleting}
          className="btn-primary"
        >
          {deleting ? "Deleting…" : "Delete project"}
        </button>
      </div>
    </dialog>
  );
}
