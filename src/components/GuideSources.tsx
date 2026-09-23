import Link from "next/link";

import { GUIDE_SOURCES_CAP, type GuideSource } from "@/lib/guide-sources";

/** How many citing concepts a work names before the rest become "and N more". */
const CITERS_SHOWN = 2;

/**
 * The citing concepts under a work, as a sentence: "Behind A and B".
 *
 * The concept names are not links. Every one of them is a declared entry atom
 * of this guide, so the concept block immediately above this one already links
 * it, and linking it again here bought nothing: on /active-listening the block
 * added 16 links to a 66-link page and took the guide layer's repeat share
 * from 0.295 to 0.404, with the page's own subject linked 8 times
 * (2026-09-23, tracker entry 267's failure mode). The work is the new
 * destination and keeps its link; the concepts name why it is here.
 */
function citerLine(source: GuideSource) {
  const shown = source.citedBy.slice(0, CITERS_SHOWN);
  const rest = source.citedBy.length - shown.length;
  return (
    <>
      Behind{" "}
      {shown.map((citer, i) => (
        <span key={citer.id}>
          {i > 0 && (i === shown.length - 1 && rest === 0 ? " and " : ", ")}
          {citer.title}
        </span>
      ))}
      {rest > 0 && ` and ${rest} more of this guide's ideas`}.
    </>
  );
}

/**
 * "Sources behind this guide": the library works reached through the guide's
 * declared `entry_atoms`. See `guideSources` for why this exists — 48 of 78
 * guides link no work in their body and every one of them declares concepts
 * citing 5 or more (tracker entry 334). Each work names the concept that
 * cites it, so the reader sees the join the block is computed from rather
 * than a bare reading list.
 *
 * Renders nothing for a guide whose concepts cite no work, rather than an
 * empty heading.
 */
export function GuideSources({ sources }: { sources: GuideSource[] }) {
  if (sources.length === 0) return null;

  const shown = sources.slice(0, GUIDE_SOURCES_CAP);
  const more = sources.length - shown.length;

  return (
    <nav aria-labelledby="guide-sources-heading" data-track="guide-sources" data-derived="true">
      <h2
        id="guide-sources-heading"
        className="text-foreground/40 mb-3 text-sm font-semibold tracking-wider uppercase"
      >
        Sources behind this guide
      </h2>
      <ul className="space-y-2">
        {shown.map((source) => (
          <li key={source.id}>
            <div className="border-foreground/10 bg-surface hover:border-foreground/30 rounded-lg border p-3 transition-colors">
              <Link href={source.url} className="block text-sm font-medium">
                {source.title}
              </Link>
              <span className="text-foreground/60 mt-1 block text-xs">{citerLine(source)}</span>
            </div>
          </li>
        ))}
      </ul>
      {more > 0 && (
        <p className="text-foreground/50 mt-3 text-xs">
          and{" "}
          <Link href="/library" className="underline">
            {more} more
          </Link>
        </p>
      )}
    </nav>
  );
}
