"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { hubLink, HUBS } from "@/lib/hubs";
import { lockScroll } from "@/lib/scroll-lock";

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
/*
 * "Overview" was the first child of the first two sections, repeating each
 * section's own root. It was the single most-repeated internal anchor on
 * the site — Ahrefs put it at 717 links across 2 destinations, ahead of the
 * brand anchor at 380 — and it describes nothing. The footer's three were
 * deleted on 2026-09-24; these are the last of them.
 *
 * The root child takes the hub's own name instead, so /how-it-works and
 * /practice finally have a descriptive sitewide anchor.
 */

const NAV_SECTIONS: NavSection[] = [
  {
    ...hubLink(HUBS.howItWorks),
    children: [
      hubLink(HUBS.howItWorks),
      hubLink(HUBS.principles),
      hubLink(HUBS.diagnosis),
      // Where the ideas came from belongs with what they are, not in a
      // drawer called Resources.
      hubLink(HUBS.traditions),
      hubLink(HUBS.library),
    ],
  },
  {
    ...hubLink(HUBS.practice),
    children: [
      hubLink(HUBS.practice),
      { href: "/improv-games", label: "Improv Games" },
      hubLink(HUBS.exercises),
      hubLink(HUBS.techniques),
      hubLink(HUBS.formats),
      hubLink(HUBS.glossary),
    ],
  },
  /**
   * The guide layer, by the clusters /guides already sorts it into.
   *
   * One item used to stand for all of this — "Guides by Topic", pointing at
   * /topics/communication alone. The other three clusters were reachable
   * from about 20 pages against 386, and between them they hold most of the
   * corpus the nav was not linking: teams and personal growth are the two
   * largest after communication. The labels are the ones guide-categories.ts
   * gives each cluster, so this menu cannot call a cluster something its own
   * hub does not.
   */
  {
    ...hubLink(HUBS.guides),
    children: [
      hubLink(HUBS.guides),
      { href: "/topics/communication", label: "Relationships & Communication" },
      { href: "/topics/teams", label: "Teams & Leadership" },
      { href: "/topics/personal-growth", label: "Personal Growth" },
      { href: "/topics/improv-skills", label: "Improv Skills" },
    ],
  },
  /**
   * The curriculum and the tools that drive it.
   *
   * This and the section above were one item called "Resources" with ten
   * children of four unrelated kinds — collections, curriculum, tools and
   * media — under a label whose href pointed at /guides, so the word named
   * nothing and the section root and its own first child were the same URL.
   *
   * The picker is linked at its hub rather than at `/beginner`: the facet
   * had 11 inbound body links against the hub's 56, and it was the only nav
   * destination search has ever surfaced — at position 56.
   */
  {
    ...hubLink(HUBS.paths),
    label: "Learn",
    children: [
      hubLink(HUBS.paths),
      hubLink(HUBS.threads),
      hubLink(HUBS.learn),
      hubLink(HUBS.tools),
      { href: "/tools/improv-prompt-generator", label: "Get a Prompt" },
      hubLink(HUBS.listen),
    ],
  },
];

/**
 * A section trigger and its panel.
 *
 * APG's Disclosure pattern, deliberately not Menu: these are links to pages,
 * not application commands, so `role="menu"`, `aria-haspopup` and roving
 * arrow keys would promise a behaviour screen-reader users would then find
 * missing. What Disclosure does require is `aria-expanded`, and the trigger
 * had none — activating it announced nothing at all while ten links
 * appeared.
 *
 * Dismissal used to be a `mousedown` outside, which a keyboard cannot
 * produce: a panel opened with the keyboard stayed open for the rest of the
 * session, and all three could be stacked at once.
 */
/**
 * Whether the reader is somewhere inside this section.
 *
 * Nothing in the header said where you were — measured 0 `aria-current` and
 * 0 active states across the site. On a graph of 367 pages whose whole
 * proposition is that it is structured, the one element on every page never
 * showed which of four branches the reader was in.
 *
 * Matched against the children's hrefs rather than the section's own, which
 * is what made this impossible before: the old third section was labelled
 * "Resources" and pointed at /guides, so a path test against the section
 * href was wrong for a third of the nav.
 */
function isInside(section: NavSection, pathname: string): boolean {
  if (pathname === "/") return false;
  return section.children.some(
    (child) => pathname === child.href || pathname.startsWith(`${child.href}/`),
  );
}

function NavDropdown({
  section,
  open,
  setOpen,
  pathname,
}: {
  section: NavSection;
  open: boolean;
  setOpen: (open: boolean) => void;
  pathname: string;
}) {
  const inside = isInside(section, pathname);
  const panelId = `nav-panel-${section.href.replace(/\W+/g, "-")}`;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        ref.current?.querySelector("button")?.focus();
      }
    }
    // `focusout` as well as `mousedown`, or the keyboard has no way to
    // dismiss what it opened.
    function handleFocusOut(e: FocusEvent) {
      if (ref.current && !ref.current.contains(e.relatedTarget as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    ref.current?.addEventListener("focusout", handleFocusOut);
    const node = ref.current;
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
      node?.removeEventListener("focusout", handleFocusOut);
    };
  }, [open, setOpen]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={panelId}
        className={`hover:text-foreground-strong flex cursor-pointer items-center gap-1 text-sm transition-colors ${
          inside
            ? "text-foreground-strong decoration-foreground-strong/40 font-semibold underline underline-offset-8"
            : "text-foreground-dim"
        }`}
      >
        {section.label}
        <svg
          aria-hidden="true"
          focusable="false"
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
        id={panelId}
        className={`bg-surface border-foreground/10 absolute top-full left-0 z-20 mt-2 min-w-[160px] rounded-lg border py-2 shadow-lg ${
          open ? "block" : "hidden"
        }`}
      >
        {section.children.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.href === pathname ? "page" : undefined}
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
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  /** One at a time: all three panels could be stacked open before. */
  const [openSection, setOpenSection] = useState<string | null>(null);

  // Lock body scroll when mobile menu is open
  const menuRef = useRef<HTMLDivElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);

  /**
   * The menu is a modal, and behaved like nothing.
   *
   * It declared no role, no name and no state; Escape did nothing; and Tab
   * ran off the end of its 22 links into page controls sitting entirely
   * underneath an opaque panel — a hard 2.4.11 failure, measured. The
   * scroll lock is shared now too: Nav and SearchInput both used to write
   * `body.style.overflow` with no reference count, so closing the search
   * released the page while this menu was still covering it.
   */
  useEffect(() => {
    if (!mobileOpen) return;
    const release = lockScroll();
    // Captured now: by cleanup time the ref may point somewhere else, and
    // focus would be handed back to nothing.
    const burger = burgerRef.current;
    const menu = menuRef.current;

    menu?.querySelector<HTMLElement>("a")?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileOpen(false);
        return;
      }
      if (event.key !== "Tab" || !menu) return;
      const focusable = [...menu.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      release();
      burger?.focus();
    };
  }, [mobileOpen]);

  return (
    <nav
      aria-label="Main"
      /* Sticky since 2026-09-24. /how-to-read-the-room is 13,110px tall at
         390px — 15.5 screens — and the navigation existed for one of them,
         so for a reader mid-guide there was no way anywhere without
         scrolling back to the top. `bg-background` because a transparent
         bar over scrolling prose is unreadable; the takeover pages override
         both in globals.css, where the bar is absolute and has no fill. */
      className="border-foreground/10 bg-background sticky top-0 z-50 border-b px-6 py-3"
      data-track="nav"
    >
      <div data-nav-bar className="mx-auto flex max-w-5xl items-center justify-between">
        {/* `truncate` so the bar cannot force a horizontal scrollbar. At
            200% text the wordmark alone is wider than a 390px viewport once
            the controls have taken their share, and nothing wrapped or gave
            way — the whole document scrolled sideways (1.4.10 Reflow). The
            controls keep their size; the name yields. */}
        <Link href="/" className="min-w-0 truncate text-base font-semibold tracking-tight">
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
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <div className="hidden items-center gap-4 sm:flex">
            {NAV_SECTIONS.map((section) => (
              <NavDropdown
                key={section.href}
                section={section}
                pathname={pathname}
                open={openSection === section.href}
                setOpen={(next) => setOpenSection(next ? section.href : null)}
              />
            ))}
          </div>

          <SearchInput />
          {/* Moved up from the footer on 2026-09-24. Measured there at 99.3%
              of the scroll depth of a concept page — the only global
              preference control on the site, twelve swipes from where a
              reader notices the page is the wrong brightness. */}
          <ThemeToggle />

          <button
            ref={burgerRef}
            type="button"
            className="text-foreground-strong flex h-8 w-8 cursor-pointer items-center justify-center transition-opacity hover:opacity-70 sm:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-controls="site-menu"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? (
              <svg
                aria-hidden="true"
                focusable="false"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                aria-hidden="true"
                focusable="false"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
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
        ref={menuRef}
        data-mobile-menu
        id="site-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Site navigation"
        /*
         * `absolute top-full` rather than `fixed top-[49px]`.
         *
         * The literal assumed a 48px bar. The bar measures 57px, so the
         * panel's top 8px had always been underneath it. Worse, the literal
         * is px while the bar's padding and controls are rem: at 200% text
         * the bar grows to 129px and the panel does not move, burying the
         * first 80px of the menu — and on a takeover page that leaves the
         * close button painted in hero white over the light panel at 1.04:1
         * and 5px off the right edge. A reader at 200% could not close the
         * menu they had just opened (1.4.4).
         *
         * `top-full` is the bar's own bottom edge, whatever it turns out to
         * be, so the two can never disagree again.
         */
        className={`bg-background absolute inset-x-0 top-full z-40 h-[100dvh] overflow-y-auto px-6 pt-8 pb-12 sm:hidden ${
          mobileOpen ? "block" : "hidden"
        }`}
      >
        {/* A heading and a list, not 22 flat links. The grouping was in the
            CSS only — an indent under a big bold link — so a screen reader
            got no sections, no counts and no way to skip one. The label is
            a heading now rather than a link, because its first child
            already carries the section root's name and href; it used to be
            two adjacent links to the same URL, the second called
            "Overview". */}
        {NAV_SECTIONS.map((section) => (
          <section key={section.href} className="mb-8" aria-labelledby={`menu-${section.label}`}>
            <h2 id={`menu-${section.label}`} className="text-foreground/80 text-2xl font-semibold">
              {section.label}
            </h2>
            <ul className="mt-2 space-y-2 pl-4">
              {section.children.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={item.href === pathname ? "page" : undefined}
                    onClick={() => setMobileOpen(false)}
                    className={`hover:text-foreground-strong block text-lg ${
                      item.href === pathname
                        ? "text-foreground-strong font-semibold"
                        : "text-foreground-dim"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </nav>
  );
}
