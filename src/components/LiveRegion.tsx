import React from "react";

interface LiveRegionProps {
  message: string;
  ariaLive?: "polite" | "assertive";
}

/**
 * Accessible live region announcing asynchronous plan changes and AI updates to screen readers.
 */
export function LiveRegion({ message, ariaLive = "polite" }: LiveRegionProps) {
  return (
    <div
      role="status"
      aria-live={ariaLive}
      aria-atomic="true"
      className="sr-only"
      data-testid="live-region"
    >
      {message}
    </div>
  );
}
