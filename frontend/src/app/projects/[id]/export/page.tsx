import Link from "next/link";
import { notFound } from "next/navigation";
import { getPersonas, getProject, getRequirements } from "@/lib/api";
import { Breadcrumb } from "../requirements/Breadcrumb";
import { ExportForm, type ExportablePersona } from "./ExportForm";

export default async function ExportPage({ params }: PageProps<"/projects/[id]/export">) {
  const { id } = await params;
  const [project, personas] = await Promise.all([getProject(id), getPersonas(id)]);
  if (!project) notFound();

  // AC15.3: the summary needs each persona's counts on the client, without new requests.
  const exportable = await Promise.all(
    (personas ?? []).map(async (persona): Promise<ExportablePersona> => {
      const requirements = (await getRequirements(project.id, persona.id)) ?? [];
      return {
        id: persona.id,
        name: persona.name,
        techExperienceLevel: persona.techExperienceLevel,
        functionalCount: requirements.filter((req) => req.type === "functional").length,
        nonFunctionalCount: requirements.filter((req) => req.type === "non_functional").length,
      };
    }),
  );

  const projectHref = `/projects/${project.id}`;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <Breadcrumb
        items={[
          { label: "Projects", href: "/" },
          { label: project.name, href: projectHref },
          { label: "Export" },
        ]}
      />
      <h1 className="mt-4 text-2xl font-semibold">Export</h1>

      {exportable.length === 0 ? (
        <>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Generate the persona first to export it.
          </p>
          <div className="mt-6">
            <Link href={projectHref} className="btn-secondary">
              Back to project
            </Link>
          </div>
        </>
      ) : (
        <ExportForm projectId={project.id} personas={exportable} />
      )}
    </main>
  );
}
