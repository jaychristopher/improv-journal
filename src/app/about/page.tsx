import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/Breadcrumb";
import { loadAtoms, loadBridges, loadPaths, loadThreads } from "@/lib/content";
import {
  AUTHOR_ID,
  AUTHOR_NAME,
  AUTHOR_PATH,
  ogImages,
  ORGANIZATION_ID,
  pageTitle,
  SITE_NAME,
  SITE_URL,
} from "@/lib/seo";
import { getSystemCounts } from "@/lib/system-counts";

const DESCRIPTION =
  "Who writes The Physics of Connection, where the material comes from, and how the site is put together.";

export const metadata: Metadata = {
  title: pageTitle("About This Site"),
  description: DESCRIPTION,
  alternates: { canonical: AUTHOR_PATH },
  openGraph: {
    title: "About This Site",
    description: DESCRIPTION,
    url: AUTHOR_PATH,
    images: ogImages("About This Site"),
  },
};

const TRADITIONS: { slug: string; label: string }[] = [
  { slug: "johnstone", label: "Keith Johnstone" },
  { slug: "spolin", label: "Viola Spolin" },
  { slug: "close", label: "Del Close and Charna Halpern" },
  { slug: "ucb", label: "Upright Citizens Brigade" },
  { slug: "annoyance", label: "The Annoyance, and TJ & Dave" },
];

export default async function AboutPage() {
  const [atoms, bridges, threads, paths] = await Promise.all([
    loadAtoms(),
    loadBridges(),
    loadThreads(),
    loadPaths(),
  ]);
  const references = atoms.filter((a) => a.frontmatter.type === "reference");
  const counts = await getSystemCounts();

  // The author and organization entities are defined here, once. Every article
  // on the site points its author and publisher at these @ids.
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "AboutPage",
        "@id": `${SITE_URL}${AUTHOR_PATH}`,
        name: "About This Site",
        description: DESCRIPTION,
        url: `${SITE_URL}${AUTHOR_PATH}`,
        mainEntity: { "@id": AUTHOR_ID },
        isPartOf: { "@id": ORGANIZATION_ID },
      },
      {
        "@type": "Person",
        "@id": AUTHOR_ID,
        name: AUTHOR_NAME,
        url: `${SITE_URL}${AUTHOR_PATH}`,
        description: "Improv practitioner, teacher, and researcher.",
        jobTitle: "Improv practitioner, teacher, and researcher",
        knowsAbout: [
          "Improvisation",
          "Improv pedagogy",
          "Ensemble collaboration",
          "Interpersonal communication",
          "Psychological safety",
        ],
      },
      {
        "@type": "Organization",
        "@id": ORGANIZATION_ID,
        name: SITE_NAME,
        url: SITE_URL,
        founder: { "@id": AUTHOR_ID },
        description: `${counts.tagline} — discovered on the improv stage, applicable everywhere.`,
      },
    ],
  };

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Breadcrumb crumbs={[{ label: "Home", href: "/" }, { label: "About" }]} />

      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">About This Site</h1>
        <p className="text-foreground/60 mt-2">{DESCRIPTION}</p>
      </header>

      <div className="prose prose-neutral dark:prose-invert max-w-none">
        <h2>Who writes this</h2>
        <p>
          <strong>{AUTHOR_NAME}</strong> — improv practitioner, teacher, and researcher. The site is
          written and maintained by one person, and everything on it is material worked through in
          practice and in teaching rather than assembled from summaries.
        </p>

        <h2>Where the material comes from</h2>
        <p>
          The content is grounded in roughly sixty years of improv performance practice across five
          major traditions, which disagree with each other often enough to be worth reading
          together:
        </p>
        <ul>
          {TRADITIONS.map((t) => (
            <li key={t.slug}>
              <Link href={`/traditions/${t.slug}`}>{t.label}</Link>
            </li>
          ))}
        </ul>
        <p>
          Primary texts are cited rather than paraphrased at second hand. The{" "}
          <Link href="/library">reading list</Link> holds the {references.length} works this site
          draws on, each with the ideas it supports linked back to it — so you can see which claims
          rest on which source, and go read the source instead if you would rather.
        </p>

        <h2>How the site is built</h2>
        <p>
          The material is written as a knowledge graph rather than a pile of articles, in four
          layers:
        </p>
        <ul>
          <li>
            <strong>{atoms.length} atoms</strong> — the smallest self-contained units: principles,
            techniques, exercises, definitions, and failure patterns. Each links to the others it
            requires, enables, or contradicts.
          </li>
          <li>
            <strong>{threads.length} threads</strong> — atoms composed into a single full argument.
          </li>
          <li>
            <strong>{paths.length} paths</strong> — threads sequenced into a journey for a
            particular kind of reader.
          </li>
          <li>
            <strong>{bridges.length} guides</strong> — problem-first entry points that connect a
            specific difficulty to the underlying principles.
          </li>
        </ul>
        <p>
          Because the graph is explicit, every page can show you what it depends on and what follows
          from it. You can start at <Link href="/how-it-works">the underlying system</Link>, at{" "}
          <Link href="/practice">the practice</Link>, or at whichever{" "}
          <Link href="/guides">guide</Link> matches the problem you actually have.
        </p>

        <h2>Corrections</h2>
        <p>
          Content carries a status of seed, draft, or validated, and those labels are meant honestly
          — a draft is a draft. If something here is wrong, or attributes an idea to the wrong
          person, it should be fixed.
        </p>
      </div>
    </main>
  );
}
