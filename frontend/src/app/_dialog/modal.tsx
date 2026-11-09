"use client";

import { useEffect, useRef, type ReactNode } from "react";

export const DIALOG_CLASS =
  "m-auto max-h-[85vh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-lg border border-zinc-200 bg-white p-6 text-zinc-900 shadow-xl backdrop:bg-black/50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100";

/** Opens the native modal when mounted; `onClose` also fires for Escape. */
export function useModal(onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return { ref, onClose };
}

export function Field({
  label,
  name,
  required = false,
  errors,
  children,
}: {
  label: string;
  name: string;
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
      {errors?.map((message) => (
        <p key={message} className="text-sm text-red-600 dark:text-red-400">
          {message}
        </p>
      ))}
    </div>
  );
}
