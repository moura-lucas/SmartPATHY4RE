import Link from "next/link";

const STEPS: [string, string][] = [
  ["Create a project", "Describe the application, its domain and who will use it."],
  ["Generate the persona", "PATHY4RE builds a PATHY persona that you can review and edit."],
  ["Generate requirements", "Functional and non-functional requirements traced to the persona."],
  ["Export", "Take the persona and the requirements to your own documents."],
];

/** AC8.5: welcome message with the workflow stages. */
export function EmptyDashboard() {
  return (
    <section
      aria-labelledby="welcome-heading"
      className="mt-8 rounded-lg border border-zinc-200 p-6 sm:p-8 dark:border-zinc-800"
    >
      <h2 id="welcome-heading" className="text-xl font-semibold">
        Welcome to SmartPATHY
      </h2>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        You do not have any projects yet. Each project goes through these stages:
      </p>
      <ol className="mt-6 flex flex-col gap-4">
        {STEPS.map(([title, description], index) => (
          <li key={title} className="flex gap-3">
            <span
              aria-hidden="true"
              className="flex size-7 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              {index + 1}
            </span>
            <div>
              <p className="font-medium">{title}</p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
            </div>
          </li>
        ))}
      </ol>
      <Link href="/projects/new" className="btn-primary mt-8 h-12 px-6 text-base">
        New Project
      </Link>
    </section>
  );
}
