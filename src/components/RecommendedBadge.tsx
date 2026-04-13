"use client";

import { useEffect, useState } from "react";

import { getJourneyState } from "@/lib/journey";

export function RecommendedBadge({ pathId }: { pathId: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const state = getJourneyState();
    queueMicrotask(() => setShow(state?.pathId === pathId));
  }, [pathId]);

  if (!show) return null;

  return (
    <span className="bg-foreground/10 text-foreground/50 ml-2 rounded-full px-2 py-0.5 text-xs">
      Your current path
    </span>
  );
}
