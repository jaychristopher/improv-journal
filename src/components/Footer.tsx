"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { hubLink, HUBS } from "@/lib/hubs";

import { ThemeToggle } from "./ThemeToggle";

/**
 * Site-wide footer navigation.
 *
 * This is the only navigation on the site that is present in the server-
 * rendered HTML for every page, so it carries the internal link graph: the
 * hubs a crawler needs to reach the whole site, plus the guides carrying the
 * most search demand.
 *
 * Hub names come from the HUBS table, as the nav's do: this footer said
 * "Essays" for the hub the nav called "Lessons" (tracker entry 264).
 * "Overview" is the column's word for its own section root.
 *
 * A client component on purpose, and the direction matters (tracker entry
 * 265, 2026-09-22). The React flight payload that follows the HTML on every
 * page is the rendered output of the *server* components; a client component
 * appears in it as a module reference plus its props, and its markup lives
 * once in a cached JavaScript chunk instead. As a server component this
 * footer was 10.3 kB of flight on each of 376 pages — 19 hub links, four
 * headings and the bottom row serialised again behind the HTML that already
 * carried them. The one part that differs from build to build, the promoted
 * guides, arrives as a prop of `{slug, label, title}` triples (about 1.4 kB
 * for 27 as pairs; the title, which the label rule below needs, adds roughly
 * 1.7 kB more), fetched by the layout, which is the only server code left in
 * the chrome. `flight-share.test.ts` holds the footer's links out of the
 * flight and records what the prop costs.
 */
const OVERVIEW = "Overview";

const FOOTER_SECTIONS: { heading: string; links: { href: string; label: string }[] }[] = [
  {
    heading: HUBS.howItWorks.label,
    links: [
      { href: HUBS.howItWorks.href, label: OVERVIEW },
      hubLink(HUBS.principles),
      hubLink(HUBS.diagnosis),
      hubLink(HUBS.traditions),
    ],
  },
  {
    heading: HUBS.practice.label,
    links: [
      { href: HUBS.practice.href, label: OVERVIEW },
      { href: "/improv-games", label: "Improv Games" },
      hubLink(HUBS.exercises),
      hubLink(HUBS.techniques),
      hubLink(HUBS.formats),
      hubLink(HUBS.glossary),
      hubLink(HUBS.tools),
    ],
  },
  {
    heading: "Resources",
    links: [
      { href: "/resources", label: OVERVIEW },
      hubLink(HUBS.paths),
      hubLink(HUBS.guides),
      hubLink(HUBS.threads),
      hubLink(HUBS.library),
      hubLink(HUBS.listen),
      { href: "/about", label: "About" },
      { href: "/feed.xml", label: "RSS Feed" },
    ],
  },
];

/** A promoted guide, trimmed to what the footer renders so the prop stays small. */
interface FooterGuide {
  slug: string;
  /** The guide's head keyword, capitalised (see anchor-text.ts). */
  label: string;
  /** The guide's own title. */
  title: string;
}

/**
 * The concept pages: every route under the three concept sections that is
 * not one of the section hubs themselves. The table of hubs is the one the
 * nav reads, so a hub added there is excluded here without a second list.
 * `/practice/exercises/x` is a concept and `/practice/exercises` is not;
 * `/how-it-works/x` (a law) is a concept and `/how-it-works/principles` is
 * not. 205 of the 376 built pages on 2026-09-22.
 */
const CONCEPT_SECTIONS = ["/how-it-works/", "/practice/", "/library/"];
const HUB_HREFS = new Set<string>(Object.values(HUBS).map((hub) => hub.href));

/**
 * Whether the footer on this page names the promoted guides by their titles
 * rather than by their keywords.
 *
 * Tracker entry 287 (2026-09-22): the 27 promoted guides received a median
 * 0.96 of their inbound anchors as the exact phrase they target, because the
 * hand-written guide-to-guide links use the keyword 218 times in 270 and the
 * footer repeated it on every page. A page whose inbound anchor profile is a
 * single search term is the shape of a page nobody links to naturally.
 *
 * So the footer alternates by hosting page, and the split follows the layer
 * the page is in rather than a coin: the concept layer already names things
 * by title (entry 266: 94% of concept anchors are titles, the linker's habit)
 * and the guide layer names them by query (entry 287: 80%, the author's
 * habit). On a concept page the footer speaks that page's dialect and says
 * the title; everywhere else it says the keyword, in the page's own spelling
 * (entry 279). The concept pages are 205 of 376, so each promoted guide
 * takes roughly half its footer anchors in each form and the split is even
 * without being arbitrary. Deterministic from the pathname, so the server
 * render and the client agree.
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

export function Footer({ topGuides }: { topGuides: FooterGuide[] }) {
  const pathname = usePathname();
  return (
    <footer className="border-foreground/10 mt-auto border-t px-6 py-10">
      <div className="mx-auto max-w-5xl">
        {/* The footer is 46 links on every page, 17,342 sitewide, and the
            block entry 108 found carries most of the links to a guide; it
            fired nothing (tracker entry 259, 2026-09-21). Whether readers use
            it is the one fact that would settle 108. The delegated listener
            in providers.tsx reads this attribute off the rendered anchor's
            ancestor, so it works the same whichever side of the boundary the
            markup renders on. */}
        <nav
          aria-label="Footer"
          data-track="footer"
          className="grid grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-3 lg:grid-cols-4"
        >
          {FOOTER_SECTIONS.map((section) => (
            <div key={section.heading}>
              <h2 className="text-foreground-dim mb-3 text-xs font-semibold tracking-wider uppercase">
                {section.heading}
              </h2>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-foreground-dim hover:text-foreground-strong text-sm transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h2 className="text-foreground-dim mb-3 text-xs font-semibold tracking-wider uppercase">
              Popular Guides
            </h2>
            <ul className="space-y-2">
              {topGuides.map((guide) => (
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
          </div>
        </nav>

        <div className="border-foreground/10 mt-10 flex items-center justify-between border-t pt-6">
          <span className="text-foreground-dim text-xs">Physics of Connection</span>
          <ThemeToggle />
        </div>
      </div>
    </footer>
  );
}
