import Link from "next/link";
import type { ReactNode } from "react";
import type { ProjectSummaryDto } from "@smartpathy/shared";
import { StageBadge } from "./StageBadge";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { dateStyle: "medium" });
}

/** AC8.1: already sorted newest first by the backend. */
export function ProjectList({
  projects,
  title = "Your projects",
  action,
}: {
  projects: ProjectSummaryDto[];
  title?: string;
  action?: ReactNode;
}) {
  return (
    <section aria-labelledby="projects-heading" className="mt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="projects-heading" className="text-lg font-semibold">
          {title}
        </h2>
        {action}
      </div>
      <ul className="mt-4 divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {projects.map((project) => (
          <li
            key={project.id}
            className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <h3 className="font-semibold break-words">{project.name}</h3>
              <p className="mt-1 text-sm text-zinc-600 break-words dark:text-zinc-400">
                {project.domain} · Created on{" "}
                <time dateTime={project.createdAt}>{formatDate(project.createdAt)}</time>
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <StageBadge stage={project.stage} />
                <span className="text-zinc-600 dark:text-zinc-400">
                  {project.requirementsCount}{" "}
                  {project.requirementsCount === 1 ? "requirement" : "requirements"}
                </span>
              </div>
            </div>
            {/* AC8.3 */}
            <Link
              href={`/projects/${project.id}`}
              aria-label={`Continue ${project.name}`}
              className="btn-secondary shrink-0 self-start sm:self-auto"
            >
              Continue
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
