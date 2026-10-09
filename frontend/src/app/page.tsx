import Link from "next/link";

export default function Dashboard() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Create a project to generate its PATHY persona and requirements.
          </p>
        </div>
        <Link href="/projects/new" className="btn-primary">
          New Project
        </Link>
      </div>
    </main>
  );
}
