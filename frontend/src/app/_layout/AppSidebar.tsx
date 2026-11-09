"use client";

import type { UserDto } from "@smartpathy/shared";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CloseIcon, FolderIcon, HomeIcon, MenuIcon, SettingsIcon, UserIcon } from "./icons";
import { LogoutButton } from "./LogoutButton";
import { ThemeToggle } from "./ThemeToggle";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: HomeIcon, isActive: (path: string) => path === "/" },
  {
    label: "Projects",
    href: "/projects",
    icon: FolderIcon,
    isActive: (path: string) => path.startsWith("/projects"),
  },
  {
    label: "Settings",
    href: "/settings",
    icon: SettingsIcon,
    isActive: (path: string) => path.startsWith("/settings"),
  },
];

export function AppSidebar({ user }: { user: UserDto }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <aside className="flex shrink-0 flex-col border-b border-zinc-200 md:sticky md:top-0 md:h-screen md:w-60 md:border-r md:border-b-0 dark:border-zinc-800">
      <div className="flex items-center justify-between px-5 py-4 md:py-5">
        <Link href="/" className="text-lg font-semibold" onClick={() => setMenuOpen(false)}>
          SmartPATHY
        </Link>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          className="rounded-md p-1.5 hover:bg-zinc-100 md:hidden dark:hover:bg-zinc-800"
        >
          {menuOpen ? <CloseIcon className="size-6" /> : <MenuIcon className="size-6" />}
        </button>
      </div>

      <div className={`${menuOpen ? "flex" : "hidden"} min-h-0 flex-1 flex-col md:flex`}>
        <nav aria-label="Main" className="flex-1 overflow-y-auto px-3">
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map(({ label, href, icon: ItemIcon, isActive }) => {
              const active = isActive(pathname);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${
                      active
                        ? "bg-brand text-white"
                        : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <ItemIcon className="size-5 shrink-0" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="px-3 py-2">
          <ThemeToggle />
        </div>

        <div className="flex items-center gap-3 border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <span
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-white"
          >
            <UserIcon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium" title={user.name}>
              {user.name}
            </p>
            <p className="truncate text-xs text-zinc-600 dark:text-zinc-400" title={user.email}>
              {user.email}
            </p>
          </div>
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}
