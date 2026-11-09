import { InfoCard } from "../_layout/InfoCard";
import { DocumentIcon, DownloadIcon, FolderIcon, UserIcon } from "../_layout/icons";

const STEPS = [
  { label: "1. Create Project", icon: FolderIcon },
  { label: "2. Generate Persona", icon: UserIcon },
  { label: "3. Generate Requirements", icon: DocumentIcon },
  { label: "4. Export Results", icon: DownloadIcon },
];

/** Figure 27. A dashboard without projects shows EmptyDashboard, which covers the same ground. */
export function WelcomeCard() {
  return (
    <InfoCard title="Welcome to SmartPATHY" className="mt-10">
      <p>
        SmartPATHY helps you generate PATHY-aligned personas and software requirements using
        AI-powered automation.
      </p>
      <ol className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {STEPS.map(({ label, icon: StepIcon }, index) => (
          <li key={label} className="relative flex flex-col items-center gap-2 text-center">
            {index < STEPS.length - 1 && (
              <span
                aria-hidden="true"
                className="absolute top-5 right-[calc(-50%+1.75rem)] left-[calc(50%+1.75rem)] hidden border-t border-dashed border-violet-300 sm:block dark:border-violet-800"
              />
            )}
            <span
              aria-hidden="true"
              className="flex size-10 items-center justify-center rounded-full bg-violet-100 text-brand dark:bg-violet-900/60 dark:text-violet-300"
            >
              <StepIcon className="size-5" />
            </span>
            <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">{label}</span>
          </li>
        ))}
      </ol>
    </InfoCard>
  );
}
