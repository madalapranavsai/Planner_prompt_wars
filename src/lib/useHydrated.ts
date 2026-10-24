"use client";

import { useEffect, useState } from "react";

/**
 * Hook indicating when client-side React hydration is complete and event handlers are bound.
 * Asynchronously queues state update to avoid synchronous cascading renders.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setHydrated(true);
    });
  }, []);

  return hydrated;
}
