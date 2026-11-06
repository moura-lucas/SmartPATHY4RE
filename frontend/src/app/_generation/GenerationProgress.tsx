"use client";

import { useEffect, useRef } from "react";
import { DELAY_THRESHOLD_SECONDS, type Generation } from "./useGeneration";

function formatElapsed(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Progress, delay notice, error with Retry and the leave confirmation (US11). */
export function GenerationProgress({
  generation,
  stepMessage,
}: {
  generation: Generation;
  /** AC11.1: what is being generated, e.g. "Generating PATHY persona…". */
  stepMessage: string;
}) {
  const { status, error, elapsedSeconds, retry, leave } = generation;
  const delayed = status === "running" && elapsedSeconds > DELAY_THRESHOLD_SECONDS;

  return (
    <>
      {(status === "running" || status === "succeeded") && (
        <div className="flex flex-col gap-1 text-sm">
          <p role="status" className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
            />
            {stepMessage}
          </p>
          {/* AC11.2 */}
          {delayed && (
            <p className="text-zinc-600 dark:text-zinc-400">
              <span>Elapsed time: {formatElapsed(elapsedSeconds)}.</span>{" "}
              <span role="status">This may take up to about 1 minute.</span>
            </p>
          )}
        </div>
      )}

      {/* AC11.3 / AC11.4 */}
      {status === "failed" && error && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-3 text-sm text-red-600 dark:text-red-400"
        >
          <span>{error}</span>
          <button type="button" onClick={() => void retry()} className="btn-secondary">
            Retry
          </button>
        </div>
      )}

      <LeaveDialog
        open={leave.pendingHref !== null}
        onConfirm={leave.confirmLeave}
        onCancel={leave.cancelLeave}
      />
    </>
  );
}

/** AC11.5: confirmation before following an internal link during a generation. */
function LeaveDialog({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onCancel}
      aria-labelledby="leave-generation-title"
      aria-describedby="leave-generation-description"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border border-zinc-200 bg-white p-6 text-zinc-900 shadow-xl backdrop:bg-black/50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
    >
      <h2 id="leave-generation-title" className="text-lg font-semibold">
        Leave this page?
      </h2>
      <p
        id="leave-generation-description"
        className="mt-2 text-sm text-zinc-600 dark:text-zinc-400"
      >
        A generation is still in progress. If you leave now, its result may be lost.
      </p>
      {/* method="dialog" closes the modal; Escape also cancels. */}
      <form method="dialog" className="mt-6 flex flex-wrap justify-end gap-3">
        <button type="submit" value="stay" className="btn-secondary" autoFocus>
          Stay on page
        </button>
        <button type="submit" value="leave" onClick={onConfirm} className="btn-primary">
          Leave anyway
        </button>
      </form>
    </dialog>
  );
}
