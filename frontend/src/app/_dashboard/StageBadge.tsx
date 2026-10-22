import { PROJECT_STAGES, PROJECT_STAGE_LABELS, type ProjectStage } from "@smartpathy/shared";

const COLORS: Record<ProjectStage, string> = {
  created: "bg-zinc-100 text-zinc-800 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-700",
  persona_generated:
    "bg-sky-100 text-sky-900 ring-sky-300 dark:bg-sky-950 dark:text-sky-200 dark:ring-sky-800",
  requirements_generated:
    "bg-emerald-100 text-emerald-900 ring-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-800",
};

/** The stage as text plus its step number, so it does not rely on color alone. */
export function StageBadge({ stage }: { stage: ProjectStage }) {
  const step = PROJECT_STAGES.indexOf(stage) + 1;
  return (
    <span
      data-stage={stage}
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset ${COLORS[stage]}`}
    >
      <span aria-hidden="true" className="tabular-nums opacity-70">
        {step}/{PROJECT_STAGES.length}
      </span>
      {PROJECT_STAGE_LABELS[stage]}
    </span>
  );
}
