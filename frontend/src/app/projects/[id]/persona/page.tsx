import Link from "next/link";

// Placeholder: the persona generation flow is implemented in US3.
export default async function PersonaPage({
  params,
}: PageProps<"/projects/[id]/persona">) {
  const { id } = await params;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link
        href={`/projects/${id}`}
        className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
      >
        ← Project
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">PATHY Persona</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Persona generation is coming in US3.
      </p>
    </main>
  );
}
