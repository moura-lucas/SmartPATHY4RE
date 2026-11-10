import Link from "next/link";
import { notFound } from "next/navigation";
import { isRequirementsOutdated } from "@smartpathy/shared";
import { GenerationLock } from "@/app/_generation/GenerationLock";
import { Breadcrumb } from "@/app/_layout/Breadcrumb";
import { InfoCard } from "@/app/_layout/InfoCard";
import { getPersonas, getProject, getRequirements } from "@/lib/api";
import { LEVEL_LABELS } from "@/lib/labels";
import { personaQuery, selectPersona } from "@/lib/personas";
import { GeneratePersonaButton } from "../GeneratePersonaButton";
import { DeletePersonaButton } from "./DeletePersonaButton";
import { GenerateRequirementsButton } from "./GenerateRequirementsButton";
import { NewPersonaButton } from "./NewPersonaButton";
import { OutdatedRequirementsWarning } from "./OutdatedRequirementsWarning";
import { PersonaEditor } from "./PersonaEditor";
import { PersonaSwitcher } from "./PersonaSwitcher";

export default async function PersonaPage({
  params,
  searchParams,
}: PageProps<"/projects/[id]/persona">) {
  const { id } = await params;
  const { persona: requested } = await searchParams;
  const [project, personas] = await Promise.all([getProject(id), getPersonas(id)]);
  if (!project) notFound(); // AC4.7
  const persona = selectPersona(personas ?? [], requested);

  const breadcrumb = (
    <Breadcrumb
      items={[
        { label: "Projects", href: "/projects" },
        { label: project.name, href: `/projects/${project.id}` },
        { label: "Persona" },
      ]}
    />
  );

  // AC4.6: the project exists but has no persona yet.
  if (!persona) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10">
        {breadcrumb}
        <h1 className="mt-4 text-2xl font-semibold">PATHY Persona</h1>
        <p className="mt-2 break-words text-zinc-600 dark:text-zinc-400">
          The project <strong>{project.name}</strong> does not have a persona yet.
        </p>
        <GeneratePersonaButton projectId={project.id} />
      </main>
    );
  }

  // AC12.4: everything below refers to the selected persona.
  const requirements = await getRequirements(project.id, persona.id);
  const hasRequirements = (requirements?.length ?? 0) > 0;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      {breadcrumb}

      {/* AC4.2: identification header. */}
      <header className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
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
        </div>
        <InfoCard title="About this persona" className="shrink-0 sm:w-72">
          This persona was generated using the information you provided for this project and is
          strictly aligned with the PATHY framework.
        </InfoCard>
      </header>

      <GenerationLock>
        {/* AC12.3 */}
        <PersonaSwitcher
          personas={personas ?? []}
          selectedId={persona.id}
          basePath={`/projects/${project.id}/persona`}
        />

        <div className="mt-6">
          {/* The key ends the "generated" state: the new persona opens on this same page. */}
          <NewPersonaButton key={persona.id} projectId={project.id}>
            <DeletePersonaButton
              key={persona.id}
              projectId={project.id}
              personaId={persona.id}
              personaName={persona.name}
              isLast={personas?.length === 1}
            />
          </NewPersonaButton>
        </div>

        {/* AC4.3 / AC4.4 / AC4.5: every catalog field, grouped and ordered as in PATHY_FIELDS.
            AC7.1: each section can be edited. The key resets the editor when switching personas. */}
        <PersonaEditor key={persona.id} persona={persona} hasRequirements={hasRequirements} />

        {/* AC4.8 */}
        <div className="mt-10 border-t border-zinc-200 pt-6 dark:border-zinc-800">
          {requirements && isRequirementsOutdated(persona, requirements) && (
            <OutdatedRequirementsWarning />
          )}
          <GenerateRequirementsButton
            key={persona.id}
            projectId={project.id}
            personaId={persona.id}
            hasRequirements={hasRequirements}
          >
            {hasRequirements && (
              <Link
                href={`/projects/${project.id}/requirements${personaQuery(persona.id)}`}
                className="btn-secondary"
              >
                View requirements
              </Link>
            )}
            <Link href={`/projects/${project.id}`} className="btn-secondary">
              Back to project
            </Link>
          </GenerateRequirementsButton>
        </div>
      </GenerationLock>
    </main>
  );
}
