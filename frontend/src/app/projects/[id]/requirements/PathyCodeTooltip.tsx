"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { pathyFieldLabel, type PathyCode } from "@smartpathy/shared";

/**
 * AC6.7: shows the catalog label of a PATHY code on hover and on keyboard focus.
 * The tooltip is fixed-positioned so the table's scroll container does not clip it.
 */
export function PathyCodeTooltip({ code }: { code: PathyCode }) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState<CSSProperties | null>(null);

  function show() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition({
      top: rect.bottom + 6,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 248)),
    });
  }

  const hide = () => setPosition(null);

  // The fixed tooltip would drift away from its code while scrolling.
  useEffect(() => {
    if (!position) return;
    window.addEventListener("scroll", hide, true);
    return () => window.removeEventListener("scroll", hide, true);
  }, [position]);

  return (
    <span onMouseEnter={show} onMouseLeave={hide}>
      <button
        ref={triggerRef}
        type="button"
        aria-describedby={id}
        onFocus={show}
        onBlur={hide}
        onKeyDown={(event) => {
          if (event.key === "Escape") hide();
        }}
        className="cursor-help rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-900 underline decoration-dotted underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 dark:focus-visible:ring-zinc-100"
      >
        {code}
      </button>
      {/* Always rendered, so aria-describedby works even while it is hidden. */}
      <span
        id={id}
        role="tooltip"
        hidden={!position}
        style={position ?? undefined}
        className="fixed z-10 w-max max-w-60 rounded-md bg-zinc-900 px-2 py-1 text-xs text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pathyFieldLabel(code)}
      </span>
    </span>
  );
}
