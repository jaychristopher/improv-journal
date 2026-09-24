import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { ALL_HUBS, HUBS } from "../hubs";
import { SITE_URL } from "../seo";

const APP = path.join(process.cwd(), ".next", "server", "app");
/** A build directory is not a finished build. Name a page the build always produces. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.name.endsWith(".html")) acc.push(full);
  }
  return acc;
}

function decode(value: string): string {
  return value
    .replace(/<!--.*?-->/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function pageHtml(href: string): string {
  return fs.readFileSync(path.join(APP, (href === "/" ? "/index" : href) + ".html"), "utf-8");
}

/**
 * The hub page's heading without the count it derives: a trailing "(27)" or
 * "(173 terms, 31 of them definitions)", or the principles hub's leading
 * "The 9". The table cannot hold a count without going stale, so the page
 * appends it and this strips it — the same rule hub-headings applies.
 */
function headingOf(html: string): string | undefined {
  const raw = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1];
  return (
    raw &&
    decode(raw)
      .replace(/\s*\(\d+[^)]*\)$/, "")
      .replace(/^The \d+ /, "")
      .trim()
  );
}

/** Every link inside the element carrying `data-track="<block>"`, with its visible text. */
function linksInBlock(html: string, block: string): { href: string; label: string }[] {
  const start = html.indexOf(`data-track="${block}"`);
  expect(start, `no ${block} block in the page`).toBeGreaterThan(-1);
  const end = html.indexOf("</nav>", start);
  const region = html.slice(start, end);
  return [...region.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => ({
    href: m[1],
    label: decode(m[2]),
  }));
}

/**
 * The words a menu uses that are not a hub's name. "Overview" is a section's
 * own root repeated as its first child, in the nav and in the footer;
 * "Resources" is the nav group headed by its category and rooted at /guides
 * (the comment in Nav.tsx has the account).
 */
// Was `["Overview", "Resources"]`. Both are gone from the nav as of
// 2026-09-24: "Overview" described none of its destinations and was the
// site's most-repeated internal anchor, and "Resources" was a section label
// whose href pointed at /guides. Nothing is exempt from the table now.
const MENU_WORDS = new Set<string>([]);

function labelsFor(links: { href: string; label: string }[], href: string): string[] {
  return [
    ...new Set(
      links.filter((l) => l.href === href && !MENU_WORDS.has(l.label)).map((l) => l.label),
    ),
  ];
}

interface ListItem {
  name: string;
  item?: string;
}

/** The BreadcrumbList trail a page carries, if any. */
function trailOf(html: string): ListItem[] | null {
  const m =
    /<script type="application\/ld\+json">(\{"@context":"https:\/\/schema.org","@type":"BreadcrumbList"[\s\S]*?)<\/script>/.exec(
      html,
    );
  if (!m) return null;
  return (JSON.parse(m[1]) as { itemListElement: ListItem[] }).itemListElement;
}

/**
 * Four of the nine hubs had two names, and a reader crossed them in one
 * click: the nav's "Lessons" opened "Improv Essays", the nav's "Reading List"
 * stood in a trail as "Library", the nav's "Vocabulary" was the footer's
 * "Glossary" (tracker entry 264, 2026-09-22). Each surface had been written
 * by hand at a different time. The names now live in one table, and this
 * reads every surface back out of the build and holds it to the table —
 * the pages that read the table and the pages that merely agreed with it
 * alike, so a hub renamed on one surface fails here rather than on a
 * reader.
 */
describe("hub names", () => {
  it("holds one name per surface for every hub", () => {
    // The nine hubs and their sub-hubs.
    expect(ALL_HUBS.length).toBeGreaterThanOrEqual(9);
    expect(new Set(ALL_HUBS.map((h) => h.href)).size).toBe(ALL_HUBS.length);
    for (const hub of ALL_HUBS) {
      for (const field of ["href", "label", "crumb", "h1"] as const) {
        expect(hub[field], `${hub.href} ${field}`).toBeTruthy();
      }
    }
  });

  // The footer stopped naming hubs on 2026-09-24. It carried 19 of them and
  // 15 were exact duplicates of a nav link higher in the same document; the
  // justification in its own header — that it was the only navigation in the
  // server-rendered HTML — had stopped being true when the nav began
  // rendering its dropdowns unconditionally for that same crawler reason.
  // So the hub vocabulary is the nav's alone now, and this checks the nav.
  it.runIf(built)("names each hub in the nav as the table does", () => {
    const home = pageHtml("/");
    const nav = linksInBlock(home, "nav");
    const footer = linksInBlock(home, "footer");
    expect(nav.length).toBeGreaterThanOrEqual(15);
    // Guard the guard: the footer still renders links, it just no longer
    // renders hub links, so a footer that vanished would not pass here.
    expect(footer.length).toBeGreaterThanOrEqual(6);

    let present = 0;
    let named = 0;
    for (const hub of ALL_HUBS) {
      if (!nav.some((l) => l.href === hub.href)) continue;
      present++;
      const labels = labelsFor(nav, hub.href);
      if (!labels.length) continue;
      named++;
      expect(labels, `nav ${hub.href}`).toEqual([hub.label]);
    }
    // Every hub, including the picker. The nav used to link the picker's
    // beginner facet instead of its hub — 11 inbound body links against the
    // hub's 56, and the only nav destination search had ever surfaced, at
    // position 56 (2026-09-24).
    expect(present).toBe(ALL_HUBS.length);
    expect(named).toBeGreaterThanOrEqual(14);
  });

  it.runIf(built)("heads each hub page as the table does", () => {
    const wrong: string[] = [];
    for (const hub of ALL_HUBS) {
      const heading = headingOf(pageHtml(hub.href));
      if (heading !== hub.h1) wrong.push(`${hub.href}: "${heading}" is not "${hub.h1}"`);
    }
    expect(wrong).toEqual([]);
  });

  /**
   * Children whose parent crumb still carries a hub's old name. Empty since
   * 2026-09-22, when library/[slug]/page.tsx started reading the table; add an
   * entry only for a page that cannot yet read it, and strike it when it can.
   */
  const PENDING: Record<string, string> = {};

  it.runIf(built)("names each hub in every breadcrumb trail as the table does", () => {
    const linked = new Map<string, Set<string>>(ALL_HUBS.map((h) => [h.href, new Set()]));
    const self = new Map<string, string>();
    let uses = 0;
    for (const file of walk(APP)) {
      const trail = trailOf(fs.readFileSync(file, "utf-8"));
      if (!trail) continue;
      for (const item of trail) {
        if (!item.item) continue;
        const href = item.item.replace(SITE_URL, "");
        if (linked.has(href)) {
          linked.get(href)!.add(item.name);
          uses++;
        }
      }
    }
    for (const hub of ALL_HUBS) {
      const trail = trailOf(pageHtml(hub.href));
      expect(trail, `${hub.href} has no trail`).not.toBeNull();
      self.set(hub.href, trail![trail!.length - 1].name);
    }
    // The practice family alone is 137 concept pages; a parser that read no
    // trail would otherwise pass on empty sets.
    expect(uses).toBeGreaterThanOrEqual(300);

    const wrong: string[] = [];
    const unlinked: string[] = [];
    for (const hub of ALL_HUBS) {
      const names = [...linked.get(hub.href)!].sort();
      const expected = PENDING[hub.href] ?? hub.crumb;
      if (names.length === 0) unlinked.push(hub.href);
      else if (names.join() !== expected) {
        wrong.push(`${hub.href} is "${names.join('", "')}" on its children, not "${expected}"`);
      }
      // The level ladder names itself by its own title — it is five pages
      // under one entry — and, since the paths moved under Learning Paths,
      // is nobody's parent.
      const own = hub.href === HUBS.learn.href ? hub.h1 : hub.crumb;
      if (self.get(hub.href) !== own) {
        wrong.push(`${hub.href} ends its own trail "${self.get(hub.href)}", not "${own}"`);
      }
    }
    expect(wrong).toEqual([]);
    expect(unlinked).toEqual([HUBS.learn.href]);
  });

  it.runIf(built)("places every path under Learning Paths", () => {
    const paths = walk(path.join(APP, "paths"));
    expect(paths.length).toBeGreaterThanOrEqual(10);
    for (const file of paths) {
      const html = fs.readFileSync(file, "utf-8");
      const trail = trailOf(html)!;
      expect(trail.map((i) => i.name).slice(0, 2), file).toEqual(["Home", HUBS.paths.crumb]);
      // The audience hub the trail used to name is still one click away, from
      // the header, under the nav's name for the level ladder.
      const level = /<a\b[^>]*data-track="path-level"[^>]*>([^<]*)<\/a>/.exec(html);
      expect(level, `${file} links no audience hub from its header`).not.toBeNull();
      expect(level![0], file).toMatch(/href="\/learn\/[a-z]+"/);
      expect(level![1], file).toBe(HUBS.learn.label);
    }
  });

  it("writes no hub label into the nav that the table does not hold", () => {
    // Nav only, for the reason above: Footer.tsx no longer imports the hub
    // table at all, and footer-and-capture.test.ts asserts that it does not.
    for (const file of ["src/components/Nav.tsx"]) {
      const src = fs.readFileSync(path.join(process.cwd(), file), "utf-8");
      // The items still written out by hand are the ones that are not hubs.
      const literal = [...src.matchAll(/href:\s*"([^"]+)",\s*label:\s*"([^"]+)"/g)];
      for (const [, href, label] of literal) {
        const hub = ALL_HUBS.find((h) => h.href === href);
        if (hub) expect(label, `${file} ${href}`).toBe(hub.label);
      }
      // Every hub item reads the table; a file that stopped importing it
      // would otherwise pass with no literal pairs at all.
      expect((src.match(/hubLink\(HUBS\.\w+\)/g) ?? []).length, file).toBeGreaterThanOrEqual(10);
    }
  });

  it("has the hub pages and the trails read the table, and the stale count corrected", () => {
    for (const file of [
      "src/app/threads/page.tsx",
      "src/app/library/page.tsx",
      "src/app/paths/page.tsx",
      "src/app/practice/vocabulary/page.tsx",
      "src/app/paths/[slug]/page.tsx",
      "src/app/threads/[slug]/page.tsx",
    ]) {
      const src = fs.readFileSync(path.join(process.cwd(), file), "utf-8");
      expect(src, file).toMatch(/HUBS\.\w+/);
    }
    // The fallback crumb's comment said "23 of 25 threads sit in no path"
    // when 4 of 25 did; the number is now stated with its date.
    const thread = fs.readFileSync(
      path.join(process.cwd(), "src/app/threads/[slug]/page.tsx"),
      "utf-8",
    );
    expect(thread).not.toContain("23 of 25");
    expect(thread).toContain("hubCrumb(HUBS.threads)");
  });
});
