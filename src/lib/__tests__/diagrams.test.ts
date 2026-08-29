import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { buildDiagram, inlineDiagrams } from "../diagrams";

/**
 * Conventions for content diagrams.
 *
 * Diagrams are inlined into the prose rather than referenced as `<img>`, which
 * buys theme-awareness and the page's typeface but puts each file inside the
 * page's CSS and id scope. That makes several authoring rules load-bearing
 * rather than stylistic: a `<style>` block would leak into the page, an `id`
 * would be clobber-prefixed by the sanitiser and silently break any reference
 * to it, and a missing viewBox would leave the plugin no dimensions to emit,
 * reintroducing the layout shift inlining exists to prevent.
 *
 * The house convention is that a fixed thing gets a test so it stays fixed.
 */

const IMAGES = path.join(process.cwd(), "public", "images");
const CONTENT = path.join(process.cwd(), "content");
const SRC = path.join(process.cwd(), "src");

const MAX_BYTES = 30 * 1024;

function walk(dir: string, ext: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, ext));
    else if (entry.name.endsWith(ext)) out.push(full);
  }
  return out;
}

const svgs = walk(IMAGES, ".svg");
const markdown = walk(CONTENT, ".md");

/** Every markdown image whose source is a diagram, with its alt text. */
const markdownReferences = markdown.flatMap((file) => {
  const body = fs.readFileSync(file, "utf8");
  return [...body.matchAll(/!\[([^\]]*)\]\((\/images\/[^)\s]+)\)/g)].map((m) => ({
    file: path.relative(CONTENT, file),
    alt: m[1],
    src: m[2],
  }));
});

/**
 * The same, for JSX route pages.
 *
 * Markdown is only half the surface: `/practice/formats`, `/how-it-works/principles`
 * and `/improv-games` are components, and reach diagrams through `<Diagram>` rather
 * than the markdown pipeline. Scanning content alone reported the first JSX-embedded
 * diagram as an orphan, and would have done so for every one after it.
 */
const jsxReferences = walk(SRC, ".tsx").flatMap((file) => {
  const body = fs.readFileSync(file, "utf8");
  return [...body.matchAll(/<Diagram\b[\s\S]*?\/>/g)].flatMap((m) => {
    const src = /src="(\/images\/[^"]+)"/.exec(m[0])?.[1];
    const alt = /alt="([^"]*)"/.exec(m[0])?.[1];
    return src !== undefined && alt !== undefined
      ? [{ file: path.relative(SRC, file), alt, src }]
      : [];
  });
});

const references = [...markdownReferences, ...jsxReferences];

describe("diagram files", () => {
  it.runIf(svgs.length > 0)("declare a viewBox and no fixed dimensions", () => {
    for (const file of svgs) {
      const svg = fs.readFileSync(file, "utf8");
      const open = /<svg\b[^>]*>/.exec(svg)?.[0] ?? "";
      expect(open, `${path.basename(file)} has no <svg> element`).not.toBe("");
      expect(open, `${path.basename(file)} needs a viewBox`).toMatch(/viewBox="/);
      // The inliner emits these from the viewBox; authoring them invites drift.
      expect(open, `${path.basename(file)} must not set width/height`).not.toMatch(
        /\s(width|height)="/,
      );
    }
  });

  it.runIf(svgs.length > 0)("carry no <style> block and no ids", () => {
    for (const file of svgs) {
      const svg = fs.readFileSync(file, "utf8");
      expect(svg, `${path.basename(file)} has a <style> that would leak`).not.toMatch(/<style/);
      expect(svg, `${path.basename(file)} has an id the sanitiser would clobber`).not.toMatch(
        /\sid="/,
      );
    }
  });

  it.runIf(svgs.length > 0)("stay within the size budget", () => {
    for (const file of svgs) {
      const bytes = fs.statSync(file).size;
      expect(bytes, `${path.basename(file)} is ${bytes} bytes`).toBeLessThanOrEqual(MAX_BYTES);
    }
  });

  it.runIf(svgs.length > 0)("are each referenced by at least one page", () => {
    const used = new Set(references.map((r) => r.src));
    for (const file of svgs) {
      const src = "/images/" + path.relative(IMAGES, file).split(path.sep).join("/");
      expect(used.has(src), `${src} is not referenced by any content file`).toBe(true);
    }
  });
});

describe("diagram references", () => {
  it.runIf(references.length > 0)("point at a file that exists", () => {
    for (const ref of references) {
      const file = path.join(IMAGES, ref.src.replace("/images/", ""));
      expect(fs.existsSync(file), `${ref.file} references missing ${ref.src}`).toBe(true);
    }
  });

  /**
   * Alt text is the accessible name and the only thing an image search reads.
   * The bounds are a proxy for the real rule — describe the information, not
   * the artefact. "Diagram of the Harold structure" names the artefact and
   * carries nothing; a keyword list reads as spam to a crawler and a person.
   */
  it.runIf(references.length > 0)("describe the information, not the artefact", () => {
    for (const ref of references) {
      const words = ref.alt.split(/\s+/).filter((w) => /[a-z0-9]/i.test(w));
      expect(words.length, `${ref.src} alt is ${words.length} words`).toBeGreaterThanOrEqual(12);
      expect(words.length, `${ref.src} alt is ${words.length} words`).toBeLessThanOrEqual(40);
      expect(ref.alt, `${ref.src} alt names the artefact`).not.toMatch(
        /^(a |an |the )?(diagram|image|illustration|graphic|chart)\b/i,
      );
    }
  });
});

describe("inlineDiagrams", () => {
  it.runIf(svgs.length > 0)("inlines with an accessible name and emitted dimensions", () => {
    const ref = references[0];
    const out = inlineDiagrams(`<p><img src="${ref.src}" alt="${ref.alt}"></p>`);

    expect(out).toContain('<svg class="dg" role="img"');
    expect(out).toContain(`<title>${ref.alt}</title>`);
    expect(out).toMatch(/width="\d+" height="\d+"/);
    expect(out).not.toContain("<img");
  });

  it("leaves a missing file as the original img rather than emitting a broken svg", () => {
    const html = '<p><img src="/images/not-a-real-diagram.svg" alt="Nothing here at all."></p>';
    expect(inlineDiagrams(html)).toBe(html);
  });

  it("ignores images that are not diagrams", () => {
    const html = '<p><img src="/photo.png" alt="Something else entirely."></p>';
    expect(inlineDiagrams(html)).toBe(html);
  });

  /**
   * The two call sites hand `alt` over in different states — markdown arrives
   * already escaped for an attribute, a JSX page passes a raw string — so the
   * text has to survive one decode and one escape without gaining or losing an
   * entity on the way through.
   */
  it("round-trips an alt containing markup characters", () => {
    const src = references[0].src;
    const out = inlineDiagrams(`<img src="${src}" alt="Tempo &amp; duration, 4 &lt; 9 areas.">`);
    expect(out).toContain("<title>Tempo &amp; duration, 4 &lt; 9 areas.</title>");
  });
});

describe("buildDiagram", () => {
  it.runIf(svgs.length > 0)("escapes a raw alt for the JSX call site", () => {
    const svg = buildDiagram(references[0].src, 'Tempo & duration, 4 < 9 areas — "space".');
    expect(svg).toContain('<title>Tempo &amp; duration, 4 &lt; 9 areas — "space".</title>');
  });

  it("returns null for a file that does not exist", () => {
    expect(buildDiagram("/images/not-a-real-diagram.svg", "Nothing here.")).toBeNull();
  });
});
