import { InfoCard } from "@/app/_layout/InfoCard";
import { ListIcon, PuzzleIcon, TargetIcon, UsersIcon } from "@/app/_layout/icons";

const TIPS = [
  { text: "Describe the main purpose of the application", icon: TargetIcon },
  { text: "Identify the target users or stakeholders", icon: UsersIcon },
  { text: "Mention key features or functionalities", icon: ListIcon },
  { text: "Include any domain-specific characteristics", icon: PuzzleIcon },
];

/** Figure 28. */
export function ProjectGuidanceCard({ className }: { className?: string }) {
  return (
    <InfoCard title="Why is this information important?" className={className}>
      <p>
        The information you provide will be used by SmartPATHY to generate PATHY-aligned personas
        that accurately reflect your application context.
      </p>
      <div className="mt-4 border-t border-violet-200 pt-4 dark:border-violet-900">
        <h3 className="font-semibold text-brand dark:text-violet-300">Tips for a good description</h3>
        <ul className="mt-3 flex flex-col gap-3">
          {TIPS.map(({ text, icon: TipIcon }) => (
            <li key={text} className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-brand dark:bg-violet-900/60 dark:text-violet-300"
              >
                <TipIcon className="size-4" />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </div>
    </InfoCard>
  );
}
