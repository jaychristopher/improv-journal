import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { SIDEBAR_VISIBLE } from "../../components/SidebarLinkGroup";

const ROOT = process.cwd();
const APP = path.join(ROOT, ".next", "server", "app");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/** Atom type → the route segment its page is published under. */
const DIR: Record<string, string> = {
  definition: "practice/vocabulary",
  technique: "practice/techniques",
  pedagogy: "practice/techniques",
  exercise: "practice/exercises",
  format: "practice/formats",
  law: "how-it-works",
  insight: "how-it-works",
  principle: "how-it-works/principles",
  antipattern: "how-it-works/diagnosis",
  pattern: "how-it-works/diagnosis",
  framework: "how-it-works/diagnosis",
  reference: "library",
};

function sidebars(): { slug: string; dom: number; visible: number; groups: number[] }[] {
  const out: { slug: string; dom: number; visible: number; groups: number[] }[] = [];
  const dir = path.join(ROOT, "content", "atoms");

  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
    const slug = file.replace(/\.md$/, "");
    const type = /^type:\s*(\w+)/m.exec(fs.readFileSync(path.join(dir, file), "utf-8"))?.[1];
    if (!type || !DIR[type]) continue;

    const page = path.join(APP, ...DIR[type].split("/"), `${slug}.html`);
    if (!fs.existsSync(page)) continue;

    const html = fs.readFileSync(page, "utf-8").replace(/<script[\s\S]*?<\/script>/g, "");
    const aside = html.split("<aside")[1]?.split("</aside>")[0];
    if (!aside) continue;

    const dom = (aside.match(/<a /g) ?? []).length;
    // Folds nest since 2026-09-21 (a group fold inside the column fold, entry
    // 243), so strip innermost details repeatedly rather than matching once.
    const stripFolds = (s: string): string => {
      let prev: string;
      do {
        prev = s;
        s = s.replace(/<details[^>]*>(?:(?!<details)[\s\S])*?<\/details>/g, "");
      } while (s !== prev);
      return s;
    };
    const collapsed = dom - (stripFolds(aside).match(/<a /g) ?? []).length;
    // Links shown in each collapsed group's open state, for the per-group check.
    const groups = [...aside.matchAll(/<dd[^>]*>([\s\S]*?)<\/dd>/g)].map((m) => {
      const inGroup = (m[1].match(/<a /g) ?? []).length;
      const hidden = inGroup - (stripFolds(m[1]).match(/<a /g) ?? []).length;
      return inGroup - hidden;
    });

    out.push({ slug, dom, visible: dom - collapsed, groups });
  }
  return out;
}

/**
 * A concept page's sidebar stays scannable without losing a link.
 *
 * These two requirements pull against each other, which is why they are asserted
 * together. Internal links to the guide layer are the one ranking input entirely
 * within this site's control, and ATOM_GUIDE_LIMIT was raised to sixteen to feed
 * it — a change measured only by its effect on inbound links, never by what
 * sixteen entries do to a 260px column. On the heaviest pages every other group
 * held between two and nine; that one held sixteen, and swamped the seven around
 * it. A reader arriving cold from search met a wall rather than a route onward.
 *
 * The fix collapses the overflow into a native `details` instead of dropping it,
 * so the links stay in the server-rendered html. Google follows links in
 * collapsed content; it cannot follow one that only exists after a click.
 *
 * Hence the pairing. A future change that trims the sidebar by removing links
 * would satisfy a visible-count check on its own and quietly undo the internal
 * linking, so the DOM floor is asserted in the same test.
 */
describe("concept sidebar", () => {
  it.runIf(built)("keeps every link in the DOM while bounding what is shown", () => {
    const pages = sidebars();
    // The population, so a moved selector fails here rather than passing on nothing.
    // 173 of the 205 concept pages render a sidebar; the rest have nothing to put in one.
    expect(pages.length).toBeGreaterThanOrEqual(165);

    const totalDom = pages.reduce((s, p) => s + p.dom, 0);
    // 3,286 links across 173 sidebars as of 2026-08-30. The floor guards the
    // internal-linking work, not the exact number.
    expect(totalDom).toBeGreaterThanOrEqual(3100);

    // No single group renders more than the cap without a way to collapse it.
    const overflowing = pages
      .filter((p) => p.groups.some((g) => g > SIDEBAR_VISIBLE))
      .map((p) => `${p.slug}: a group shows ${Math.max(...p.groups)}`);
    expect(overflowing).toEqual([]);

    // And the worst page overall: 33 in August. The "Referenced by" block
    // (entry 95) pushed commitment to 55 and this ceiling was raised to 60 for
    // an afternoon — the register's first entry, made again (entry 243). The
    // column then folded all but three outbound groups and one inbound, and
    // the ceiling was back. Since 2026-09-22 the groups that open are chosen
    // by size inside SIDEBAR_OPEN_BUDGET (entry 272), which is that old
    // rule's worst case, 20; be-present and commitment now spend all of it
    // and sit at 36 exactly, against 32 and 33 before, so this ceiling has
    // no slack on those two pages. A page that fails here by one has most
    // likely grown a "Part of" or "Source" entry, not a connection.
    const worst = Math.max(...pages.map((p) => p.visible));
    expect(worst).toBeLessThanOrEqual(36);
  });
});
