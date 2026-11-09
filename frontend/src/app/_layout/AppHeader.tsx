import type { UserDto } from "@smartpathy/shared";
import Link from "next/link";
import { LogoutButton } from "./LogoutButton";

export function AppHeader({ user }: { user: UserDto }) {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="font-semibold">
          SmartPATHY
        </Link>
        <div className="flex min-w-0 items-center gap-4 text-sm">
          <span className="truncate text-zinc-600 dark:text-zinc-400">{user.name}</span>
          <Link href="/settings" className="shrink-0 underline hover:no-underline">
            Settings
          </Link>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
