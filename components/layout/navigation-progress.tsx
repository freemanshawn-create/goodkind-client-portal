"use client";

import { usePathname } from "next/navigation";

/**
 * Thin top-of-page progress bar that re-plays its animation on every route
 * change. Implemented with a `key` that changes per pathname so the inner bar
 * remounts and replays a one-shot CSS animation — no state or effects, so it
 * stays clean under react-hooks lint rules. Complements the per-page skeleton
 * loaders (which cover the actual data fetch).
 */
export function NavigationProgress() {
  const pathname = usePathname();

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden"
    >
      <div key={pathname} className="nav-progress-bar h-full bg-primary" />
    </div>
  );
}
