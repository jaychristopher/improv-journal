import fs from "node:fs";
import path from "node:path";

/**
 * What a reader meets before the page's own words, and after them.
 *
 * derived-provenance.test.ts counts the captions a page draws and
 * derived-density.test.ts the captions per authored word. Neither can see
 * this: a caption is drawn once per region, so three blocks folded into one
 * region are one caption and three things to get past. The register in
 * docs/backlog/context-mistakes.md judges exactly that — "sixteen links
 * between the title and the first sentence", "the first thing inside main was
 * up to 190 characters of internal titles" — and it judges it by a person
 * reading a page. This module is the number that person was reading off.
 *
 * Counted from the render source rather than from the built html: the build
 * standing on disk predates the blocks this measures, and a ceiling read off
 * a stale build is a ceiling on last week's page. The source is also where a
 * new block arrives, so the count moves in the same commit as the cause.
 *
 * The rule, so the number is reproducible: one element per visible block the
 * layer's render mounts — a component invocation, or a native element
 * carrying `data-track`. A wrapper and the block inside it both count, because
 * a reader meets the panel's heading and then its contents. What does not
 * count is named in INLINE_OR_INVISIBLE below, each with the reason, and the
 * page's own identity lines — eyebrow, h1, lead line, description — which are
 * what the reader came for and not furniture around it.
 */

type Layer = "concepts" | "guides" | "lessons" | "paths";

/**
 * Components that mount inside the scanned region and put no block of their
 * own in front of a reader. Excluded by name, with why, so a new one has to
 * be argued for here rather than quietly lowering a count.
 */
const INLINE_OR_INVISIBLE: Record<string, string> = {
  ArticleJsonLd: "structured data, no rendered output",
  BreadcrumbJsonLd: "structured data, no rendered output",
  CourseJsonLd: "structured data, no rendered output",
  DefinedTermJsonLd: "structured data, no rendered output",
  LessonJsonLd: "structured data, no rendered output",
  PodcastJsonLd: "structured data, no rendered output",
  ConceptVisit: "records the visit and returns null; renders nothing on any page",
  Fragment: "a grouping, not a block",
  Link: "an anchor inside a line that is already counted",
  Prose: "renders the author's own html inside a block already counted",
  SyllabusCheckmark: "a tick inside a lesson row, not a block of its own",
};

/**
 * Where each layer's article sits in its render, and what straddles it.
 *
 * `articleAnchor` is an attribute rather than a tag: four of the five routes
 * mark the authored prose `data-track="body"`, and the path route wraps its
 * article in the "Why this order" section, which is the block a reader meets.
 */
interface LayerRender {
  layer: Layer;
  file: string;
  articleAnchor: string;
  /** A frame component the route nests the article inside: its own parts fall either side. */
  frame?: { file: string; mount: string };
  /** A column beside the article, counted apart from what comes after it. */
  sidebarAnchor?: string;
  /** Blocks mounted where the scan cannot see them, each with the reason and the proof. */
  outOfLine?: { name: string; why: string; evidence: string }[];
}

const LAYER_RENDERS: LayerRender[] = [
  {
    layer: "concepts",
    file: "src/components/AtomDetail.tsx",
    articleAnchor: 'data-track="body"',
    sidebarAnchor: 'data-track="concept-sidebar"',
  },
  {
    layer: "guides",
    file: "src/app/[slug]/page.tsx",
    articleAnchor: 'data-track="body"',
    outOfLine: [
      {
        name: "PromptGenerator",
        why: "the prompts guide's hero, mounted through the HERO_TOOLS map at the top of the route rather than inline, so the scan below cannot see it; it renders on 1 guide",
        evidence: "await HERO_TOOLS[slug]?.()",
      },
    ],
  },
  {
    layer: "lessons",
    file: "src/app/threads/[slug]/page.tsx",
    articleAnchor: 'data-track="body"',
    frame: { file: "src/components/LessonFrame.tsx", mount: "{children}" },
  },
  {
    layer: "paths",
    file: "src/app/paths/[slug]/page.tsx",
    articleAnchor: 'data-track="path-why-order"',
  },
];

/**
 * Comments out, before anything is matched. Several of these files quote
 * markup in their comments — AtomDetail explains what "the first thing in
 * <main>" used to be — and a comment that names a tag would otherwise be
 * counted as the tag.
 */
function stripComments(source: string): string {
  return source
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

/** The visible blocks one slice of render source mounts, in source order. */
export function elementsIn(slice: string): string[] {
  const components = [...slice.matchAll(/<([A-Z][A-Za-z0-9]*)[\s/>]/g)]
    .map((m) => ({ at: m.index ?? 0, name: m[1] }))
    .filter((c) => !(c.name in INLINE_OR_INVISIBLE));
  const tracked = [...slice.matchAll(/data-track="([^"]+)"/g)].map((m) => ({
    at: m.index ?? 0,
    name: `@${m[1]}`,
  }));
  return [...components, ...tracked].sort((a, b) => a.at - b.at).map((e) => e.name);
}

/** Where a slice ends: the tag that closes the article, whichever form it takes. */
function articleEnd(body: string, from: number): number {
  const ends = [body.indexOf("/>", from), body.indexOf("</section>", from)].filter((i) => i >= 0);
  return ends.length ? Math.min(...ends) : body.length;
}

interface RenderSlices {
  above: string;
  after: string;
  sidebar: string;
}

/**
 * The render source either side of the article, and the sidebar column apart
 * from both. Source order is DOM order in these files, so the slice boundary
 * is the article's own tag; the column is cut out of `after` because it
 * renders beside the article on a desktop and below it on a phone, and is
 * neither what a reader gets past on the way in nor on the way out.
 */
export function sliceRender(
  source: string,
  articleAnchor: string,
  sidebarAnchor?: string,
): RenderSlices {
  const src = stripComments(source);
  const open = src.indexOf("<main");
  const close = src.lastIndexOf("</main>");
  if (open < 0 || close < 0) throw new Error("no <main> in this render");
  const body = src.slice(open, close);
  const anchor = body.indexOf(articleAnchor);
  if (anchor < 0) throw new Error(`no ${articleAnchor} in this render`);
  const above = body.slice(0, body.lastIndexOf("<", anchor));
  let after = body.slice(articleEnd(body, anchor));
  let sidebar = "";
  if (sidebarAnchor) {
    const at = after.indexOf(sidebarAnchor);
    if (at < 0) throw new Error(`no ${sidebarAnchor} in this render`);
    const start = after.lastIndexOf("<", at);
    const end = after.indexOf("</aside>", at);
    sidebar = after.slice(start, end);
    after = after.slice(0, start) + after.slice(end);
  }
  return { above, after, sidebar };
}

/** A frame's own parts either side of the article it wraps, e.g. LessonFrame. */
function sliceFrame(source: string, mount: string): { above: string; after: string } {
  const src = stripComments(source);
  const at = src.indexOf(mount);
  if (at < 0) throw new Error(`no ${mount} in this frame`);
  return { above: src.slice(0, at), after: src.slice(at + mount.length) };
}

interface LayerFurniture {
  layer: Layer;
  above: string[];
  after: string[];
  sidebar: string[];
}

/** One layer's furniture, read off the files its route and frame actually render. */
function furnitureOf(render: LayerRender, root = process.cwd()): LayerFurniture {
  const read = (file: string) => fs.readFileSync(path.join(root, ...file.split("/")), "utf-8");
  const source = read(render.file);
  const slices = sliceRender(source, render.articleAnchor, render.sidebarAnchor);
  const above = elementsIn(slices.above);
  const after = elementsIn(slices.after);

  if (render.frame) {
    // The frame is mounted above the article and its own parts fall either
    // side of it, so the mount point itself is replaced by what it holds.
    const name = path.basename(render.frame.file).replace(/\.tsx$/, "");
    const at = above.indexOf(name);
    if (at < 0) throw new Error(`${render.layer}: ${name} is not mounted above the article`);
    above.splice(at, 1);
    const parts = sliceFrame(read(render.frame.file), render.frame.mount);
    above.push(...elementsIn(parts.above));
    after.unshift(...elementsIn(parts.after));
  }

  for (const block of render.outOfLine ?? []) {
    if (!stripComments(source).includes(block.evidence)) {
      throw new Error(`${render.layer}: ${block.name} is no longer mounted by ${block.evidence}`);
    }
    above.push(block.name);
  }

  return { layer: render.layer, above, after, sidebar: elementsIn(slices.sidebar) };
}

/** Every layer, in the order LAYER_RENDERS declares them. */
export function allFurniture(root = process.cwd()): LayerFurniture[] {
  return LAYER_RENDERS.map((render) => furnitureOf(render, root));
}
