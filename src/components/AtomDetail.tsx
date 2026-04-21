import Link from "next/link";

import { getAudioDuration } from "@/lib/audio-manifest";
import {
  getAtomBySlug,
  getAtomUrl,
  getAudioUrl,
  getBridgesForAtom,
  getNextAtomInThread,
  getParentPath,
  getThreadsForAtom,
} from "@/lib/content";
import type { AtomFrontmatter } from "@/lib/schema";
import { extractDescription } from "@/lib/seo";

import { ArticleJsonLd } from "./ArticleJsonLd";
import { AudioPlayer } from "./AudioPlayer";
import { Breadcrumb, type Crumb } from "./Breadcrumb";
import { ContextBanner } from "./ContextBanner";
import { PodcastJsonLd } from "./PodcastJsonLd";
import { WhatsNext } from "./WhatsNext";

const TYPE_LABELS: Record<string, string> = {
  principle: "principle",
  technique: "technique",
  exercise: "exercise",
  insight: "insight",
  definition: "concept",
  pattern: "pattern",
  antipattern: "failure mode",
  law: "why it's hard",
  framework: "framework",
  format: "format",
  pedagogy: "teaching method",
  reference: "reference",
};

const RELATION_LABELS: Record<string, string> = {
  requires: "Builds on",
  enables: "Unlocks",
  contrasts: "Compare",
  extends: "Related",
  illustrates: "Example of",
};

/** Display order for relation types in the sidebar */
const RELATION_ORDER = ["requires", "enables", "extends", "contrasts", "illustrates"];

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
  const audioDuration = audioUrl ? getAudioDuration(audioUrl) : undefined;

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
    }),
  );

  const appearsInPaths = [
    ...new Map(
      threadWithPaths
        .filter((t) => t.pathId)
        .map((t) => [t.pathId, { id: t.pathId!, title: t.pathTitle! }]),
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
    }),
  );

  const hasSidebar =
    resolvedLinks.length > 0 ||
    appearsInThreads.length > 0 ||
    appearsInPaths.length > 0 ||
    appearsInBridges.length > 0;

  // Context banner: find the primary thread/path this atom belongs to
  const primaryThread = appearsInThreads[0] ?? null;
  const primaryPath = appearsInPaths[0] ?? null;
  const otherPaths = appearsInPaths.slice(1);

  // What's next: find next atom in the primary thread
  const nextAtomInThread = primaryThread
    ? await getNextAtomInThread(fm.id, primaryThread.frontmatter.id)
    : null;

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <ArticleJsonLd
        title={fm.title}
        description={extractDescription(atom.html.replace(/<[^>]+>/g, " "))}
        url={atomUrl}
        datePublished={fm.created}
        dateModified={fm.updated}
      />
      {/* Context banner for Google-landing users */}
      {primaryThread && primaryPath && (
        <ContextBanner
          threadTitle={primaryThread.frontmatter.title}
          threadHref={`/threads/${primaryThread.frontmatter.id}`}
          pathTitle={primaryPath.title}
          pathHref={`/paths/${primaryPath.id}`}
          alsoIn={otherPaths.map((p) => ({ title: p.title, href: `/paths/${p.id}` }))}
        />
      )}
      <Breadcrumb crumbs={breadcrumbs} />

      {/* Two-column layout: card left, sidebar right on desktop */}
      <div className={hasSidebar ? "lg:grid lg:grid-cols-[1fr_260px] lg:gap-12" : ""}>
        {/* ── Main content in card ─────────────────────────────── */}
        <div className="sm:bg-surface sm:rounded-xl sm:p-8 sm:shadow-sm sm:dark:shadow-none">
          <header className="mb-8">
            <span className="text-foreground/40 text-xs tracking-wider uppercase">
              {TYPE_LABELS[fm.type] ?? fm.type}
            </span>
            <h1 className="text-foreground-strong mt-1 text-3xl font-bold tracking-tight">
              {fm.title}
            </h1>
          </header>

          {audioUrl && (
            <div>
              <AudioPlayer src={audioUrl} />
              <PodcastJsonLd
                title={fm.title}
                audioUrl={audioUrl}
                pageUrl={atomUrl}
                duration={audioDuration}
              />
            </div>
          )}

          {(() => {
            const FOOTER_LABELS = [
              "Attribution note",
              "Specific sources",
              "Counter-position",
              "Counter-positions",
              "Lineage",
              "Referenced by atoms",
              "Traditions diverge",
              "Success condition",
              "Also relevant",
              "Transfer to scene work",
              "Transfer",
              "Debrief questions",
              "Value to the graph",
              "When to use vs\\. other formats",
            ];
            const footerPattern = new RegExp(
              `(<p><strong>(?:${FOOTER_LABELS.join("|")}):?</strong>[\\s\\S]*)$`,
              "i",
            );
            const attrMatch = atom.html.match(footerPattern);
            const mainHtml = attrMatch ? atom.html.slice(0, attrMatch.index) : atom.html;
            const attrHtml = attrMatch ? attrMatch[1] : null;
            return (
              <>
                <article
                  className="prose prose-neutral dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: mainHtml }}
                />
                {attrHtml && (
                  <aside
                    className="border-foreground/10 text-foreground/40 mt-8 border-t pt-6 text-xs leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: attrHtml }}
                  />
                )}
              </>
            );
          })()}

          {/* What's next */}
          {nextAtomInThread && (
            <WhatsNext
              variant="next-atom"
              title={nextAtomInThread.title}
              href={nextAtomInThread.url}
            />
          )}
          {!nextAtomInThread && primaryThread && (
            <WhatsNext
              variant="back-to-thread"
              threadTitle={primaryThread.frontmatter.title}
              threadHref={`/threads/${primaryThread.frontmatter.id}`}
            />
          )}
        </div>

        {/* ── Sidebar (right on desktop, below on mobile) ──────── */}
        {hasSidebar && (
          <aside className="mt-12 space-y-8 text-sm lg:mt-0">
            {/* Related concepts — grouped by relation type */}
            {resolvedLinks.length > 0 && (
              <div>
                <h2 className="text-foreground/40 mb-3 text-xs font-semibold tracking-wider uppercase">
                  Related
                </h2>
                <dl className="space-y-3">
                  {RELATION_ORDER.filter((rel) =>
                    resolvedLinks.some((l) => l.relation === rel),
                  ).map((rel) => (
                    <div key={rel}>
                      <dt className="text-foreground/40 mb-1 text-xs font-medium">
                        {RELATION_LABELS[rel] ?? rel}
                      </dt>
                      <dd className="space-y-1 pl-0">
                        {resolvedLinks
                          .filter((l) => l.relation === rel)
                          .map((link) => (
                            <Link
                              key={link.id}
                              href={link.url}
                              className="text-foreground/70 block hover:underline"
                            >
                              {link.title}
                            </Link>
                          ))}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {/* Part of — grouped by content type */}
            {(appearsInPaths.length > 0 ||
              appearsInThreads.length > 0 ||
              appearsInBridges.length > 0) && (
              <div>
                <h2 className="text-foreground/40 mb-3 text-xs font-semibold tracking-wider uppercase">
                  Part of
                </h2>
                <dl className="space-y-3">
                  {appearsInPaths.length > 0 && (
                    <div>
                      <dt className="text-foreground/40 mb-1 text-xs font-medium">Paths</dt>
                      <dd className="space-y-1">
                        {appearsInPaths.map((p) => (
                          <Link
                            key={p.id}
                            href={`/paths/${p.id}`}
                            className="text-foreground/70 block hover:underline"
                          >
                            {p.title}
                          </Link>
                        ))}
                      </dd>
                    </div>
                  )}
                  {appearsInThreads.length > 0 && (
                    <div>
                      <dt className="text-foreground/40 mb-1 text-xs font-medium">Threads</dt>
                      <dd className="space-y-1">
                        {appearsInThreads.map((t) => (
                          <Link
                            key={t.frontmatter.id}
                            href={`/threads/${t.frontmatter.id}`}
                            className="text-foreground/70 block hover:underline"
                          >
                            {t.frontmatter.title}
                          </Link>
                        ))}
                      </dd>
                    </div>
                  )}
                  {appearsInBridges.length > 0 && (
                    <div>
                      <dt className="text-foreground/40 mb-1 text-xs font-medium">Guides</dt>
                      <dd className="space-y-1">
                        {appearsInBridges.map((b) => (
                          <Link
                            key={b.slug}
                            href={`/${b.slug}`}
                            className="text-foreground/70 block hover:underline"
                          >
                            {b.frontmatter.title}
                          </Link>
                        ))}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {/* Source */}
            {fm.sources && fm.sources.length > 0 && (
              <div>
                <h2 className="text-foreground/40 mb-3 text-xs font-semibold tracking-wider uppercase">
                  Source
                </h2>
                <ul className="space-y-1">
                  {fm.sources.map((sourceId) => (
                    <li key={sourceId}>
                      <Link
                        href={`/sources/${sourceId}`}
                        className="text-foreground/70 hover:underline"
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
