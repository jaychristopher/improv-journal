"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { US_MAP_VIEWBOX } from "@/lib/us-map-data";

/**
 * The archive's sixty cities as a map: a dot for each, linking to its page,
 * with what is listed there on hover and on focus.
 *
 * The map is a second way into the same list, never the only one. The city
 * grid below it carries every name and count as text, which is what a touch
 * reader, a screen reader and a crawler get, and it is where the skip link at
 * the top of the map lands. Nothing here is the sole route to a city page.
 *
 * What the accessibility of it rests on:
 *
 * - **The dots are links.** Sixty `a` elements in the list's own order, so tab
 *   order and reading order agree with the grid below, and each carries its
 *   whole summary as its accessible name. The tooltip is decoration over the
 *   top of that (`aria-hidden`), so nothing is announced twice.
 * - **Targets are 24 by 24 CSS pixels and never overlap.** WCAG 2.2 wants 24;
 *   the generator (scripts/build-us-map.mjs) moves a crowded marker off its
 *   city until every pair of centres is at least that far apart at the map's
 *   narrowest render, and the map draws a hairline back to where the city
 *   actually is. San Francisco and Oakland are thirteen kilometres apart and
 *   would otherwise be one target.
 * - **The tooltip obeys 1.4.13.** It is dismissible with Escape without moving
 *   the pointer or focus, it can be hovered without vanishing, and it stays
 *   until the pointer or focus leaves. No timers.
 * - **The base map is decoration.** It is a CSS mask tinted by the page's own
 *   colour, so it follows the theme and carries no information a reader needs:
 *   `role="presentation"` in the file, `aria-hidden` on the layer.
 */

export interface UsCityMapPlace {
  slug: string;
  city: string;
  state: string;
  /**
   * The city's page. Passed in rather than built here: the module that knows
   * how a city's path is spelled reads the archive off the disk, and a client
   * component that imported it would drag node:fs into the browser bundle.
   */
  href: string;
  /** Places listed in the city, and the two kinds, as the city page splits them. */
  listed: number;
  classes: number;
  shows: number;
  /** Where the city is, in viewBox units. */
  x: number;
  y: number;
  /** Where its target sits, moved only as far as crowding demanded. */
  markerX: number;
  markerY: number;
  moved: boolean;
}

const { width: W, height: H } = US_MAP_VIEWBOX;

const pct = (value: number, of: number) => `${((value / of) * 100).toFixed(3)}%`;

/** What a city holds, in counts. The archive does not rank, so nor does this. */
function counts(place: UsCityMapPlace): string[] {
  if (place.listed === 0) return [];
  const parts = [`${place.listed} listed`];
  if (place.classes > 0) parts.push(`${place.classes} with classes`);
  if (place.shows > 0) parts.push(`${place.shows} with shows or jams`);
  return parts;
}

/** What the tooltip shows. Middle dots, which read as a list to the eye. */
export function mapSummary(place: UsCityMapPlace): string {
  const parts = counts(place);
  return parts.length === 0 ? "Nothing listed yet" : parts.join(" · ");
}

/**
 * The whole of what a dot means, for a reader who cannot see where it is.
 *
 * Punctuation rather than middle dots: a screen reader announces "·" as a
 * word or skips it depending on how its user has punctuation set, and either
 * way the counts read better as a sentence.
 */
export function mapLabel(place: UsCityMapPlace): string {
  const parts = counts(place);
  const what =
    parts.length === 0 ? "Nothing listed yet" : `${parts[0]}: ${parts.slice(1).join(", ")}`;
  return `Improv in ${place.city}, ${place.state}. ${what.replace(/: $/, "")}.`;
}

export function UsCityMap({
  places,
  skipTo,
  skipLabel,
  labelledBy,
}: {
  places: readonly UsCityMapPlace[];
  /** The fragment the skip link jumps to: the same cities, as text. */
  skipTo: string;
  skipLabel: string;
  /** The id of the heading this map sits under. */
  labelledBy: string;
}) {
  const [active, setActive] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // Dismissible without moving the pointer or the focus (WCAG 1.4.13). The
  // listener is on the document because the pointer can be over a dot while
  // focus is somewhere else entirely, and it is only attached while there is
  // something to dismiss.
  useEffect(() => {
    if (active === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDismissed(true);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active]);

  const show = (slug: string) => {
    setActive(slug);
    setDismissed(false);
  };
  const hide = () => setActive(null);

  const shown = active !== null && !dismissed ? places.find((p) => p.slug === active) : undefined;
  const moved = places.filter((place) => place.moved);

  return (
    <div className="mt-4">
      <a
        href={skipTo}
        className="focus-visible:bg-surface focus-visible:border-border-ui sr-only focus-visible:not-sr-only focus-visible:mb-2 focus-visible:inline-block focus-visible:rounded-lg focus-visible:border focus-visible:px-3 focus-visible:py-2 focus-visible:text-sm"
      >
        {skipLabel}
      </a>
      {/* A map is wider than a phone. Rather than shrink the targets below the
          size that makes them reachable, the map keeps its width and the
          reader scrolls it. */}
      <div className="-mx-6 overflow-x-auto px-6 sm:mx-0 sm:px-0">
        <div
          // Named after the heading above it, so a reader who arrives inside
          // the map by tabbing is told what the sixty links belong to.
          role="group"
          aria-labelledby={labelledBy}
          className="relative min-w-[41rem]"
          style={{ aspectRatio: `${W} / ${H}` }}
          data-track="directory-map"
          data-derived="true"
          data-map-places={places.length}
        >
          <div className="us-map-base text-foreground-dim absolute inset-0" aria-hidden="true" />

          {moved.length > 0 && (
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox={`0 0 ${W} ${H}`}
              aria-hidden="true"
              focusable="false"
            >
              <g
                className="text-foreground-dim"
                stroke="currentColor"
                strokeWidth={1.2}
                opacity={0.6}
              >
                {moved.map((place) => (
                  <line
                    key={place.slug}
                    x1={place.x}
                    y1={place.y}
                    x2={place.markerX}
                    y2={place.markerY}
                  />
                ))}
              </g>
            </svg>
          )}

          {places.map((place) => {
            const empty = place.listed === 0;
            return (
              <Link
                key={place.slug}
                href={place.href}
                aria-label={mapLabel(place)}
                className="absolute grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full"
                style={{ left: pct(place.markerX, W), top: pct(place.markerY, H) }}
                onPointerEnter={() => show(place.slug)}
                onPointerLeave={hide}
                onFocus={() => show(place.slug)}
                onBlur={hide}
              >
                <span
                  className={`ring-surface block h-2.5 w-2.5 rounded-full ring-2 ${
                    empty ? "us-map-dot-empty" : "us-map-dot"
                  }`}
                />
              </Link>
            );
          })}

          {shown && (
            // Hoverable: the pointer may rest on the tooltip without it going
            // away, which is why this is not pointer-events-none.
            <div
              aria-hidden="true"
              className="border-border-ui bg-surface text-foreground pointer-events-auto absolute z-10 w-max max-w-56 rounded-lg border px-3 py-2 text-xs leading-snug shadow-sm"
              style={tooltipPosition(shown)}
              onPointerEnter={() => show(shown.slug)}
              onPointerLeave={hide}
            >
              <span className="text-foreground-strong block font-semibold">
                {shown.city}, {shown.state}
              </span>
              <span className="text-foreground-dim block">{mapSummary(shown)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Where the tooltip sits: above its dot, or below it near the top edge, and
 * pulled in at the left and right edges so it never leaves the map.
 */
function tooltipPosition(place: UsCityMapPlace): React.CSSProperties {
  const left = (place.markerX / W) * 100;
  const top = (place.markerY / H) * 100;
  const below = top < 16;
  const x = left < 18 ? "-12%" : left > 82 ? "-88%" : "-50%";
  const y = below ? "1rem" : "calc(-100% - 1rem)";
  return { left: `${left}%`, top: `${top}%`, transform: `translate(${x}, ${y})` };
}
