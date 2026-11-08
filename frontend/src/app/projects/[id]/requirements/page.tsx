import Link from "next/link";
import { notFound } from "next/navigation";
import { getPersonas, getProject, getRequirements } from "@/lib/api";
import { personaQuery, selectPersona } from "@/lib/personas";
import { GenerateRequirementsButton } from "../persona/GenerateRequirementsButton";
import { PersonaSwitcher } from "../persona/PersonaSwitcher";
import { Breadcrumb } from "./Breadcrumb";
import { GenerateMoreRequirementsButton } from "./GenerateMoreRequirementsButton";
import { RequirementsSummary } from "./RequirementsSummary";
import { RequirementsTable } from "./RequirementsTable";

export default async function RequirementsPage({
  params,
  searchParams,
}: PageProps<"/projects/[id]/requirements">) {
  const { id } = await params;
  const { persona: requested } = await searchParams;
  const [project, personas] = await Promise.all([getProject(id), getPersonas(id)]);
  if (!project) notFound();
  const persona = selectPersona(personas ?? [], requested);

  const personaHref = `/projects/${project.id}/persona${persona ? personaQuery(persona.id) : ""}`;
  const backToPersona = (
    <Link href={personaHref} className="btn-secondary">
      Back to persona
    </Link>
  );

  // AC6.9
  const header = (
    <>
      <Breadcrumb
        items={[
          { label: "Projects", href: "/" },
          { label: project.name, href: `/projects/${project.id}` },
          { label: "Persona", href: personaHref },
          { label: "Requirements" },
        ]}
      />
      <h1 className="mt-4 text-2xl font-semibold">Requirements</h1>
    </>
  );

  // Requirements are generated from the persona, so there is nothing to show without one.
  if (!persona) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-10">
        {header}
        <p className="mt-2 break-words text-zinc-600 dark:text-zinc-400">
          The project <strong>{project.name}</strong> does not have a persona yet. Generate the
          PATHY persona before generating requirements.
        </p>
        <div className="mt-6">
          <Link href={personaHref} className="btn-primary">
            Go to persona
          </Link>
        </div>
      </main>
    );
  }

  // AC6.1 / AC12.4: the selected persona's, already sorted by code by the backend (AC6.5).
  const requirements = await getRequirements(project.id, persona.id);
  if (!requirements) notFound();

  // AC12.3
  const switcher = (
    <PersonaSwitcher
      personas={personas ?? []}
      selectedId={persona.id}
      basePath={`/projects/${project.id}/requirements`}
    />
  );

  // AC6.8
  if (requirements.length === 0) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-10">
        {header}
        {switcher}
        <p className="mt-2 mb-6 text-zinc-600 dark:text-zinc-400">
          This persona does not have requirements yet.
        </p>
        <GenerateRequirementsButton
          key={persona.id}
          projectId={project.id}
          personaId={persona.id}
          hasRequirements={false}
        >
          {backToPersona}
        </GenerateRequirementsButton>
      </main>
    );
  }

  const functional = requirements.filter((req) => req.type === "functional");
  const nonFunctional = requirements.filter((req) => req.type === "non_functional");

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      {header}
      {switcher}

      <RequirementsSummary
        project={project}
        persona={persona}
        functionalCount={functional.length}
        nonFunctionalCount={nonFunctional.length}
      />

      <RequirementsTable
        id="functional-requirements"
        title="Functional requirements"
        requirements={functional}
      />
      <RequirementsTable
        id="non-functional-requirements"
        title="Non-functional requirements"
        requirements={nonFunctional}
      />

      <div className="mt-10 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        {/* The key ends the "generated" state: the new requirements appear on this same page. */}
        <GenerateMoreRequirementsButton
          key={`${persona.id}-${requirements.length}`}
          projectId={project.id}
          personaId={persona.id}
          requirementsCount={requirements.length}
        >
          {backToPersona}
        </GenerateMoreRequirementsButton>
      </div>
    </main>
  );
}
