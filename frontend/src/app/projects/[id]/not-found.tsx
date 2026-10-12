import Link from "next/link";

// AC4.7: rendered by notFound() in the project page and its persona page.
export default function ProjectNotFound() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold">Project not found</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        The project you are looking for does not exist or was removed.
      </p>
      <Link href="/" className="btn-secondary mt-6">
        Back to dashboard
      </Link>
    </main>
  );
}
