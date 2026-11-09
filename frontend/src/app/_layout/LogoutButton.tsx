"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { logout } from "@/lib/api";
import { LogoutIcon } from "./icons";

/** AC18.5 */
export function LogoutButton() {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  async function handleClick() {
    setLeaving(true);
    try {
      await logout();
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={leaving}
      aria-label="Log out"
      title="Log out"
      className="shrink-0 rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
    >
      <LogoutIcon className="size-5" />
    </button>
  );
}
