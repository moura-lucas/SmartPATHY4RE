import Link from "next/link";
import { listProjects } from "@/lib/api";
import { DashboardStats } from "./_dashboard/DashboardStats";
import { EmptyDashboard } from "./_dashboard/EmptyDashboard";
import { ProjectList } from "./_dashboard/ProjectList";

export default async function Dashboard() {
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
        {/* AC8.4. The empty state has its own, more prominent button (AC8.5). */}
        {projects.length > 0 && (
          <Link href="/projects/new" className="btn-primary">
            New Project
          </Link>
        )}
      </div>

      {projects.length === 0 ? (
        <EmptyDashboard />
      ) : (
        <>
          <DashboardStats projects={projects} />
          <ProjectList projects={projects} />
        </>
      )}
    </main>
  );
}
