"use client";

import {
  MOSCOW_LABELS,
  MOSCOW_VALUES,
  PATHY_SECTIONS,
  PRIORITIES,
  PRIORITY_LABELS,
  pathyFieldsOf,
  validateRequirementEdit,
  type RequirementDto,
  type RequirementEditFieldErrors,
} from "@smartpathy/shared";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { DIALOG_CLASS, useModal } from "@/app/_dialog/modal";
import { PencilIcon, TrashIcon } from "@/app/_layout/icons";
import { deleteRequirement, updateRequirement } from "@/lib/api";

/** AC14.1 / AC14.3: the dialogs are only mounted while open, so each opening starts fresh. */
export function RequirementActions({ requirement }: { requirement: RequirementDto }) {
  const router = useRouter();
  const [open, setOpen] = useState<"edit" | "delete" | null>(null);
  const [refreshing, startRefresh] = useTransition();

  function handleDone() {
    setOpen(null);
    startRefresh(() => router.refresh()); // AC14.3: updates the list and the counts
  }

  return (
    <div className="flex gap-1 whitespace-nowrap">
      <button
        type="button"
        onClick={() => setOpen("edit")}
        disabled={refreshing}
        aria-label={`Edit ${requirement.code}`}
        title="Edit"
        className="rounded-md p-1.5 text-brand hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-violet-300 dark:hover:bg-zinc-800"
      >
        <PencilIcon className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => setOpen("delete")}
        disabled={refreshing}
        aria-label={`Delete ${requirement.code}`}
        title="Delete"
        className="rounded-md p-1.5 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-zinc-800"
      >
        <TrashIcon className="size-4" />
      </button>

      {open === "edit" && (
        <EditDialog requirement={requirement} onClose={() => setOpen(null)} onSaved={handleDone} />
      )}
      {open === "delete" && (
        <DeleteDialog requirement={requirement} onClose={() => setOpen(null)} onDeleted={handleDone} />
      )}
    </div>
  );
}

function EditDialog({
  requirement,
  onClose,
  onSaved,
}: {
  requirement: RequirementDto;
  onClose: () => void;
  onSaved: () => void;
}) {
  const modal = useModal(onClose);
  const [errors, setErrors] = useState<RequirementEditFieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const titleId = `edit-${requirement.id}-title`;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    // AC14.2: same shared schema as the backend.
    const validation = validateRequirementEdit({
      description: String(data.get("description") ?? ""),
      moscow: data.get("moscow"),
      priority: data.get("priority"),
      derivedFrom: data.getAll("derivedFrom"),
    });
    if (!validation.success) {
      setErrors(validation.fieldErrors);
      return;
    }

    setErrors({});
    setSaving(true);
    setSaveError(null);
    try {
      const result = await updateRequirement(requirement.id, validation.data);
      if (result.ok) {
        onSaved();
        return;
      }
      setErrors(result.fieldErrors);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save the changes.");
    }
    setSaving(false);
  }

  return (
    <dialog {...modal} aria-labelledby={titleId} className={DIALOG_CLASS}>
      <h2 id={titleId} className="text-lg font-semibold">
        Edit {requirement.code}
      </h2>

      <form onSubmit={handleSubmit} noValidate className="mt-4 flex flex-col gap-4 whitespace-normal">
        <Field label="Description" htmlFor="description" errors={errors.description}>
          <textarea
            id="description"
            name="description"
            rows={4}
            defaultValue={requirement.description}
            aria-invalid={errors.description ? true : undefined}
            className="input"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="MoSCoW" htmlFor="moscow" errors={errors.moscow}>
            <select id="moscow" name="moscow" defaultValue={requirement.moscow} className="input">
              {MOSCOW_VALUES.map((value) => (
                <option key={value} value={value}>
                  {MOSCOW_LABELS[value]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Priority" htmlFor="priority" errors={errors.priority}>
            <select id="priority" name="priority" defaultValue={requirement.priority} className="input">
              {PRIORITIES.map((value) => (
                <option key={value} value={value}>
                  {PRIORITY_LABELS[value]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <fieldset aria-invalid={errors.derivedFrom ? true : undefined}>
          <legend className="text-sm font-medium">Derived from</legend>
          <div className="mt-2 flex flex-col gap-3">
            {PATHY_SECTIONS.map(({ key, label }) => (
              <div key={key}>
                <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{label}</p>
                <div className="mt-1 grid gap-1 sm:grid-cols-2">
                  {pathyFieldsOf(key).map((field) => (
                    <label key={field.code} className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="derivedFrom"
                        value={field.code}
                        defaultChecked={requirement.derivedFrom.includes(field.code)}
                        className="mt-0.5"
                      />
                      <span>
                        <span className="font-mono text-xs font-semibold">{field.code}</span>{" "}
                        {field.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <FieldErrors errors={errors.derivedFrom} />
        </fieldset>

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
  requirement,
  onClose,
  onDeleted,
}: {
  requirement: RequirementDto;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const modal = useModal(onClose);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleId = `delete-${requirement.id}-title`;
  const descriptionId = `delete-${requirement.id}-description`;

  async function handleConfirm() {
    setDeleting(true);
    setError(null);
    try {
      await deleteRequirement(requirement.id);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the requirement.");
      setDeleting(false);
    }
  }

  return (
    <dialog {...modal} aria-labelledby={titleId} aria-describedby={descriptionId} className={DIALOG_CLASS}>
      <h2 id={titleId} className="text-lg font-semibold">
        Delete {requirement.code}?
      </h2>
      <p id={descriptionId} className="mt-2 text-sm whitespace-normal text-zinc-600 dark:text-zinc-400">
        This requirement will be permanently removed. The other requirements keep their codes.
      </p>
      {error && (
        <p role="alert" className="mt-3 text-sm whitespace-normal text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="btn-secondary"
          autoFocus
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void handleConfirm()}
          disabled={deleting}
          className="btn-primary"
        >
          {deleting ? "Deleting…" : "Delete requirement"}
        </button>
      </div>
    </dialog>
  );
}

function Field({
  label,
  htmlFor,
  errors,
  children,
}: {
  label: string;
  htmlFor: string;
  errors?: string[] | undefined;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      <FieldErrors errors={errors} />
    </div>
  );
}

function FieldErrors({ errors }: { errors?: string[] | undefined }) {
  return errors?.map((message) => (
    <p key={message} className="mt-1 text-sm text-red-600 dark:text-red-400">
      {message}
    </p>
  ));
}
