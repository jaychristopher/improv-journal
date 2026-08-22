import Link from "next/link";

import { getTopGuides } from "@/lib/top-guides";

import { ThemeToggle } from "./ThemeToggle";

/**
 * Site-wide footer navigation.
 *
 * This is the only navigation on the site that is present in the server-
 * rendered HTML for every page, so it carries the internal link graph: the
 * hubs a crawler needs to reach the whole site, plus the guides carrying the
 * most search demand.
 */
const FOOTER_SECTIONS: { heading: string; links: { href: string; label: string }[] }[] = [
  {
    heading: "How It Works",
    links: [
      { href: "/how-it-works", label: "Overview" },
      { href: "/how-it-works/principles", label: "Principles" },
      { href: "/how-it-works/diagnosis", label: "Diagnosis" },
      { href: "/traditions", label: "Traditions" },
    ],
  },
  {
    heading: "Practice",
    links: [
      { href: "/practice", label: "Overview" },
      { href: "/improv-games", label: "Improv Games" },
      { href: "/practice/exercises", label: "Exercises" },
      { href: "/practice/techniques", label: "Techniques" },
      { href: "/practice/formats", label: "Formats" },
      { href: "/practice/vocabulary", label: "Glossary" },
      { href: "/tools/exercise-picker", label: "Exercise Picker" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { href: "/resources", label: "Overview" },
      { href: "/paths", label: "Learning Paths" },
      { href: "/guides", label: "Guides" },
      { href: "/library", label: "Reading List" },
      { href: "/listen", label: "Listen" },
      { href: "/about", label: "About" },
    ],
  },
];

export async function Footer() {
  const topGuides = await getTopGuides();

  return (
    <footer className="border-foreground/10 mt-auto border-t px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <nav
          aria-label="Footer"
          className="grid grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-3 lg:grid-cols-4"
        >
          {FOOTER_SECTIONS.map((section) => (
            <div key={section.heading}>
              <h2 className="text-foreground/40 mb-3 text-xs font-semibold tracking-wider uppercase">
                {section.heading}
              </h2>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-foreground/60 hover:text-foreground/90 text-sm transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h2 className="text-foreground/40 mb-3 text-xs font-semibold tracking-wider uppercase">
              Popular Guides
            </h2>
            <ul className="space-y-2">
              {topGuides.map((guide) => (
                <li key={guide.slug}>
                  <Link
                    href={`/${guide.slug}`}
                    className="text-foreground/60 hover:text-foreground/90 text-sm transition-colors"
                  >
                    {guide.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="border-foreground/10 mt-10 flex items-center justify-between border-t pt-6">
          <span className="text-foreground/30 text-xs">Physics of Connection</span>
          <ThemeToggle />
        </div>
      </div>
    </footer>
  );
}
