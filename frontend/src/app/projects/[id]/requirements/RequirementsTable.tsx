import { MOSCOW_LABELS, type RequirementDto } from "@smartpathy/shared";
import { PathyCodeTooltip } from "./PathyCodeTooltip";
import { PriorityBadge } from "./PriorityBadge";

const COLUMNS = ["Code", "Description", "MoSCoW", "Priority", "Derived from"];

/** AC6.3 / AC6.4: one table per requirement type, already sorted by code (AC6.5). */
export function RequirementsTable({
  id,
  title,
  requirements,
}: {
  id: string;
  title: string;
  requirements: RequirementDto[];
}) {
  return (
    <section aria-labelledby={id} className="mt-10">
      <h2 id={id} className="text-lg font-semibold">
        {title} <span className="text-zinc-600 dark:text-zinc-400">({requirements.length})</span>
      </h2>
      {/* Narrow screens scroll the table instead of the page. */}
      <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table aria-labelledby={id} className="w-full min-w-[40rem] text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              {COLUMNS.map((column) => (
                <th key={column} scope="col" className="px-3 py-2 font-medium whitespace-nowrap">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {requirements.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="px-3 py-4 text-zinc-600 dark:text-zinc-400">
                  No {title.toLowerCase()}.
                </td>
              </tr>
            ) : (
              requirements.map((req) => (
                <tr key={req.id} className="align-top">
                  <th scope="row" className="px-3 py-3 font-mono font-semibold whitespace-nowrap">
                    {req.code}
                  </th>
                  <td className="px-3 py-3 whitespace-pre-wrap break-words">{req.description}</td>
                  <td className="px-3 py-3 whitespace-nowrap">{MOSCOW_LABELS[req.moscow]}</td>
                  <td className="px-3 py-3">
                    <PriorityBadge priority={req.priority} />
                  </td>
                  <td className="px-3 py-3">
                    <ul className="flex flex-wrap gap-1.5" aria-label={`${req.code} derived from`}>
                      {req.derivedFrom.map((code) => (
                        <li key={code}>
                          <PathyCodeTooltip code={code} />
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
