import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { getAtomUrl, loadAtoms, loadBridges, loadThreads } from "../content";
import { firstContentImage } from "../content-image";
import { articleImages, SITE_URL } from "../seo";

const APP = path.join(process.cwd(), ".next", "server", "app");
/** A build directory is not a finished build. Name a page the build always produces. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/**
 * Article markup must name the picture the page already has.
 *
 * Google lists image among the recommended properties for Article and
 * describes it as what lets Search, News and Assistant show visual content for
 * a page. Nothing in Article is strictly required, so all 252 entities here
 * were valid markup — valid markup with the picture left out, while every one
 * of those pages was already generating a 1200x630 card at /og and declaring it
 * as og:image. The asset existed; the markup simply never pointed at it.
 *
 * The eyebrow is threaded from each route rather than derived, because the two
 * vocabularies differ: AtomDetail's TYPE_LABELS renders "why it's hard" where
 * the route writes "How It Works", so deriving it would have produced a second,
 * different card for the same page.
 *
 * Two of the 252 name a different card from their own og:image, and it is not a
 * bug worth chasing: getAtomDisplayTitle qualifies a title when two atoms share
 * one, which happens exactly once here — the technique and the exercise both
 * called "Organic Opening". Metadata uses the qualified title and the component
 * has only the raw one. Both URLs render a valid card for the right page, so
 * this asserts the image is present and well-formed rather than demanding
 * string equality it would have to carve an exception into.
 *
 * Since 2026-09-21 the card is the fallback rather than the whole answer. The
 * image programme (docs/image-program.md) was opened because the site had no
 * body images for Google Images to index, shipped 248 diagrams, and left the
 * question of whether Article.image should name them marked STILL OPEN while
 * every page went on naming the text card (novel-insights entry 190). A page
 * with a body image now lists it first and the card second; pages without
 * one are unchanged. So `image` is a string or an array, the last entry is
 * always the card, and the first is the page's own first diagram.
 */

/** The last entry of an image value — the OG card in both shapes. */
function cardOf(image: unknown): unknown {
  return Array.isArray(image) ? image[image.length - 1] : image;
}

function imageList(image: unknown): unknown[] {
  return Array.isArray(image) ? image : [image];
}

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.name.endsWith(".html")) acc.push(full);
  }
  return acc;
}

function articleEntities(html: string): Record<string, unknown>[] {
  const found: Record<string, unknown>[] = [];
  for (const block of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(block[1]);
    } catch {
      continue;
    }
    const visit = (node: unknown): void => {
      if (Array.isArray(node)) return node.forEach(visit);
      if (!node || typeof node !== "object") return;
      const obj = node as Record<string, unknown>;
      // @type is a string on most entities and an array on threads.
      const types = Array.isArray(obj["@type"]) ? obj["@type"] : [obj["@type"]];
      // A declaration, not a reference: since 2026-09-22 a work's `subjectOf`
      // names the concept Articles that cite it as `{@type, @id, name, url}`
      // (jsonld-edges), and a pointer at an entity declared on another page
      // carries no image of its own. Every declared Article has a headline.
      if (types.some((t) => String(t) === "Article") && "headline" in obj) found.push(obj);
      if (obj["@graph"]) visit(obj["@graph"]);
      for (const value of Object.values(obj)) if (value && typeof value === "object") visit(value);
    };
    visit(parsed);
  }
  return found;
}

describe("article image", () => {
  it.runIf(built)("is present and absolute on every Article entity", () => {
    const missing: string[] = [];
    const malformed: string[] = [];
    let checked = 0;

    for (const file of walk(APP)) {
      const html = fs.readFileSync(file, "utf-8");
      const posix = file.split(path.sep).join("/");
      const name = (posix.split("server/app")[1] ?? posix).replace(/\.html$/, "") || "/";

      for (const entity of articleEntities(html)) {
        checked++;
        const images = imageList(entity.image);
        if (images.length === 0 || images.some((i) => typeof i !== "string" || i.length === 0)) {
          missing.push(name);
          continue;
        }
        // Relative URLs are legal schema but Google resolves them
        // inconsistently, and the og:image next to it is absolute.
        for (const image of images as string[]) {
          if (!image.startsWith(`${SITE_URL}/`)) malformed.push(`${name}: ${image}`);
        }
      }
    }

    // An unbuilt tree, or a changed @type check, would make this pass on nothing.
    expect(checked).toBeGreaterThan(240);
    expect(missing).toEqual([]);
    expect(malformed).toEqual([]);
  });

  it.runIf(built)("names the same card the page declares as og:image", () => {
    let checked = 0;
    let agreeing = 0;

    for (const file of walk(APP)) {
      const html = fs.readFileSync(file, "utf-8");
      const og = /<meta property="og:image" content="([^"]*)"/.exec(html)?.[1];
      if (!og) continue;
      const decoded = og.replace(/&amp;/g, "&");

      for (const entity of articleEntities(html)) {
        checked++;
        if (cardOf(entity.image) === decoded) agreeing++;
      }
    }

    expect(checked).toBeGreaterThan(240);
    // Only the one shared-title pair may diverge; anything more is a regression
    // in how the eyebrow reaches the component.
    expect(checked - agreeing).toBeLessThanOrEqual(2);
  });

  it.runIf(built)(
    "lists the page's first body image ahead of the card, and only then",
    async () => {
      // Every content page the build renders with an Article entity, keyed by
      // the HTML file its route lands in, with the image its markdown opens on.
      const [atoms, bridges, threads] = await Promise.all([
        loadAtoms(),
        loadBridges(),
        loadThreads(),
      ]);
      const pages: { route: string; image: string | null }[] = [
        ...atoms.map((a) => ({
          route: getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type }),
          image: firstContentImage(a.content),
        })),
        ...bridges.map((b) => ({ route: `/${b.slug}`, image: firstContentImage(b.content) })),
        ...threads.map((t) => ({
          route: `/threads/${t.slug}`,
          image: firstContentImage(t.content),
        })),
      ];

      const wrong: string[] = [];
      let withImage = 0;
      let without = 0;
      for (const page of pages) {
        const file = path.join(APP, ...page.route.split("/").filter(Boolean)) + ".html";
        if (!fs.existsSync(file)) continue;
        const entities = articleEntities(fs.readFileSync(file, "utf-8"));
        if (entities.length === 0) continue;

        for (const entity of entities) {
          const images = imageList(entity.image);
          if (page.image) {
            withImage++;
            if (images.length !== 2 || images[0] !== `${SITE_URL}${page.image}`) {
              wrong.push(
                `${page.route}: expected ${page.image} first, got ${JSON.stringify(entity.image)}`,
              );
            }
          } else {
            without++;
            if (Array.isArray(entity.image)) {
              wrong.push(`${page.route}: no body image, yet ${JSON.stringify(entity.image)}`);
            }
          }
        }
      }

      // 226 pages with an image and 82 without at the time of writing. A
      // route change that stops the files being found would drop both to zero.
      expect(withImage).toBeGreaterThan(200);
      expect(without).toBeGreaterThan(50);
      expect(wrong).toEqual([]);
    },
  );
});

describe("firstContentImage", () => {
  it("reads the first markdown image's site-relative path", () => {
    const md = ["Intro.", "", "![A figure](/images/one.svg)", "", "![Later](/images/two.svg)"].join(
      "\n",
    );
    expect(firstContentImage(md)).toBe("/images/one.svg");
  });

  it("is null when the body has no image, and ignores links and off-site images", () => {
    expect(firstContentImage("Just [a link](/images/not-an-image.svg).")).toBeNull();
    expect(firstContentImage("![remote](https://example.com/x.png)")).toBeNull();
    expect(firstContentImage("")).toBeNull();
  });

  it("finds an image on most atoms and guides and none on paths", async () => {
    const [atoms, bridges] = await Promise.all([loadAtoms(), loadBridges()]);
    const atomsWith = atoms.filter((a) => firstContentImage(a.content)).length;
    const bridgesWith = bridges.filter((b) => firstContentImage(b.content)).length;
    // 172/205 and 45/78 on 2026-09-21; floors sit under both so a diagram
    // pulled from one page does not fail this, while a regex that stops
    // matching would.
    expect(atoms.length).toBeGreaterThanOrEqual(200);
    expect(atomsWith).toBeGreaterThanOrEqual(160);
    expect(bridgesWith).toBeGreaterThanOrEqual(40);
    for (const a of atoms) {
      const image = firstContentImage(a.content);
      if (image) expect(image, a.slug).toMatch(/^\/images\/[a-z0-9/-]+\.svg$/);
    }
  });
});

describe("articleImages", () => {
  it("is the card alone without a content image, and content-first with one", () => {
    const card = articleImages("Mirroring", "Exercise");
    expect(typeof card).toBe("string");
    expect(card).toBe(`${SITE_URL}/og?title=Mirroring&eyebrow=Exercise`);
    expect(articleImages("Mirroring", "Exercise", null)).toBe(card);

    const both = articleImages("Mirroring", "Exercise", "/images/mirroring.svg");
    expect(both).toEqual([`${SITE_URL}/images/mirroring.svg`, card]);
  });

  it("leaves an already absolute content image alone", () => {
    const both = articleImages("T", undefined, "https://cdn.example/x.svg");
    expect(Array.isArray(both) && both[0]).toBe("https://cdn.example/x.svg");
  });
});
