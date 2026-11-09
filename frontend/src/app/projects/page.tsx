import Link from "next/link";
import { listProjects } from "@/lib/api";
import { EmptyDashboard } from "../_dashboard/EmptyDashboard";
import { ProjectList } from "../_dashboard/ProjectList";

export default async function ProjectsPage() {
  const projects = await listProjects();

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Create a project to generate its PATHY persona and requirements.
          </p>
        </div>
        {projects.length > 0 && (
          <Link href="/projects/new" className="btn-primary">
            New Project
          </Link>
        )}
      </div>

      {projects.length === 0 ? (
        <EmptyDashboard />
      ) : (
        <ProjectList projects={projects} />
      )}
    </main>
  );
}
