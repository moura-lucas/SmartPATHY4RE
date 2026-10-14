import Link from "next/link";
import { notFound } from "next/navigation";
import { MOSCOW_LABELS, PRIORITY_LABELS } from "@smartpathy/shared";
import { getProject, getRequirements } from "@/lib/api";

// Placeholder: the full requirements view is implemented in US6.
export default async function RequirementsPage({
  params,
}: PageProps<"/projects/[id]/requirements">) {
  const { id } = await params;
  const [project, requirements] = await Promise.all([getProject(id), getRequirements(id)]);
  if (!project || !requirements) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link
        href={`/projects/${project.id}/persona`}
        className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
      >
        ← Persona
      </Link>
      <p className="mt-4 text-sm text-zinc-600 break-words dark:text-zinc-400">
        Requirements · {project.name}
      </p>
      <h1 className="mt-1 text-2xl font-semibold">Generated requirements</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        The full view is coming in US6.
      </p>

      {requirements.length === 0 ? (
        <p className="mt-8">No requirements generated yet.</p>
      ) : (
        <ul className="mt-8 flex flex-col gap-4">
          {requirements.map((req) => (
            <li key={req.id} className="min-w-0">
              <p className="whitespace-pre-wrap break-words">
                <span className="font-mono text-sm font-semibold">{req.code}</span> {req.description}
              </p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {MOSCOW_LABELS[req.moscow]} · {PRIORITY_LABELS[req.priority]} priority · Derived
                from {req.derivedFrom.join(", ")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
