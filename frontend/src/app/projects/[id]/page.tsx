import Link from "next/link";
import { notFound } from "next/navigation";
import { getPersona, getProject } from "@/lib/api";
import { LEVEL_LABELS } from "@/lib/labels";
import { ExportActions } from "./ExportActions";
import { GeneratePersonaButton } from "./GeneratePersonaButton";

export default async function ProjectPage({
  params,
}: PageProps<"/projects/[id]">) {
  const { id } = await params;
  const [project, persona] = await Promise.all([getProject(id), getPersona(id)]);
  if (!project) notFound();

  const details: [string, string][] = [
    ["Application domain", project.domain],
    ["Description", project.description],
    ["Additional context", project.additionalContext ?? "—"],
    ["Persona name", project.personaName ?? "—"],
    ["Persona age", project.personaAge?.toString() ?? "—"],
    ["Technology experience level", LEVEL_LABELS[project.techExperienceLevel]],
  ];

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link href="/" className="text-sm text-zinc-600 hover:underline dark:text-zinc-400">
        ← Dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-semibold break-words">{project.name}</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Created on{" "}
        {new Date(project.createdAt).toLocaleString("en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        })}
      </p>

      <dl className="mt-8 flex flex-col gap-5">
        {details.map(([label, value]) => (
          <div key={label}>
            <dt className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{label}</dt>
            <dd className="mt-1 whitespace-pre-wrap break-words">{value}</dd>
          </div>
        ))}
      </dl>

      {/* AC2.7: starts the persona generation flow (US3) for this project. */}
      <GeneratePersonaButton projectId={project.id} />

      <ExportActions projectId={project.id} hasPersona={persona !== null} />
    </main>
  );
}
