"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { hubLink, HUBS } from "@/lib/hubs";

import { SearchInput } from "./SearchInput";
import { ThemeToggle } from "./ThemeToggle";

interface NavSection {
  href: string;
  label: string;
  children: { href: string; label: string }[];
}

/**
 * Hub names come from the HUBS table so the menu, the footer, the trail and
 * the page cannot call one hub two things (tracker entry 264). "Overview" is
 * the menu's word for a section's own root, repeated as its first child; the
 * items that are not hubs — the level pages, the tools — keep their own
 * labels here.
 *
 * The whole menu is one client component rather than a server-rendered list
 * with a toggle island, and that is deliberate (tracker entry 265,
 * 2026-09-22). The flight payload behind every page is the output of the
 * server components; this file's markup is in a cached chunk and the flight
 * holds only a module reference for it, so its 42 links cost the page
 * nothing beyond the HTML. Rendered on the server they would be serialised
 * a second time on each of 376 pages, the way the footer's were.
 * `flight-share.test.ts` checks that the menu's labels stay out of the
 * flight.
 */
const OVERVIEW = "Overview";

const NAV_SECTIONS: NavSection[] = [
  {
    ...hubLink(HUBS.howItWorks),
    children: [
      { href: HUBS.howItWorks.href, label: OVERVIEW },
      hubLink(HUBS.principles),
      hubLink(HUBS.diagnosis),
    ],
  },
  {
    ...hubLink(HUBS.practice),
    children: [
      { href: HUBS.practice.href, label: OVERVIEW },
      { href: "/improv-games", label: "Improv Games" },
      hubLink(HUBS.exercises),
      hubLink(HUBS.techniques),
      hubLink(HUBS.formats),
      hubLink(HUBS.glossary),
    ],
  },
  /**
   * Points at /guides rather than /resources.
   *
   * /resources is 233 words whose entire content is links to the hubs already
   * listed below it, and it was taking two of the nav's slots — the section
   * href, which the mobile menu renders as a link, and an "Overview" child.
   * Both are in the server HTML on all 376 pages, so a directory of
   * directories was sitting between the navigation and the real hubs on every
   * one of them.
   *
   * The section keeps its label and loses the intermediary. /guides is the
   * largest hub in the group at 2,765 words and was already a child, so this
   * matches how the other two sections work: the section href is the hub, and
   * a child repeats it by name. The page itself is untouched and still linked
   * from the footer, so nothing is orphaned or dropped from the sitemap.
   */
  /**
   * The nav had nine concept hubs and one item, Guides, for the layer that
   * holds 70% of the site's traffic potential; the lessons hub, the level
   * ladder, the drill picker and the topic hubs were reachable from the
   * footer or the homepage body only (tracker entry 222, 2026-09-21). They
   * join this section under the names their pages already use.
   */
  {
    href: HUBS.guides.href,
    label: "Resources",
    children: [
      hubLink(HUBS.guides),
      { href: "/topics/communication", label: "Guides by Topic" },
      hubLink(HUBS.paths),
      hubLink(HUBS.threads),
      hubLink(HUBS.learn),
      { href: "/tools/exercise-picker/beginner", label: "Find a Drill" },
      { href: "/tools/improv-prompt-generator", label: "Get a Prompt" },
      hubLink(HUBS.listen),
      hubLink(HUBS.traditions),
      hubLink(HUBS.library),
    ],
  },
];

function NavDropdown({ section }: { section: NavSection }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-foreground-dim hover:text-foreground-strong flex cursor-pointer items-center gap-1 text-sm transition-colors"
      >
        {section.label}
        <svg
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {/* Rendered unconditionally and hidden with CSS: mounting this only when
          `open` kept every destination out of the server-rendered HTML, leaving
          the site's main navigation invisible to crawlers. */}
      <div
        data-nav-panel
        className={`bg-surface border-foreground/10 absolute top-full left-0 z-20 mt-2 min-w-[160px] rounded-lg border py-2 shadow-lg ${
          open ? "block" : "hidden"
        }`}
      >
        {section.children.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className="text-foreground-dim hover:text-foreground-strong hover:bg-foreground/5 block cursor-pointer px-4 py-2 text-sm transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function Nav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <nav className="border-foreground/10 relative z-50 border-b px-6 py-3" data-track="nav">
      <div data-nav-bar className="mx-auto flex max-w-5xl items-center justify-between">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          Physics of Connection
        </Link>

        {/*
          One control group, not two.

          Search and the theme toggle used to be rendered twice — once in a
          `hidden sm:flex` block and once in a `sm:hidden` one — which was
          harmless only while the search overlay rendered inside its hidden
          parent. Portalling that overlay to the body on 2026-09-24 took it
          out of the hidden subtree, and both copies started painting: Ctrl+K
          opened two full-screen `aria-modal` dialogs at once, each claiming
          the rest of the document was inert, each with its own Escape
          handler and its own body-scroll lock.

          So the controls render once and the breakpoint decides only what
          sits beside them: the section list on a wide screen, the hamburger
          on a narrow one.
        */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden items-center gap-4 sm:flex">
            {NAV_SECTIONS.map((section) => (
              <NavDropdown key={section.href} section={section} />
            ))}
          </div>

          <SearchInput />
          {/* Moved up from the footer on 2026-09-24. Measured there at 99.3%
              of the scroll depth of a concept page — the only global
              preference control on the site, twelve swipes from where a
              reader notices the page is the wrong brightness. */}
          <ThemeToggle />

          <button
            className="text-foreground-strong cursor-pointer transition-opacity hover:opacity-70 sm:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            {mobileOpen ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu — full viewport overlay. `data-mobile-menu` is the hook
          globals.css uses to give this panel the document's palette back on a
          page whose hero inverts the bar (2026-09-23). */}
      <div
        data-mobile-menu
        className={`bg-background fixed inset-0 top-[49px] z-40 overflow-y-auto px-6 pt-8 pb-12 sm:hidden ${
          mobileOpen ? "block" : "hidden"
        }`}
      >
        {NAV_SECTIONS.map((section) => (
          <div key={section.href} className="mb-8">
            <Link
              href={section.href}
              onClick={() => setMobileOpen(false)}
              className="text-foreground/80 block text-2xl font-semibold"
            >
              {section.label}
            </Link>
            <div className="mt-2 space-y-2 pl-4">
              {section.children.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-foreground-dim hover:text-foreground-strong block text-lg"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </nav>
  );
}
