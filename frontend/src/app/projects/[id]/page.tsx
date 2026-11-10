import Link from "next/link";
import { Breadcrumb } from "@/app/_layout/Breadcrumb";
import { notFound } from "next/navigation";
import { getPersonas, getProject, getRequirements } from "@/lib/api";
import { LEVEL_LABELS } from "@/lib/labels";
import { ExportActions } from "./ExportActions";
import { GeneratePersonaButton } from "./GeneratePersonaButton";
import { ProjectActions } from "./ProjectActions";

export default async function ProjectPage({
  params,
}: PageProps<"/projects/[id]">) {
  const { id } = await params;
  const [project, personas] = await Promise.all([getProject(id), getPersonas(id)]);
  if (!project) notFound();
  const personaCount = personas?.length ?? 0;
  const hasPersona = personaCount > 0;
  // AC17.3: the confirmation says how much is removed with the project.
  const requirementLists = await Promise.all(
    (personas ?? []).map((persona) => getRequirements(project.id, persona.id)),
  );
  const requirementCount = requirementLists.reduce((total, list) => total + (list?.length ?? 0), 0);

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
      <Breadcrumb items={[{ label: "Projects", href: "/projects" }, { label: project.name }]} />
      <h1 className="mt-4 text-2xl font-semibold break-words">{project.name}</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Created on{" "}
        {new Date(project.createdAt).toLocaleString("en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        })}
      </p>

      <ProjectActions
        project={project}
        personaCount={personaCount}
        requirementCount={requirementCount}
      />

      <dl className="mt-8 flex flex-col gap-5">
        {details.map(([label, value]) => (
          <div key={label}>
            <dt className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{label}</dt>
            <dd className="mt-1 whitespace-pre-wrap break-words">{value}</dd>
          </div>
        ))}
      </dl>

      {/* AC2.7: starts the persona flow (US3); further personas are added from their screen (AC12.1). */}
      {hasPersona ? (
        <div className="mt-10">
          <Link href={`/projects/${project.id}/persona`} className="btn-primary">
            View personas
          </Link>
        </div>
      ) : (
        <GeneratePersonaButton projectId={project.id} />
      )}

      <ExportActions projectId={project.id} hasPersona={hasPersona} />
    </main>
  );
}
