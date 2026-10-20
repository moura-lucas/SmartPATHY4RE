/** AC7.5: the requirements were generated from a previous version of the persona. */
export function OutdatedRequirementsWarning() {
  return (
    <div
      role="note"
      aria-labelledby="outdated-requirements-title"
      className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"
    >
      <p id="outdated-requirements-title" className="flex items-center gap-2 font-semibold">
        <span aria-hidden="true">⚠</span>
        Requirements may be outdated
      </p>
      <p className="mt-1">
        The current requirements were generated from a previous version of this persona. Generate
        them again so they reflect your changes.
      </p>
    </div>
  );
}
