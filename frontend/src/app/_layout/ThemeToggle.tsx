"use client";

import { MoonIcon, SunIcon } from "./icons";
import { THEME_STORAGE_KEY } from "./theme";

function toggleTheme() {
  const isDark = document.documentElement.classList.toggle("dark");
  try {
    localStorage.setItem(THEME_STORAGE_KEY, isDark ? "dark" : "light");
  } catch {
    // Storage may be blocked; the theme still applies until the next page load.
  }
}

/** The label and icon come from the `dark:` variant, so no state has to mirror the <html> class. */
export function ThemeToggle() {
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      <MoonIcon className="size-5 shrink-0 dark:hidden" />
      <SunIcon className="hidden size-5 shrink-0 dark:block" />
      <span className="dark:hidden">Dark mode</span>
      <span className="hidden dark:inline">Light mode</span>
    </button>
  );
}
