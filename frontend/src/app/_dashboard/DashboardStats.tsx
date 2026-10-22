import type { ProjectSummaryDto } from "@smartpathy/shared";

/** AC8.2: totals across all projects. */
export function DashboardStats({ projects }: { projects: ProjectSummaryDto[] }) {
  const stats: [string, number][] = [
    ["Projects", projects.length],
    ["Generated personas", projects.filter((p) => p.hasPersona).length],
    ["Generated requirements", projects.reduce((sum, p) => sum + p.requirementsCount, 0)],
  ];

  return (
    <section aria-label="Overview" className="mt-8">
      <dl className="grid grid-cols-3 gap-3 sm:gap-4">
        {stats.map(([label, value]) => (
          <div
            key={label}
            className="flex min-w-0 flex-col-reverse justify-end rounded-lg border border-zinc-200 p-3 sm:p-4 dark:border-zinc-800"
          >
            <dt className="text-xs font-medium break-words text-zinc-600 sm:text-sm dark:text-zinc-400">{label}</dt>
            <dd className="text-2xl font-semibold tabular-nums sm:text-3xl">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
