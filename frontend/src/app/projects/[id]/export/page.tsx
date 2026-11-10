import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/app/_layout/Breadcrumb";
import { BuildingIcon, CloseIcon, UserIcon } from "@/app/_layout/icons";
import { getPersonas, getProject, getRequirements } from "@/lib/api";
import { ExportForm, type ExportablePersona } from "./ExportForm";
import type { ReactNode } from "react";

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
  const onlyPersona = personas?.length === 1 ? personas[0] : undefined;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <Breadcrumb
        items={[
          { label: "Projects", href: "/projects" },
          { label: project.name, href: projectHref },
          { label: "Export" },
        ]}
      />
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Export Requirements</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Choose the export format and content you want to include in the exported file.
          </p>
        </div>
        {exportable.length > 0 && (
          <Link href={projectHref} className="btn-secondary gap-2">
            <CloseIcon className="size-4" />
            Close
          </Link>
        )}
      </div>

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
        <>
          <section
            aria-label="Export context"
            className="mt-6 grid gap-5 rounded-lg border border-zinc-200 p-5 sm:grid-cols-2 sm:divide-x sm:divide-zinc-200 dark:border-zinc-800 dark:sm:divide-zinc-800"
          >
            <ContextBlock
              icon={<BuildingIcon className="size-6" />}
              label="Application Context"
              title={project.name}
              detail={project.description}
            />
            {onlyPersona ? (
              <ContextBlock
                icon={<UserIcon className="size-6" />}
                label="Selected Persona"
                title={`${onlyPersona.name} (Age: ${onlyPersona.age})`}
                detail={onlyPersona.who.profession}
              />
            ) : (
              <ContextBlock
                icon={<UserIcon className="size-6" />}
                label="Personas"
                title={`${exportable.length} personas`}
                detail="Choose which ones to include below."
              />
            )}
          </section>
          <ExportForm projectId={project.id} personas={exportable} />
        </>
      )}
    </main>
  );
}

function ContextBlock({
  icon,
  label,
  title,
  detail,
}: {
  icon: ReactNode;
  label: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex min-w-0 gap-4 sm:first:pr-5">
      <span
        aria-hidden="true"
        className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-violet-200 bg-violet-50 text-brand dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300"
      >
        {icon}
      </span>
      <div className="min-w-0 text-sm">
        <p className="font-semibold text-brand dark:text-violet-300">{label}</p>
        <p className="mt-1 font-semibold break-words">{title}</p>
        <p className="mt-1 line-clamp-3 break-words text-zinc-600 dark:text-zinc-400">{detail}</p>
      </div>
    </div>
  );
}
