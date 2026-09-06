import Link from "next/link";

/**
 * The 404 is an entry point, and it was the only one nobody had written.
 *
 * Next.js supplies a default — "404: This page could not be found." — and that
 * is what shipped. Of the 71 visible words on it, about 65 were the nav menu.
 * Somebody arriving from a renamed url, a stale search result or a typo got a
 * status code and no way back into 363 pages of content.
 *
 * The routes below are chosen for coverage rather than completeness. The nav
 * already lists everything; repeating it here would be the overload version of
 * the same mistake. These are five different shapes of answer — look a term up,
 * read a guide, run something with a group, follow the theory, find the source —
 * so that whatever brought somebody here has a plausible next step.
 */
const ROUTES: { href: string; label: string; hint: string }[] = [
  {
    href: "/practice/vocabulary",
    label: "Improv glossary",
    hint: "Every term the site defines, if you arrived looking one up.",
  },
  {
    href: "/guides",
    label: "Guides",
    hint: "The long-form answers — conversation, confidence, teams, feedback.",
  },
  {
    href: "/improv-games",
    label: "Improv games",
    hint: "Warm-ups and exercises, with what each one actually trains.",
  },
  {
    href: "/how-it-works",
    label: "How improv works",
    hint: "The laws underneath a scene, and what breaks when they are ignored.",
  },
  {
    href: "/library",
    label: "Reading list",
    hint: "The books and research behind all of it.",
  },
];

export default function NotFound() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-10">
        <span className="text-foreground/40 text-xs tracking-wider uppercase">404</span>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">That page isn&apos;t here</h1>
        {/* Deliberately not "it may have moved". The urls that changed in the
            restructure all redirect, and those redirects were checked against
            production — so a 404 here means the address never existed rather
            than that something was taken away. Saying otherwise would send
            somebody hunting for a page that was never there. */}
        <p className="text-foreground/60 mt-3 leading-relaxed">
          Nothing was removed to make this happen — the addresses that changed all still redirect,
          so this one was most likely mistyped or came from a link that was wrong to begin with. The
          search in the header finds anything by name, and the places below cover most of what
          people arrive looking for.
        </p>
      </header>

      <ul className="space-y-3">
        {ROUTES.map((route) => (
          <li key={route.href}>
            <Link
              href={route.href}
              className="border-foreground/10 bg-surface hover:border-foreground/30 group block rounded-lg border p-4 transition-colors"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <span className="font-semibold">{route.label}</span>
                  <span className="text-foreground/50 mt-1 block text-sm">{route.hint}</span>
                </div>
                <span className="text-foreground/30 shrink-0 transition-transform group-hover:translate-x-1">
                  &rarr;
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <p className="text-foreground/40 mt-8 text-sm">
        Or start from{" "}
        <Link href="/" className="underline">
          the beginning
        </Link>
        .
      </p>
    </main>
  );
}
