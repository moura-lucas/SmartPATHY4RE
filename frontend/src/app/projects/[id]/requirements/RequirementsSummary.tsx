import type { PersonaDto, ProjectDto } from "@smartpathy/shared";
import { LEVEL_LABELS } from "@/lib/labels";

const card = "min-w-0 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800";
const term = "text-sm font-medium text-zinc-600 dark:text-zinc-400";

/** AC6.2: application context, persona and requirement counts. */
export function RequirementsSummary({
  project,
  persona,
  functionalCount,
  nonFunctionalCount,
}: {
  project: ProjectDto;
  persona: PersonaDto;
  functionalCount: number;
  nonFunctionalCount: number;
}) {
  const personaDetails: [string, string][] = [
    ["Name", persona.name],
    ["Age", persona.age.toString()],
    ["Profession", persona.who.profession],
    ["Technology experience", LEVEL_LABELS[persona.techExperienceLevel]],
  ];

  return (
    <section aria-label="Summary" className="mt-6 grid gap-4 md:grid-cols-2">
      <div className={card}>
        <h2 className={term}>Application context</h2>
        <p className="mt-1 font-semibold break-words">{project.name}</p>
        <p className="mt-1 text-sm whitespace-pre-wrap break-words">{project.description}</p>
      </div>

      <div className={card}>
        <h2 className={term}>Persona</h2>
        <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          {personaDetails.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-zinc-600 dark:text-zinc-400">{label}</dt>
              <dd className="min-w-0 break-words">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <dl className="grid grid-cols-2 gap-4 md:col-span-2">
        {(
          [
            ["Functional requirements", functionalCount],
            ["Non-functional requirements", nonFunctionalCount],
          ] as const
        ).map(([label, count]) => (
          <div key={label} className={`${card} flex flex-col-reverse`}>
            <dt className={term}>{label}</dt>
            <dd className="text-3xl font-semibold tabular-nums">{count}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
