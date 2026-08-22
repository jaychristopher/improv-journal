"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import posthog from "@/lib/posthog";

export function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname) {
      let url = window.origin + pathname;
      const search = searchParams.toString();
      if (search) url += "?" + search;
      posthog.capture("$pageview", { $current_url: url });
    }
    // posthog is a module singleton, not reactive state.
  }, [pathname, searchParams]);

  return null;
}
