"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AFFILIATE_PARTICIPATION } from "@/lib/affiliate";
import { HUBS } from "@/lib/hubs";

import { EmailCapture } from "./EmailCapture";

/**
 * Site-wide footer.
 *
 * It used to be 46 links on every one of 387 pages, and an audit on
 * 2026-09-24 found almost none of them earning their place:
 *
 * - 15 of the 19 hub links were exact duplicates of a nav link higher in the
 *   same document. The file's own comment justified them as "the only
 *   navigation present in the server-rendered HTML" — which stopped being
 *   true when Nav started rendering its dropdowns unconditionally and hiding
 *   them with CSS, for that same crawler reason. It renders 20 destinations
 *   statically now, so the footer was duplicating the graph, not carrying it.
 * - "Overview" was the single largest internal anchor on the site — roughly
 *   1,131 links across three different destinations — and it describes none
 *   of them.
 * - "Popular Guides" was 27 links ranked by Ahrefs traffic potential, which
 *   is opportunity and not readership. The site took 31 organic clicks in
 *   the 90 days to 2026-09-23. Nothing here is popular yet, and this repo's
 *   own rule is never to invent a number.
 * - On a phone the whole block ran to 2,585px. On /library/impro — one of
 *   the best-ranking pages here — that was 70.7% of the document.
 *
 * So it stops being a second navigation and becomes what a footer is for:
 * who this is, one way to go deeper, one thing to subscribe to, the legal
 * row. Eleven links.
 *
 * Still a client component, and the direction still matters (entry 265): as
 * a server component this markup was 10.3 kB of flight on every page. The
 * two things it cannot know on the client — which guides to promote, and the
 * tagline computed from the graph — arrive as props.
 */

/** A promoted guide, trimmed to what the footer renders so the prop stays small. */
interface FooterGuide {
  slug: string;
  /** The guide's head keyword, capitalised (see anchor-text.ts). */
  label: string;
  /** The guide's own title. */
  title: string;
}

/**
 * How many promoted guides the footer shows, and the only place that number
 * is decided.
 *
 * `MAX_PROMOTED` in top-guides.ts is 32, so the column's length was a
 * property of the content: a guide clearing the promotion floor made the
 * footer taller and nothing in the layout knew. Six is a layout decision and
 * lives with the layout.
 *
 * Six per page, rotated by pathname, still gives every promoted guide
 * inbound footer links from a sixth of the site — enough to move an internal
 * graph at DR 0.2 — while ending the profile where a guide's anchors are one
 * phrase repeated on 387 pages.
 */
export const FOOTER_GUIDES = 6;

const CONCEPT_SECTIONS = ["/how-it-works/", "/practice/", "/library/"];
/** The section roots themselves are hubs, not concept pages. */
const HUB_HREFS = new Set<string>(Object.values(HUBS).map((hub) => hub.href));

/**
 * Whether the footer on this page names the promoted guides by their titles
 * rather than by their keywords.
 *
 * Tracker entry 287 (2026-09-22): the promoted guides received a median 0.96
 * of their inbound anchors as the exact phrase they target, because the
 * hand-written guide-to-guide links use the keyword and the footer repeated
 * it on every page. A page whose inbound anchor profile is a single search
 * term is the shape of a page nobody links to naturally.
 *
 * So the footer alternates by hosting page, and the split follows the layer
 * the page is in rather than a coin: the concept layer already names things
 * by title (entry 266) and the guide layer names them by query (entry 287).
 * Deterministic from the pathname, so the server render and the client agree.
 */
export function footerLabelsByTitle(pathname: string): boolean {
  return (
    CONCEPT_SECTIONS.some((section) => pathname.startsWith(section)) && !HUB_HREFS.has(pathname)
  );
}

/** The footer's anchor for a promoted guide on the page at `pathname`. */
export function footerGuideLabel(guide: FooterGuide, pathname: string): string {
  return footerLabelsByTitle(pathname) ? guide.title : guide.label;
}

/**
 * The six guides this page shows, rotated so it is not the same six
 * everywhere.
 *
 * A cheap deterministic hash of the pathname picks the offset and the list
 * wraps, so every promoted guide appears on roughly the same share of pages
 * and no page shows one twice. Deterministic because the server render and
 * the client hydration have to agree.
 */
export function footerGuideWindow(guides: FooterGuide[], pathname: string): FooterGuide[] {
  if (guides.length <= FOOTER_GUIDES) return guides;
  let hash = 0;
  for (let i = 0; i < pathname.length; i++) hash = (hash * 31 + pathname.charCodeAt(i)) >>> 0;
  const start = hash % guides.length;
  return Array.from({ length: FOOTER_GUIDES }, (_, i) => guides[(start + i) % guides.length]);
}

/** The legal row. `/feed.xml` is a route handler, not a page. */
const LEGAL_LINKS = [
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy" },
];

export function Footer({ topGuides, tagline }: { topGuides: FooterGuide[]; tagline: string }) {
  const pathname = usePathname();
  const guides = footerGuideWindow(topGuides, pathname);

  return (
    // `data-track` on the element itself rather than on the nav inside it:
    // the legal row and the identity link are footer links too, and the
    // delegated listener in providers.tsx reads the nearest [data-track]
    // ancestor, so the email block still reports its own.
    <footer className="border-foreground/10 mt-auto border-t px-6 py-10" data-track="footer">
      <div className="mx-auto grid max-w-5xl gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
        {/* Who this is. The tagline is computed from the graph and was spent
            only on the meta description, so a reader who scrolled the whole
            page never saw what they had been reading. */}
        <div className="lg:col-span-2">
          <Link href="/" className="text-foreground-strong text-sm font-semibold">
            Physics of Connection
          </Link>
          <p className="text-foreground-dim mt-2 max-w-sm text-sm leading-relaxed">
            {tagline} — a worked map of improvisation, where every idea links to the one it depends
            on.
          </p>
        </div>

        {/* The one navigation block left. A `p` rather than an `h2`: four
            navigational headings per page sat at the same rank as the
            article's own sections in every screen reader's heading list. */}
        <nav aria-labelledby="footer-guides">
          <p
            id="footer-guides"
            className="text-foreground-dim mb-3 text-xs font-semibold tracking-wider uppercase"
          >
            More guides
          </p>
          <ul className="space-y-2">
            {guides.map((guide) => (
              <li key={guide.slug}>
                <Link
                  href={`/${guide.slug}`}
                  className="text-foreground-dim hover:text-foreground-strong text-sm transition-colors"
                >
                  {footerGuideLabel(guide, pathname)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Outside the nav on purpose: a subscription form is not navigation,
            and a text input inside a landmark that promises links misstates
            the structure. */}
        <div data-track="footer-email">
          <EmailCapture surface="footer" />
        </div>
      </div>

      <div className="border-foreground/10 mx-auto mt-10 max-w-5xl border-t pt-6">
        <div className="text-foreground-dim flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          {LEGAL_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-foreground-strong">
              {link.label}
            </Link>
          ))}
          {/* A plain anchor: next/link would prefetch an XML route handler
              that cannot answer an RSC request, on every page view. */}
          <a href="/feed.xml" className="hover:text-foreground-strong">
            RSS
          </a>
        </div>
        {/* The Associates participation statement. A different obligation
            from the per-link FTC disclosure on the library entries, which
            stays where it is, beside the links it describes. */}
        <p className="text-foreground-dim mt-3 text-xs">{AFFILIATE_PARTICIPATION}</p>
      </div>
    </footer>
  );
}
