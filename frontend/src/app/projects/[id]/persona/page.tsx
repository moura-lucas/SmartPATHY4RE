import Link from "next/link";
import { notFound } from "next/navigation";
import { isRequirementsOutdated } from "@smartpathy/shared";
import { getPersona, getProject, getRequirements } from "@/lib/api";
import { LEVEL_LABELS } from "@/lib/labels";
import { GeneratePersonaButton } from "../GeneratePersonaButton";
import { GenerateRequirementsButton } from "./GenerateRequirementsButton";
import { OutdatedRequirementsWarning } from "./OutdatedRequirementsWarning";
import { PersonaEditor } from "./PersonaEditor";

export default async function PersonaPage({
  params,
}: PageProps<"/projects/[id]/persona">) {
  const { id } = await params;
  const [project, persona, requirements] = await Promise.all([
    getProject(id),
    getPersona(id),
    getRequirements(id),
  ]);
  if (!project) notFound(); // AC4.7

  const backLink = (
    <Link
      href={`/projects/${project.id}`}
      className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
    >
      ← Project
    </Link>
  );

  // AC4.6: the project exists but has no persona yet.
  if (!persona) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10">
        {backLink}
        <h1 className="mt-4 text-2xl font-semibold">PATHY Persona</h1>
        <p className="mt-2 break-words text-zinc-600 dark:text-zinc-400">
          The project <strong>{project.name}</strong> does not have a persona yet.
        </p>
        <GeneratePersonaButton projectId={project.id} />
      </main>
    );
  }

  const hasRequirements = (requirements?.length ?? 0) > 0;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      {backLink}

      {/* AC4.2: identification header. */}
      <header className="mt-4">
        <p className="text-sm text-zinc-600 break-words dark:text-zinc-400">
          PATHY Persona · {project.name}
        </p>
        <h1 className="mt-1 text-2xl font-semibold break-words">{persona.name}</h1>
        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <div className="flex gap-1">
            <dt className="text-zinc-600 dark:text-zinc-400">Age:</dt>
            <dd>{persona.age}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="text-zinc-600 dark:text-zinc-400">Technology experience:</dt>
            <dd>{LEVEL_LABELS[persona.techExperienceLevel]}</dd>
          </div>
        </dl>
      </header>

      {/* AC4.3 / AC4.4 / AC4.5: every catalog field, grouped and ordered as in PATHY_FIELDS.
          AC7.1: each section can be edited. */}
      <PersonaEditor persona={persona} hasRequirements={hasRequirements} />

      {/* AC4.8 */}
      <div className="mt-10 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        {requirements && isRequirementsOutdated(persona, requirements) && (
          <OutdatedRequirementsWarning />
        )}
        <GenerateRequirementsButton
          projectId={project.id}
          hasRequirements={hasRequirements}
        >
          {hasRequirements && (
            <Link href={`/projects/${project.id}/requirements`} className="btn-secondary">
              View requirements
            </Link>
          )}
          <Link href={`/projects/${project.id}`} className="btn-secondary">
            Back to project
          </Link>
        </GenerateRequirementsButton>
      </div>
    </main>
  );
}
