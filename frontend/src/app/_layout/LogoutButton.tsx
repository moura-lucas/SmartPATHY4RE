"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { logout } from "@/lib/api";

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
      className="shrink-0 underline hover:no-underline disabled:cursor-not-allowed disabled:opacity-50"
    >
      Log out
    </button>
  );
}
