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
  loadSources,
} from "@/lib/content";
import { loadImprovGames } from "@/lib/games";
import { definitionFromHtml, isGlossaryType } from "@/lib/glossary";
import { contentsFor } from "@/lib/headings";
import type { AtomFrontmatter } from "@/lib/schema";
import { getSeriesForPage } from "@/lib/shows-for-content";

import { ArticleJsonLd } from "./ArticleJsonLd";
import { AudioPlayer } from "./AudioPlayer";
import { Breadcrumb, type Crumb } from "./Breadcrumb";
import { ContextBanner } from "./ContextBanner";
import { DefinedTermJsonLd } from "./DefinedTermJsonLd";
import { PodcastJsonLd } from "./PodcastJsonLd";
import { SidebarLinkGroup } from "./SidebarLinkGroup";
import { TableOfContents } from "./TableOfContents";
import { UpdatedOn } from "./UpdatedOn";
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
  /**
   * The description the route ships in its meta tag, passed in rather than
   * derived a second time here. Deriving it separately had 38 pages saying two
   * different things about themselves.
   */
  description: string;
  /**
   * The label this atom's route puts on its og:image. Held here rather than
   * derived from TYPE_LABELS, which is a different vocabulary — that renders
   * "why it's hard" where the route writes "How It Works".
   */
  eyebrow?: string;
}

export async function AtomDetail({ atom, breadcrumbs, description, eyebrow }: AtomDetailProps) {
  const fm = atom.frontmatter;
  const audioUrl = getAudioUrl("atoms", atom.slug);
  const atomUrl = getAtomUrl({ id: fm.id, type: fm.type });
  const series = audioUrl ? await getSeriesForPage(atomUrl) : null;
  const audioDuration = audioUrl ? getAudioDuration(audioUrl) : undefined;
  // Titles for the Source block. The ids render as anchor text otherwise, and
  // "improv is high stakes reality construction" is a slug with the hyphens
  // taken out, not a title — it reads as machine output and says less about
  // the destination than the real one does.
  const sourceTitles = fm.sources?.length
    ? new Map((await loadSources()).map((s) => [s.frontmatter.id, s.frontmatter.title]))
    : null;

  // Reverse lookups
  const [appearsInThreads, appearsInBridges, improvGames] = await Promise.all([
    getThreadsForAtom(atom.slug),
    getBridgesForAtom(atom.slug),
    loadImprovGames(),
  ]);

  /**
   * getBridgesForAtom returns bridges, so a hub that lives on a route rather
   * than in content could never appear in this sidebar. /improv-games is the
   * biggest improv term the site targets at 3,100 a month, and every one of
   * the game pages that make up its content linked to everything except it.
   * Membership is read from the hub's own loader rather than inferred from
   * type, so a page never claims to be in a collection that does not list it.
   */
  const inImprovGames = improvGames.some((game) => game.id === fm.id);

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
    appearsInBridges.length > 0 ||
    inImprovGames;

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
      {/* Every named concept is a term of art, not just the 28 typed
          `definition`. A generic Article tells a crawler nothing about what
          "Pattern Break" is. */}
      {isGlossaryType(fm.type) && (
        <DefinedTermJsonLd
          term={{
            id: fm.id,
            term: fm.title,
            url: atomUrl,
            type: fm.type,
            definition: definitionFromHtml(atom.html),
            aliases: fm.aliases,
          }}
        />
      )}
      <ArticleJsonLd
        title={fm.title}
        description={description}
        url={atomUrl}
        datePublished={fm.created}
        dateModified={fm.updated}
        eyebrow={eyebrow}
        subject={fm.subject}
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
            {/*
              ArticleJsonLd above is unconditional here, so every one of these
              pages already tells a parser who wrote it and when it changed.
              155 of them showed a reader neither. I left atoms out when the
              byline went onto the guides, reasoning that they carry no date
              line and the design meant to treat them differently — but the
              design also gives them Article, author and dateModified, so it
              was not making that distinction and I picked the wrong half of it.
            */}
            <UpdatedOn date={fm.updated} className="text-foreground/50 mt-3 text-xs" />
          </header>

          {audioUrl && (
            <div>
              <AudioPlayer src={audioUrl} />
              {series && (
                <>
                  <p className="text-foreground/50 mt-2 text-xs">
                    An episode of{" "}
                    <Link href={`/listen/${series.id}`} className="underline">
                      {series.title}
                    </Link>
                    .
                  </p>
                  <PodcastJsonLd
                    title={fm.title}
                    audioUrl={audioUrl}
                    pageUrl={atomUrl}
                    duration={audioDuration}
                    series={series}
                  />
                </>
              )}
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
                <TableOfContents headings={contentsFor(mainHtml)} />
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
                        <SidebarLinkGroup
                          links={resolvedLinks
                            .filter((l) => l.relation === rel)
                            .map((link) => ({ key: link.id, href: link.url, label: link.title }))}
                        />
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {/* Part of — grouped by content type */}
            {(appearsInPaths.length > 0 ||
              appearsInThreads.length > 0 ||
              appearsInBridges.length > 0 ||
              inImprovGames) && (
              <div>
                <h2 className="text-foreground/40 mb-3 text-xs font-semibold tracking-wider uppercase">
                  Part of
                </h2>
                <dl className="space-y-3">
                  {appearsInPaths.length > 0 && (
                    <div>
                      <dt className="text-foreground/40 mb-1 text-xs font-medium">Paths</dt>
                      <dd className="space-y-1">
                        <SidebarLinkGroup
                          links={appearsInPaths.map((p) => ({
                            key: p.id,
                            href: `/paths/${p.id}`,
                            label: p.title,
                          }))}
                        />
                      </dd>
                    </div>
                  )}
                  {appearsInThreads.length > 0 && (
                    <div>
                      <dt className="text-foreground/40 mb-1 text-xs font-medium">Threads</dt>
                      <dd className="space-y-1">
                        <SidebarLinkGroup
                          links={appearsInThreads.map((t) => ({
                            key: t.frontmatter.id,
                            href: `/threads/${t.frontmatter.id}`,
                            label: t.frontmatter.title,
                          }))}
                        />
                      </dd>
                    </div>
                  )}
                  {inImprovGames && (
                    <div>
                      <dt className="text-foreground/40 mb-1 text-xs font-medium">Collections</dt>
                      <dd className="space-y-1">
                        <Link
                          href="/improv-games"
                          className="text-foreground/70 block hover:underline"
                        >
                          Improv Games
                        </Link>
                      </dd>
                    </div>
                  )}
                  {appearsInBridges.length > 0 && (
                    <div>
                      <dt className="text-foreground/40 mb-1 text-xs font-medium">Guides</dt>
                      <dd className="space-y-1">
                        {/* The group this was built for: sixteen entries, against two
                            to nine everywhere else. See SIDEBAR_VISIBLE. */}
                        <SidebarLinkGroup
                          links={appearsInBridges.map((b) => ({
                            key: b.slug,
                            href: `/${b.slug}`,
                            label: b.frontmatter.title,
                          }))}
                        />
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
                        {sourceTitles?.get(sourceId) ?? sourceId.replace(/-/g, " ")}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        )}
      </div>

      {fm.type === "exercise" && (
        <div className="border-foreground/10 mt-12 border-t pt-8">
          <Link
            href="/tools/exercise-picker"
            className="text-foreground/40 hover:text-foreground/60 text-sm underline decoration-dotted"
          >
            Find more exercises like this &rarr;
          </Link>
        </div>
      )}
    </main>
  );
}
