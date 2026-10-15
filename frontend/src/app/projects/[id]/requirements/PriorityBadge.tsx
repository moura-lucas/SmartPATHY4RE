import { PRIORITY_LABELS, type Priority } from "@smartpathy/shared";

// AC6.6: color, text label and a distinct symbol, so the priority never relies on color alone.
const STYLES: Record<Priority, { symbol: string; className: string }> = {
  high: {
    symbol: "▲",
    className: "bg-red-100 text-red-800 ring-red-300 dark:bg-red-950 dark:text-red-200 dark:ring-red-800",
  },
  medium: {
    symbol: "●",
    className:
      "bg-amber-100 text-amber-900 ring-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-800",
  },
  low: {
    symbol: "▼",
    className:
      "bg-emerald-100 text-emerald-800 ring-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-800",
  },
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  const { symbol, className } = STYLES[priority];
  return (
    <span
      data-priority={priority}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset ${className}`}
    >
      <span aria-hidden="true" className="text-[0.625rem]">
        {symbol}
      </span>
      {PRIORITY_LABELS[priority]}
    </span>
  );
}
