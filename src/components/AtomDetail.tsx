import Link from "next/link";
import { AudioPlayer } from "./AudioPlayer";
import { Breadcrumb, type Crumb } from "./Breadcrumb";
import { PodcastJsonLd } from "./PodcastJsonLd";
import {
  getAtomUrl,
  getAudioUrl,
  getThreadsForAtom,
  getParentPath,
  getBridgesForAtom,
  getAtomBySlug,
} from "@/lib/content";
import type { AtomFrontmatter } from "@/lib/schema";
import fs from "fs";
import path from "path";

const TYPE_LABELS: Record<string, string> = {
  principle: "principle",
  technique: "technique",
  exercise: "exercise",
  insight: "insight",
  definition: "concept",
  pattern: "pattern",
  antipattern: "failure mode",
  axiom: "axiom",
  framework: "framework",
  format: "format",
  pedagogy: "teaching method",
  reference: "reference",
};

const RELATION_LABELS: Record<string, string> = {
  requires: "builds on",
  enables: "unlocks",
  contrasts: "compare with",
  extends: "related",
  illustrates: "example of",
};

interface AtomDetailProps {
  atom: {
    frontmatter: AtomFrontmatter;
    html: string;
    slug: string;
  };
  breadcrumbs: Crumb[];
}

export async function AtomDetail({ atom, breadcrumbs }: AtomDetailProps) {
  const fm = atom.frontmatter;
  const audioUrl = getAudioUrl("atoms", atom.slug);
  const atomUrl = getAtomUrl({ id: fm.id, type: fm.type });

  // Get duration for structured data
  let audioDuration: string | undefined;
  if (audioUrl) {
    try {
      const durPath = path.join(
        process.cwd(),
        "public",
        "audio",
        "durations.json"
      );
      const durations = JSON.parse(fs.readFileSync(durPath, "utf-8"));
      audioDuration = durations[audioUrl]?.formatted;
    } catch {
      /* no duration cache */
    }
  }

  // Reverse lookups
  const [appearsInThreads, appearsInBridges] = await Promise.all([
    getThreadsForAtom(atom.slug),
    getBridgesForAtom(atom.slug),
  ]);

  const threadWithPaths = await Promise.all(
    appearsInThreads.map(async (t) => {
      const parentPath = await getParentPath(t.frontmatter.id);
      return {
        id: t.frontmatter.id,
        title: t.frontmatter.title,
        pathId: parentPath?.frontmatter.id ?? null,
        pathTitle: parentPath?.frontmatter.title ?? null,
      };
    })
  );

  const appearsInPaths = [
    ...new Map(
      threadWithPaths
        .filter((t) => t.pathId)
        .map((t) => [t.pathId, { id: t.pathId!, title: t.pathTitle! }])
    ).values(),
  ];

  // Resolve linked atom titles and URLs
  const resolvedLinks = await Promise.all(
    (fm.links ?? []).map(async (link) => {
      const linked = await getAtomBySlug(link.id);
      return {
        id: link.id,
        relation: link.relation,
        title: linked?.frontmatter.title ?? link.id,
        url: linked
          ? getAtomUrl({ id: link.id, type: linked.frontmatter.type })
          : `/how-it-works/${link.id}`,
      };
    })
  );

  const hasSidebar =
    resolvedLinks.length > 0 ||
    appearsInThreads.length > 0 ||
    appearsInPaths.length > 0 ||
    appearsInBridges.length > 0;

  return (
    <main className="max-w-5xl mx-auto px-6 py-16">
      <Breadcrumb crumbs={breadcrumbs} />

      <header className="mb-8 max-w-2xl">
        <span className="text-xs uppercase tracking-wider text-foreground/40">
          {TYPE_LABELS[fm.type] ?? fm.type}
        </span>
        <h1 className="text-3xl font-bold tracking-tight mt-1">{fm.title}</h1>
      </header>

      {audioUrl && (
        <div className="max-w-2xl">
          <AudioPlayer src={audioUrl} />
          <PodcastJsonLd
            title={fm.title}
            audioUrl={audioUrl}
            pageUrl={atomUrl}
            duration={audioDuration}
          />
        </div>
      )}

      {/* Two-column layout: content left, sidebar right on desktop */}
      <div
        className={
          hasSidebar
            ? "lg:grid lg:grid-cols-[1fr_260px] lg:gap-12"
            : ""
        }
      >
        {/* ── Main content ─────────────────────────────────────── */}
        <article
          className="prose prose-neutral dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: atom.html }}
        />

        {/* ── Sidebar (right on desktop, below on mobile) ──────── */}
        {hasSidebar && (
          <aside className="mt-12 lg:mt-0 space-y-8 text-sm">
            {/* Related concepts */}
            {resolvedLinks.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-3">
                  Related
                </h2>
                <ul className="space-y-2">
                  {resolvedLinks.map((link) => (
                    <li key={link.id}>
                      <Link
                        href={link.url}
                        className="hover:underline text-foreground/70"
                      >
                        {link.title}
                      </Link>
                      <span className="text-xs text-foreground/30 ml-1.5">
                        &middot; {RELATION_LABELS[link.relation] ?? link.relation}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Part of (paths + threads + guides) */}
            {(appearsInPaths.length > 0 ||
              appearsInThreads.length > 0 ||
              appearsInBridges.length > 0) && (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-3">
                  Part of
                </h2>
                <ul className="space-y-2">
                  {appearsInPaths.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/paths/${p.id}`}
                        className="hover:underline text-foreground/70"
                      >
                        {p.title}
                      </Link>
                      <span className="text-xs text-foreground/30 ml-1.5">
                        &middot; path
                      </span>
                    </li>
                  ))}
                  {appearsInThreads.map((t) => (
                    <li key={t.frontmatter.id}>
                      <Link
                        href={`/threads/${t.frontmatter.id}`}
                        className="hover:underline text-foreground/70"
                      >
                        {t.frontmatter.title}
                      </Link>
                      <span className="text-xs text-foreground/30 ml-1.5">
                        &middot; thread
                      </span>
                    </li>
                  ))}
                  {appearsInBridges.map((b) => (
                    <li key={b.slug}>
                      <Link
                        href={`/${b.slug}`}
                        className="hover:underline text-foreground/70"
                      >
                        {b.frontmatter.title}
                      </Link>
                      <span className="text-xs text-foreground/30 ml-1.5">
                        &middot; guide
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Source */}
            {fm.sources && fm.sources.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground/40 mb-3">
                  Source
                </h2>
                <ul className="space-y-1">
                  {fm.sources.map((sourceId) => (
                    <li key={sourceId}>
                      <Link
                        href={`/sources/${sourceId}`}
                        className="hover:underline text-foreground/70"
                      >
                        {sourceId.replace(/-/g, " ")}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        )}
      </div>
    </main>
  );
}
