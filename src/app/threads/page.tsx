import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/Breadcrumb";
import { CollectionJsonLd } from "@/components/CollectionJsonLd";
import { loadThreads } from "@/lib/content";
import { definitionFromHtml } from "@/lib/glossary";
import { pageTitle } from "@/lib/seo";

export const THREADS_URL = "/threads";

export const metadata: Metadata = {
  title: pageTitle("Improv Essays: The Ideas Worked Through in Full"),
  description:
    "Longer pieces that take the atoms and follow one argument all the way — scene anatomy, the plateau, and the physics under an ordinary room.",
  alternates: { canonical: THREADS_URL },
};

/**
 * Groups derived from the threads' own tags, not a hand-kept id list.
 *
 * The library hub keeps its entries in curated tiers and ten of thirty-two
 * quietly fell out of them, appearing on the site but not on the shelf meant to
 * enumerate them. A tag rule cannot drift that way: every thread matches a
 * group or falls into the last one, so publishing a thread is enough to list it.
 */
const GROUPS: { label: string; description: string; tags: string[] }[] = [
  {
    label: "Fundamentals",
    description: "The unit everything else is built from, and the parts of it that can fail.",
    tags: ["fundamentals", "scene-work", "structure", "principles"],
  },
  {
    label: "The system",
    description: "Why the parts behave as they do once you look at them together.",
    tags: ["systems-thinking", "synthesis", "presence", "definitions"],
  },
  {
    label: "Advanced craft",
    description: "Shows rather than scenes, and the problems that only appear later.",
    tags: ["advanced", "mastery", "show-craft", "performance"],
  },
  {
    label: "Beyond the stage",
    description: "The same mechanics in rooms where nobody is performing.",
    tags: ["beyond-stage", "self-coaching", "pedagogy"],
  },
];

const ORIENTATION = [
  "Atoms name one thing each. Threads are where several of them get put together and followed until the argument finishes — longer, and meant to be read rather than referred to.",
  "Most of these stand alone. A few sit inside a learning path, which is a sequence built for a particular reader; the rest are here because the idea needed the room.",
];

export default async function ThreadsPage() {
  const threads = await loadThreads();

  const entries = threads.map((thread) => ({
    id: thread.frontmatter.id,
    title: thread.frontmatter.title,
    url: `/threads/${thread.frontmatter.id}`,
    tags: thread.frontmatter.tags ?? [],
    lead: definitionFromHtml(thread.html, 220),
  }));

  const grouped = GROUPS.map((group) => ({
    ...group,
    items: entries.filter(
      (e) =>
        e.tags.some((t) => group.tags.includes(t)) &&
        // First matching group wins, so a thread appears exactly once.
        GROUPS.findIndex((g) => e.tags.some((t) => g.tags.includes(t))) === GROUPS.indexOf(group),
    ),
  }));

  const placed = new Set(grouped.flatMap((g) => g.items.map((i) => i.id)));
  const rest = entries.filter((e) => !placed.has(e.id));
  const sections = [
    ...grouped.filter((g) => g.items.length > 0),
    ...(rest.length > 0
      ? [
          {
            label: "Everything else",
            description: "Pieces that do not sit neatly under one of the headings above.",
            items: rest,
          },
        ]
      : []),
  ];

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <CollectionJsonLd
        name="Improv Essays"
        description="Longer pieces that take the atoms and follow an argument all the way."
        url={THREADS_URL}
        items={entries.map((e) => ({ name: e.title, url: e.url }))}
      />
      <Breadcrumb crumbs={[{ label: "Home", href: "/" }, { label: "Essays" }]} />

      <header className="mb-12">
        <h1 className="mb-4 text-3xl font-bold tracking-tight">Improv Essays</h1>
        {ORIENTATION.map((paragraph) => (
          <p key={paragraph.slice(0, 40)} className="text-foreground/70 mb-3 last:mb-0">
            {paragraph}
          </p>
        ))}
      </header>

      {sections.map((section) => (
        <section key={section.label} className="mb-12 last:mb-0">
          <h2 className="text-foreground/40 mb-1 text-xs font-semibold tracking-wider uppercase">
            {section.label} ({section.items.length})
          </h2>
          <p className="text-foreground/50 mb-4 text-sm">{section.description}</p>
          <dl className="space-y-6">
            {section.items.map((item) => (
              <div
                key={item.id}
                className="border-foreground/10 border-b pb-6 last:border-b-0 last:pb-0"
              >
                <dt>
                  <Link href={item.url} className="text-lg font-semibold hover:underline">
                    {item.title}
                  </Link>
                </dt>
                <dd className="text-foreground/60 mt-1 text-sm">{item.lead}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </main>
  );
}
