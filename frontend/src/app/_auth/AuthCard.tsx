import type { ReactNode } from "react";

/** The frame shared by the login and registration screens. */
export function AuthCard({
  title,
  children,
  footer,
}: {
  title: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-sm px-4 py-16">
      <p className="text-sm font-semibold">SmartPATHY</p>
      <h1 className="mt-1 text-2xl font-semibold">{title}</h1>
      <div className="mt-8">{children}</div>
      <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">{footer}</p>
    </main>
  );
}
