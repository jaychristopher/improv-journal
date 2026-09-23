import { toAbsoluteSiteUrl } from "./audio";
import { getAtomUrl, loadAtoms, loadBridges, loadPaths, loadThreads } from "./content";
import { CORE_ITEM_JOIN, coreItemLabel, requiresGraph, requiresView } from "./direct-requires";
import { lessonAtomOrder } from "./lesson-order";
import { outboundLabel, type Relation } from "./relation-labels";
import { SITE_URL } from "./seo";
import { CORE_HREF, CORE_PHRASE } from "./the-core";

/**
 * The edges an episode's page declares, as show-notes lines.
 *
 * Every episode is the spoken version of a page, and the page shows its
 * neighbours in a sidebar the audio cannot. Matching the 120 multi-word
 * concept titles against the 205 concept scripts, the hosts name another
 * concept 213 times in 165,000 words, 78 episodes name none, and of the 358
 * `requires` targets with a title the ear could catch they say 39 (11%) — a
 * listener who plays the whole Improv Lab hears every node and almost no edge
 * (tracker entry 263, 2026-09-21). The feed can carry the sidebar as text
 * without touching the audio, which is what this builds: one line per
 * relation group, labelled with the same words the sidebar uses, each name a
 * link to the page it stands for.
 *
 * The labels are read from `relation-labels`, never spelled here — the one
 * vocabulary for the five relations (entry 227), and the guard in
 * `relation-labels.test.ts` fails if a second map appears under `src/`.
 *
 * The "Builds on:" line reads `requires` in the direct view
 * (direct-requires.ts, entry 302). Until 2026-09-22 it named the declared
 * closure, so the feed said "Builds on: Active Listening, Be Positive,
 * Trust, Commitment, Irreversibility" for `yes-and` while the page's open
 * list was "Active Listening and the core" with four folded. The line now
 * names what the page opens — a collapsed knot as "<Title> and the core" on
 * the member the graph requires most among those the atom named
 * (`coreRepresentative`, entry 315) — and its "+N more" counts the folded,
 * so a listener and a reader are told the same edges. The other lines are
 * the declared relation, as before. On the html line the core item is two
 * links, the title to the member and "the core" to the page that defines it
 * (`CORE_HREF`, entry 309); the plain line prints the label as one string.
 */

/** The most names one line carries before it hands off to the page. */
export const NOTES_LINE_CAP = 6;

/** Edges into library works are one group whatever relation they declare. */
export const SOURCES_LABEL = "Sources";

/** A guide, lesson or path lists what it is made of rather than typed edges. */
export const IDEAS_LABEL = "Ideas in this episode";

export interface NotesName {
  /** The name as the plain line prints it; on a core item, `coreItemLabel(core.title)`. */
  title: string;
  /** Absolute url, ready for a feed. */
  url: string;
  /**
   * Set on a collapsed knot: the representative member's own title, and the
   * absolute url of the core's page, so the html line can link the two halves
   * of the label separately.
   */
  core?: { title: string; url: string };
}

export interface NotesLine {
  label: string;
  names: NotesName[];
  /**
   * How many names the cap cut, plus — on the "Builds on:" line — the
   * prerequisites the direct view folds; rendered as "+N more" pointing at
   * the page, where the fold is.
   */
  more: number;
}

export interface EpisodeNotes {
  /** The page the episode was made from, absolute. */
  pageUrl: string;
  lines: NotesLine[];
}

/** The order the lines appear in, which is the sidebar's order. */
const RELATION_ORDER: Relation[] = ["requires", "enables", "contrasts", "extends", "illustrates"];

let _index: Promise<Map<string, EpisodeNotes>> | null = null;

function line(label: string, names: NotesName[], folded = 0): NotesLine {
  return {
    label,
    names: names.slice(0, NOTES_LINE_CAP),
    more: Math.max(0, names.length - NOTES_LINE_CAP) + folded,
  };
}

async function buildIndex(): Promise<Map<string, EpisodeNotes>> {
  const [atoms, bridges, threads, paths] = await Promise.all([
    loadAtoms(),
    loadBridges(),
    loadThreads(),
    loadPaths(),
  ]);
  const atomById = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter]));
  const threadById = new Map(threads.map((t) => [t.frontmatter.id, t.frontmatter]));
  const absolute = (href: string) => toAbsoluteSiteUrl(href, SITE_URL);
  const atomName = (id: string): NotesName | null => {
    const target = atomById.get(id);
    if (!target) return null;
    return { title: target.title, url: absolute(getAtomUrl({ id: target.id, type: target.type })) };
  };
  const index = new Map<string, EpisodeNotes>();
  const graph = requiresGraph(atoms.map((a) => a.frontmatter));

  for (const atom of atoms) {
    const fm = atom.frontmatter;
    const href = getAtomUrl({ id: fm.id, type: fm.type });
    const groups = new Map<Relation, NotesName[]>();
    const sources: NotesName[] = [];
    const seen = new Set<string>();
    for (const link of fm.links ?? []) {
      const target = atomById.get(link.id);
      if (!target || seen.has(link.id)) continue;
      const name = atomName(link.id);
      if (!name) continue;
      seen.add(link.id);
      if (target.type === "reference") {
        sources.push(name);
        continue;
      }
      const list = groups.get(link.relation);
      if (list) list.push(name);
      else groups.set(link.relation, [name]);
    }
    // The direct view of `requires`: the open targets named, a collapsed
    // knot labelled on its representative member, the folded counted. A target
    // that is a work stays on the Sources line, whichever view holds it.
    const { open, folded, cores } = requiresView(graph, fm.id, "direct");
    const buildsOn: NotesName[] = [];
    for (const id of open) {
      const name = atomName(id);
      if (!name || atomById.get(id)?.type === "reference") continue;
      buildsOn.push(
        cores.has(id)
          ? {
              ...name,
              title: coreItemLabel(name.title),
              core: { title: name.title, url: absolute(CORE_HREF) },
            }
          : name,
      );
    }
    const foldedCount = folded.filter((id) => atomById.get(id)?.type !== "reference").length;
    const lines: NotesLine[] = [];
    for (const relation of RELATION_ORDER) {
      if (relation === "requires") {
        if (buildsOn.length || foldedCount) {
          lines.push(line(outboundLabel(relation), buildsOn, foldedCount));
        }
        continue;
      }
      const names = groups.get(relation);
      if (names?.length) lines.push(line(outboundLabel(relation), names));
    }
    if (sources.length) lines.push(line(SOURCES_LABEL, sources));
    index.set(href, { pageUrl: absolute(href), lines });
  }

  const ideasLine = (names: NotesName[]): NotesLine[] =>
    names.length ? [line(IDEAS_LABEL, names)] : [];
  const atomNames = (ids: string[]) => ids.map(atomName).filter((n): n is NotesName => n !== null);

  for (const bridge of bridges) {
    const href = `/${bridge.slug}`;
    index.set(href, {
      pageUrl: absolute(href),
      lines: ideasLine(atomNames(bridge.frontmatter.entry_atoms ?? [])),
    });
  }
  // A lesson's ideas in dependency order, prerequisite first — the authored
  // `atoms:` list states the dependent before its prerequisite in 41 of its
  // 94 intra-lesson `requires` edges (tracker entry 273), and the cap makes
  // the order matter: what falls past six names is what the line drops.
  for (const thread of threads) {
    const href = `/threads/${thread.frontmatter.id}`;
    index.set(href, {
      pageUrl: absolute(href),
      lines: ideasLine(atomNames(lessonAtomOrder(thread, atomById))),
    });
  }
  for (const p of paths) {
    const href = `/paths/${p.frontmatter.id}`;
    const names = (p.frontmatter.threads ?? [])
      .map((id) => threadById.get(id))
      .filter((t): t is NonNullable<typeof t> => t !== undefined)
      .map((t) => ({ title: t.title, url: absolute(`/threads/${t.id}`) }));
    index.set(href, { pageUrl: absolute(href), lines: ideasLine(names) });
  }

  return index;
}

/**
 * The notes for the page at `href` — the same site-relative path
 * `getEpisodesForShow` puts on the episode — or null when no page has it.
 * A page with no edges gets notes with no lines, which both renderers treat
 * as nothing to say.
 */
export async function getEpisodeNotes(href: string): Promise<EpisodeNotes | null> {
  if (!_index) _index = buildIndex();
  return (await _index).get(href) ?? null;
}

/** Every name the notes link, across all lines. */
export function notesLinkCount(notes: EpisodeNotes): number {
  return notes.lines.reduce((n, l) => n + l.names.length, 0);
}

/**
 * The html block for `content:encoded`: one paragraph per line. The caller
 * supplies its escaper so the feed's own rules apply to the titles.
 */
export function renderNotesHtml(notes: EpisodeNotes, escape: (s: string) => string): string {
  if (!notes.lines.length) return "";
  const paragraphs = notes.lines.map(({ label, names, more }) => {
    const links = names.map((n) =>
      n.core
        ? `<a href="${n.url}">${escape(n.core.title)}</a>${escape(CORE_ITEM_JOIN)}<a href="${n.core.url}">${escape(CORE_PHRASE)}</a>`
        : `<a href="${n.url}">${escape(n.title)}</a>`,
    );
    if (more > 0) links.push(`<a href="${notes.pageUrl}">+${more} more</a>`);
    return `<p>${escape(label)}: ${links.join(", ")}</p>`;
  });
  return paragraphs.join("");
}

/**
 * The one-line plain version for `description` and `itunes:summary`:
 * "Builds on: A, B · Compare: C". Names only, no urls — the page link is
 * already the item's `<link>`.
 */
export function renderNotesText(notes: EpisodeNotes): string {
  return notes.lines
    .map(({ label, names, more }) => {
      const titles = names.map((n) => n.title);
      if (more > 0) titles.push(`+${more} more`);
      return `${label}: ${titles.join(", ")}`;
    })
    .join(" · ");
}
