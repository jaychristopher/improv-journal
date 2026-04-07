import Link from "next/link";
import { AudioPlayer } from "./AudioPlayer";
import { Breadcrumb, type Crumb } from "./Breadcrumb";
import {
  getAtomUrl,
  getAudioUrl,
  getThreadsForAtom,
  getParentPath,
  getBridgesForAtom,
  getAtomBySlug,
} from "@/lib/content";
import type { AtomFrontmatter } from "@/lib/schema";

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
          : `/system/${link.id}`,
      };
    })
  );

  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <Breadcrumb crumbs={breadcrumbs} />

      <header className="mb-8">
        <span className="text-xs uppercase tracking-wider text-foreground/40">
          {fm.type}
        </span>
        <h1 className="text-3xl font-bold tracking-tight mt-1">{fm.title}</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          {fm.tags?.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded-full bg-foreground/5 text-foreground/50"
            >
              {tag}
            </span>
          ))}
        </div>
      </header>

      {audioUrl && <AudioPlayer src={audioUrl} />}

      <article
        className="prose prose-neutral dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: atom.html }}
      />

      {resolvedLinks.length > 0 && (
        <nav className="mt-12 pt-8 border-t border-foreground/10">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/40 mb-4">
            Connections
          </h2>
          <ul className="space-y-2">
            {resolvedLinks.map((link) => (
              <li key={link.id}>
                <Link href={link.url} className="text-sm hover:underline">
                  {link.title}
                </Link>
                <span className="text-xs text-foreground/40 ml-2">
                  {link.relation}
                </span>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {fm.sources && fm.sources.length > 0 && (
        <nav className="mt-8 pt-8 border-t border-foreground/10">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/40 mb-4">
            Provenance
          </h2>
          <ul className="space-y-2">
            {fm.sources.map((sourceId) => (
              <li key={sourceId}>
                <Link
                  href={`/sources/${sourceId}`}
                  className="text-sm hover:underline"
                >
                  {sourceId}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {(appearsInThreads.length > 0 ||
        appearsInPaths.length > 0 ||
        appearsInBridges.length > 0) && (
        <nav className="mt-8 pt-8 border-t border-foreground/10">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/40 mb-4">
            Appears in
          </h2>
          {appearsInPaths.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs text-foreground/30 mb-2">Paths</h3>
              <ul className="space-y-1">
                {appearsInPaths.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/paths/${p.id}`}
                      className="text-sm hover:underline"
                    >
                      {p.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {appearsInThreads.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs text-foreground/30 mb-2">Threads</h3>
              <ul className="space-y-1">
                {appearsInThreads.map((t) => (
                  <li key={t.frontmatter.id}>
                    <Link
                      href={`/threads/${t.frontmatter.id}`}
                      className="text-sm hover:underline"
                    >
                      {t.frontmatter.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {appearsInBridges.length > 0 && (
            <div>
              <h3 className="text-xs text-foreground/30 mb-2">
                Featured in guides
              </h3>
              <ul className="space-y-1">
                {appearsInBridges.map((b) => (
                  <li key={b.slug}>
                    <Link
                      href={`/${b.slug}`}
                      className="text-sm hover:underline"
                    >
                      {b.frontmatter.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </nav>
      )}
    </main>
  );
}
