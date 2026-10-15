import Link from "next/link";

export interface BreadcrumbItem {
  label: string;
  /** Omitted for the current page. */
  href?: string;
}

/** AC6.9: Projects › Project › Persona › Requirements. */
export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
        {items.map(({ label, href }, index) => (
          <li key={label + index} className="flex min-w-0 items-center gap-2">
            {index > 0 && <span aria-hidden="true">›</span>}
            {href ? (
              <Link href={href} className="max-w-[16rem] truncate hover:underline">
                {label}
              </Link>
            ) : (
              <span aria-current="page" className="font-medium text-zinc-900 dark:text-zinc-100">
                {label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
