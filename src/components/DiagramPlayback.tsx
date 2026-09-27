"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Not 1: a fractional pixel of layout can hold the intersection ratio a hair
 * under one, and a threshold of exactly one would then never fire.
 */
const FULL_VIEW = 0.98;

/**
 * Start each animated diagram from its first frame, once it is fully in view.
 *
 * The Viewpoints figures are SMIL animations inlined into the prose, and SMIL
 * begins at document load: by the time a reader had scrolled to the ninth
 * figure it was seconds into its loop, and every drawing was joined
 * mid-sentence (2026-09-27). `begin="indefinite"` is not the answer, because
 * an animated attribute with no static base value has nothing to show before
 * the animation begins — the dots would not exist.
 *
 * So every animated diagram is paused on its first frame as soon as the page
 * hydrates, and released when the whole of it is in view — reset to zero at
 * that moment, so what plays is the loop from its start. Released once: a
 * reader scrolling back sees it looping, not restarting. Under
 * `prefers-reduced-motion` the still first frame is the whole figure, which
 * SMIL on its own never honours.
 *
 * Mounted once in the root layout and re-run on every client navigation, since
 * the figures it paused belong to the page that rendered them. Renders nothing.
 */
export function DiagramPlayback() {
  const pathname = usePathname();

  useEffect(() => {
    const figures = [...document.querySelectorAll<SVGSVGElement>("svg.dg")].filter((svg) =>
      svg.querySelector("animate, animateTransform, animateMotion"),
    );
    if (figures.length === 0) return;

    for (const svg of figures) {
      svg.pauseAnimations();
      svg.setCurrentTime(0);
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const release = (svg: SVGSVGElement) => {
      svg.setCurrentTime(0);
      svg.unpauseAnimations();
    };
    if (typeof IntersectionObserver === "undefined") {
      figures.forEach(release);
      return;
    }

    const observers = figures.map((svg) => {
      // "Fully in view" for a figure the viewport can hold; one taller than
      // most of the viewport never can be, so it starts when most of it is.
      const height = svg.getBoundingClientRect().height || 1;
      const threshold = Math.min(FULL_VIEW, (window.innerHeight * 0.9) / height);
      const observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          release(svg);
          observer.disconnect();
        },
        { threshold },
      );
      observer.observe(svg);
      return observer;
    });
    return () => observers.forEach((observer) => observer.disconnect());
  }, [pathname]);

  return null;
}
