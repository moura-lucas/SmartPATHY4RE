import Link from "next/link";
import { notFound } from "next/navigation";
import { PATHY_SECTIONS, pathyAnswer, pathyFieldsOf } from "@smartpathy/shared";
import { getPersona, getProject } from "@/lib/api";
import { LEVEL_LABELS } from "@/lib/labels";
import { GeneratePersonaButton } from "../GeneratePersonaButton";

export default async function PersonaPage({
  params,
}: PageProps<"/projects/[id]/persona">) {
  const { id } = await params;
  const [project, persona] = await Promise.all([getProject(id), getPersona(id)]);
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

      {/* AC4.3 / AC4.4 / AC4.5: every catalog field, grouped and ordered as in PATHY_FIELDS. */}
      {PATHY_SECTIONS.map(({ key, label }) => (
        <section
          key={key}
          aria-labelledby={`section-${key}`}
          className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-800"
        >
          <h2 id={`section-${key}`} className="text-lg font-semibold">
            {label}
          </h2>
          <dl className="mt-4 flex flex-col gap-5">
            {pathyFieldsOf(key).map((field) => (
              <div key={field.code} className="min-w-0">
                <dt className="flex flex-wrap items-baseline gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
                    {field.code}
                  </span>
                  {field.label}
                </dt>
                {/* AC4.9: full text, keeping line breaks and wrapping long words. */}
                <dd className="mt-1 whitespace-pre-wrap break-words">
                  {pathyAnswer(persona, field)}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}

      {/* AC4.8 */}
      <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <button
          type="button"
          disabled
          aria-describedby="generate-requirements-hint"
          className="btn-primary"
        >
          Generate Requirements
        </button>
        <Link href={`/projects/${project.id}`} className="btn-secondary">
          Back to project
        </Link>
        <p
          id="generate-requirements-hint"
          className="w-full text-sm text-zinc-600 dark:text-zinc-400"
        >
          Requirements generation is coming in US5.
        </p>
      </div>
    </main>
  );
}
