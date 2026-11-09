"use client";

import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import {
  SIDEBAR_DEFAULT_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  SIDEBAR_WIDTH_STORAGE_KEY,
} from "./sidebarWidth";

const KEYBOARD_STEP = 16;

function currentWidth(): number {
  const saved = parseInt(document.documentElement.style.getPropertyValue("--sidebar-width"), 10);
  return Number.isNaN(saved) ? SIDEBAR_DEFAULT_WIDTH : saved;
}

function saveWidth() {
  try {
    localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(currentWidth()));
  } catch {
    // Storage may be blocked; the width still applies until the next page load.
  }
}

/** The width lives in a CSS variable on <html>, so dragging does not re-render the layout. */
export function SidebarResizer() {
  const handle = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);

  function applyWidth(width: number) {
    const clamped = Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, Math.round(width)));
    document.documentElement.style.setProperty("--sidebar-width", `${clamped}px`);
    handle.current?.setAttribute("aria-valuenow", String(clamped));
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragging.current = true;
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    // The sidebar starts at the left edge of the viewport, so the pointer's x is its width.
    if (dragging.current) applyWidth(event.clientX);
  }

  function handlePointerUp() {
    if (!dragging.current) return;
    dragging.current = false;
    saveWidth();
  }

  function handleDoubleClick() {
    applyWidth(SIDEBAR_DEFAULT_WIDTH);
    saveWidth();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const targets: Record<string, number> = {
      ArrowLeft: currentWidth() - KEYBOARD_STEP,
      ArrowRight: currentWidth() + KEYBOARD_STEP,
      Home: SIDEBAR_MIN_WIDTH,
      End: SIDEBAR_MAX_WIDTH,
    };
    const target = targets[event.key];
    if (target === undefined) return;
    event.preventDefault();
    applyWidth(target);
    saveWidth();
  }

  return (
    <div
      ref={(element) => {
        handle.current = element;
        element?.setAttribute("aria-valuenow", String(currentWidth()));
      }}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      aria-valuemin={SIDEBAR_MIN_WIDTH}
      aria-valuemax={SIDEBAR_MAX_WIDTH}
      tabIndex={0}
      title="Drag to resize. Double-click to reset."
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      className="group absolute top-0 -right-1.5 z-10 hidden h-full w-3 cursor-col-resize touch-none justify-center outline-none select-none md:flex"
    >
      <span className="h-full w-0.5 bg-transparent transition-colors group-hover:bg-brand group-focus-visible:bg-brand dark:group-hover:bg-violet-400 dark:group-focus-visible:bg-violet-400" />
    </div>
  );
}
