import { useId, type ReactNode } from "react";
import { InfoIcon } from "./icons";

/** The light purple informational panel used across the screens of the thesis prototype. */
export function InfoCard({
  title,
  className = "",
  children,
}: {
  title: string;
  className?: string;
  children: ReactNode;
}) {
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className={`rounded-lg border border-violet-200 bg-violet-50 p-4 text-sm dark:border-violet-900 dark:bg-violet-950/40 ${className}`}
    >
      <h2
        id={titleId}
        className="flex items-center gap-2 font-semibold text-brand dark:text-violet-300"
      >
        <InfoIcon className="size-5 shrink-0" />
        {title}
      </h2>
      <div className="mt-2 text-zinc-600 dark:text-zinc-400">{children}</div>
    </section>
  );
}
