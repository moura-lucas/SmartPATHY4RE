import type { PersonaDto } from "@smartpathy/shared";
import Link from "next/link";
import { LEVEL_LABELS } from "@/lib/labels";
import { personaQuery } from "@/lib/personas";

/** AC12.3: the project's personas; each link keeps the user on the current screen. */
export function PersonaSwitcher({
  personas,
  selectedId,
  basePath,
}: {
  personas: PersonaDto[];
  selectedId: string;
  /** The screen the links point to, e.g. "/projects/1/persona". */
  basePath: string;
}) {
  if (personas.length < 2) return null;

  return (
    <nav aria-label="Project personas" className="mt-6">
      <ul className="flex flex-wrap gap-2">
        {personas.map((persona) => {
          const selected = persona.id === selectedId;
          return (
            <li key={persona.id} className="min-w-0 max-w-full">
              <Link
                href={`${basePath}${personaQuery(persona.id)}`}
                aria-current={selected ? "page" : undefined}
                className={`block rounded-md border px-3 py-2 text-sm break-words ${
                  selected
                    ? "border-brand bg-brand text-white"
                    : "border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                }`}
              >
                <span className="font-medium">{persona.name}</span>
                {" · "}
                {LEVEL_LABELS[persona.techExperienceLevel]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
