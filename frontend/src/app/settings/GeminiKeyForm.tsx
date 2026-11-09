"use client";

import { validateGeminiKey, type GeminiKeyStatusDto } from "@smartpathy/shared";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { DIALOG_CLASS, Field, useModal } from "@/app/_dialog/modal";
import { deleteGeminiKey, saveGeminiKey } from "@/lib/api";

export function GeminiKeyForm({ status }: { status: GeminiKeyStatusDto }) {
  const router = useRouter();
  const [editing, setEditing] = useState(!status.hasKey);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [refreshing, startRefresh] = useTransition();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const validation = validateGeminiKey({ apiKey: new FormData(form).get("apiKey") });
    if (!validation.success) {
      setError(validation.fieldErrors.apiKey?.[0] ?? null);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const result = await saveGeminiKey(validation.data.apiKey);
      if (result.ok) {
        form.reset();
        setEditing(false);
        startRefresh(() => router.refresh());
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the key.");
    }
    setSaving(false);
  }

  return (
    <section aria-labelledby="gemini-key-heading" className="mt-8">
      <h2 id="gemini-key-heading" className="text-lg font-semibold">
        Gemini API key
      </h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        With your own key, generations use your Google account and have no daily limit here. It is
        stored encrypted and is never shown again. You can create one in{" "}
        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noreferrer"
          className="underline hover:no-underline"
        >
          Google AI Studio
        </a>
        .
      </p>

      {status.hasKey ? (
        <p className="mt-4 text-sm">
          Your key: <span className="font-mono">••••••••{status.last4}</span>
        </p>
      ) : (
        <p className="mt-4 text-sm">
          You are using the shared key: {status.usedToday} of {status.dailyLimit} free generations
          used today.
        </p>
      )}

      {editing ? (
        <form onSubmit={handleSubmit} noValidate className="mt-4 flex flex-col gap-4">
          <Field
            label={status.hasKey ? "New key" : "Your key"}
            name="apiKey"
            required
            errors={error ? [error] : undefined}
          >
            <input
              id="apiKey"
              name="apiKey"
              type="password"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={error ? true : undefined}
              className="input"
            />
          </Field>
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Checking…" : "Save key"}
            </button>
            {status.hasKey && (
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setError(null);
                }}
                disabled={saving} // the answer would arrive after the form is gone
                className="btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      ) : (
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setEditing(true)}
            disabled={refreshing}
            className="btn-secondary"
          >
            Replace key
          </button>
          <button
            type="button"
            onClick={() => setRemoving(true)}
            disabled={refreshing}
            className="btn-secondary text-red-600 dark:text-red-400"
          >
            Remove key
          </button>
        </div>
      )}

      {removing && (
        <RemoveDialog
          dailyLimit={status.dailyLimit}
          onClose={() => setRemoving(false)}
          onRemoved={() => {
            setRemoving(false);
            setEditing(true);
            startRefresh(() => router.refresh());
          }}
        />
      )}
    </section>
  );
}

function RemoveDialog({
  dailyLimit,
  onClose,
  onRemoved,
}: {
  dailyLimit: number;
  onClose: () => void;
  onRemoved: () => void;
}) {
  const modal = useModal(onClose);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setBusy(true);
    setError(null);
    try {
      await deleteGeminiKey();
      onRemoved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove the key.");
      setBusy(false);
    }
  }

  return (
    <dialog
      {...modal}
      aria-labelledby="remove-key-title"
      aria-describedby="remove-key-description"
      className={DIALOG_CLASS}
    >
      <h2 id="remove-key-title" className="text-lg font-semibold">
        Remove your key?
      </h2>
      <p id="remove-key-description" className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Generations will go back to the shared key, limited to {dailyLimit} per day.
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
          disabled={busy}
          className="btn-primary"
        >
          {busy ? "Removing…" : "Remove key"}
        </button>
      </div>
    </dialog>
  );
}
