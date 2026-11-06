"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * AC11.5: while `active`, asks for confirmation before leaving the page.
 * - Closing the tab, reloading or typing another URL: the browser's own dialog (beforeunload).
 * - Internal links: Next.js navigates without unloading the page, so the click is
 *   held and `pendingHref` is set until the user confirms or cancels.
 * Known limitation: the browser's Back/Forward buttons are not intercepted.
 */
export function useLeaveProtection(active: boolean) {
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;

    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = ""; // older browsers need it to show the dialog
    }

    function onClick(event: MouseEvent) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return; // opens in a new tab or window: nothing is lost here
      }
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if ((anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) return;

      const url = new URL(anchor.href, window.location.href);
      // Another site unloads the page, so beforeunload already asks.
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return; // same page (e.g. an anchor)
      }

      // Capture phase on window: runs before Next.js's <Link> handler.
      event.preventDefault();
      event.stopPropagation();
      setPendingHref(url.pathname + url.search + url.hash);
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("click", onClick, true);
    };
  }, [active]);

  return {
    /** The held navigation; null when there is nothing to confirm. */
    pendingHref: active ? pendingHref : null,
    confirmLeave() {
      if (pendingHref) router.push(pendingHref);
      setPendingHref(null);
    },
    cancelLeave() {
      setPendingHref(null);
    },
  };
}
