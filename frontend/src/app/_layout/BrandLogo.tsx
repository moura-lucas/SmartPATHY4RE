/** The SmartPATHY mark from the thesis prototype; app/icon.svg is the same drawing. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth={3.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="24" cy="11" r="8.5" />
      <path d="M21.5 31.5C19 28 16.3 26.4 13 26.4 7.7 26.4 3.5 30.7 3.5 36.2 3.5 41.7 7.7 46 13 46 18 46 21 42 24 36.2 27 30.4 30 26.4 35 26.4 40.3 26.4 44.5 30.7 44.5 36.2 44.5 41.7 40.3 46 35 46 31.7 46 29 44.4 26.5 41" />
    </svg>
  );
}

export function BrandLogo() {
  return (
    <span className="inline-flex items-center gap-2 text-lg font-semibold">
      <LogoMark className="size-8 shrink-0 text-brand dark:text-violet-300" />
      <span>
        Smart<span className="text-brand dark:text-violet-300">PATHY</span>
      </span>
    </span>
  );
}
