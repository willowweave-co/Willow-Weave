"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Thin indeterminate progress bar pinned to the top of the viewport.
 * Shown while a filter/sort transition is pending: same-page URL updates
 * keep the old content on screen (no loading.tsx swap), so without this
 * a click on a filter looks like it did nothing until the server answers.
 * Portaled to <body> so no sticky-header stacking context can hide it.
 */
export function PendingBar({ active }: { active: boolean }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || !active) return null;
  return createPortal(
    <div aria-hidden className="fixed inset-x-0 top-0 z-[120] h-[3px] overflow-hidden">
      <div className="h-full w-1/3 animate-nav-progress rounded-full bg-walnut" />
    </div>,
    document.body
  );
}
