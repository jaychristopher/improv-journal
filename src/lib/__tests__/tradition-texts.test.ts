import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { getAtomsForTradition, getTraditionNames, loadAtoms } from "../content";
import { citedWorkId } from "../jsonld-edges";
import { TRADITION_REF_IDS } from "../tradition-disagreements";
import { textCountsByTradition, traditionTextIds, traditionTexts } from "../tradition-texts";

const APP = path.join(process.cwd(), ".next", "server", "app");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/**
 * The join from the tradition pages to the works that define them.
 *
 * Each school is defined in code by its books — `TRADITION_REFS` in
 * content.ts, which `getAtomsForTradition` walks to, and `TRADITION_REF_IDS`
 * in tradition-disagreements, which keys the same ids — and until 2026-09-22
 * the tradition page rendered the concepts, objections and guides computed
 * from those works and never the works: the five pages carried 0 links to
 * any library work while every work linked its tradition page (tracker
 * entry 288). The entry counted the table at 8 ids; it is 9, because UCB is
 * defined by Hines's book as well as his Substack and the manual.
 */
describe("tradition texts", () => {
  it("reads every tradition's works from the table, with their detail and cite counts", async () => {
    const names = getTraditionNames();
    expect(names).toHaveLength(5);

    let total = 0;
    for (const tradition of names) {
      const texts = await traditionTexts(tradition);
      const ids = traditionTextIds(tradition);
      expect(ids.length, tradition).toBeGreaterThanOrEqual(1);
      // Every id the table names has a reference atom behind it, in table order.
      expect(
        texts.map((t) => t.id),
        tradition,
      ).toEqual(ids);
      total += texts.length;
      for (const text of texts) {
        expect(text.url, text.id).toBe(`/library/${text.id}`);
        expect(text.title.length, text.id).toBeGreaterThan(0);
        expect(text.authors.length, text.id).toBeGreaterThanOrEqual(1);
        // The library's own count: a work no concept cites would define a
        // tradition with no members.
        expect(text.citedBy, text.id).toBeGreaterThan(0);
        // Every one of the works declares a `work` block, so each carries
        // the `#work` id its library page declares.
        expect(text.citation?.["@id"], text.id).toBe(citedWorkId(text.url));
      }
    }
    expect(total).toBe(9);

    // Impro 38, Truth in Comedy 48, the UCB manual 37 on 2026-09-22.
    const johnstone = await traditionTexts("johnstone");
    expect(johnstone.map((t) => t.title)).toEqual([
      "Impro: Improvisation and the Theatre",
      "Impro for Storytellers",
    ]);
    expect(johnstone[0].year).toBe("1979");
    expect(johnstone[0].citedBy).toBeGreaterThanOrEqual(30);
    // A continuously updated work has no year and is not given a fake one.
    const substack = (await traditionTexts("ucb")).find((t) => t.id === "ref-hines-substack");
    expect(substack?.year).toBeUndefined();
    expect(substack?.authors).toEqual(["Will Hines"]);

    expect(await traditionTexts("no-such-tradition")).toEqual([]);
  });

  it("agrees with content.ts on which ids define each tradition", async () => {
    // content.ts keeps its table private, so it is read two ways: the source
    // literal, and the membership it produces. The literal catches an id
    // added to one table and not the other; the membership catches the same
    // drift when it is the ids the atoms actually link.
    const source = fs.readFileSync(path.join(process.cwd(), "src", "lib", "content.ts"), "utf-8");
    const literal = source.match(/const TRADITION_REFS[^=]*=\s*\{([\s\S]*?)\n\};/);
    expect(literal, "TRADITION_REFS is still declared as an object literal").not.toBeNull();
    const fromSource: Record<string, string[]> = {};
    for (const line of literal![1].split("\n")) {
      const m = line.match(/^\s*(\w+):\s*\[([^\]]*)\]/);
      if (!m) continue;
      fromSource[m[1]] = [...m[2].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
    }
    expect(fromSource).toEqual(TRADITION_REF_IDS);
    expect(Object.keys(fromSource)).toEqual(getTraditionNames());

    const atoms = await loadAtoms();
    expect(atoms.length).toBeGreaterThanOrEqual(200);
    for (const tradition of getTraditionNames()) {
      const ids = new Set(traditionTextIds(tradition));
      const byLinks = atoms
        .filter(
          (a) =>
            a.frontmatter.type !== "reference" &&
            (a.frontmatter.links ?? []).some((l) => ids.has(l.id)),
        )
        .map((a) => a.frontmatter.id)
        .sort();
      const byContent = (await getAtomsForTradition(tradition)).map((a) => a.frontmatter.id).sort();
      expect(byContent, tradition).toEqual(byLinks);
      expect(byContent.length, tradition).toBeGreaterThan(5);
    }
  });

  it("lists the works as citations by their #work ids, and counts them for the hub", async () => {
    const citations = (await traditionTexts("johnstone")).map((t) => t.citation!);
    expect(citations).toHaveLength(2);
    for (const c of citations) {
      expect(c["@id"]).toMatch(/\/library\/ref-[a-z-]+#work$/);
      expect(c["@type"]).toBe("Book");
      expect(c.name.length).toBeGreaterThan(0);
    }
    const counts = await textCountsByTradition();
    expect(counts).toEqual({ johnstone: 2, spolin: 1, close: 1, ucb: 3, annoyance: 2 });
  });

  it.runIf(built)("every built tradition page links every one of its works, first", async () => {
    let links = 0;
    for (const tradition of getTraditionNames()) {
      const html = fs
        .readFileSync(path.join(APP, "traditions", `${tradition}.html`), "utf-8")
        .replace(/<script[\s\S]*?<\/script>/g, "")
        .replace(/<!--.*?-->/g, "");
      const start = html.indexOf('data-track="tradition-texts"');
      expect(start, tradition).toBeGreaterThan(-1);
      // First after the lead: before the pushback, the guides and the concepts.
      for (const later of ["pushback", "objections", "tradition-guides", "tradition-concepts"]) {
        const at = html.indexOf(`data-track="${later}"`);
        if (at > -1) expect(at, `${tradition}: ${later}`).toBeGreaterThan(start);
      }
      expect(html.indexOf("</header>"), tradition).toBeLessThan(start);

      const end = html.indexOf("</section>", start);
      const block = html.slice(start, end);
      const hrefs = [...block.matchAll(/href="\/library\/([a-z0-9-]+)"/g)].map((m) => m[1]);
      expect(hrefs, tradition).toEqual(traditionTextIds(tradition));
      links += hrefs.length;
      expect(block).toMatch(/cited by \d+ concepts?/);
      expect(block).toContain("The texts");
    }
    // 0 before 2026-09-22.
    expect(links).toBe(9);

    // The hub carries the count on every card, beside the concepts and guides.
    const hub = fs
      .readFileSync(path.join(APP, "traditions.html"), "utf-8")
      .replace(/<!--.*?-->/g, "");
    const counts = [...hub.matchAll(/data-track="tradition-counts"[^>]*>([^<]*)</g)].map(
      (m) => m[1],
    );
    expect(counts).toHaveLength(5);
    for (const text of counts) expect(text).toMatch(/\d+ concepts · \d+ guides? · \d+ texts?/);
  });

  it.runIf(built)("the Johnstone page's Article cites both works by their #work ids", () => {
    const html = fs.readFileSync(path.join(APP, "traditions", "johnstone.html"), "utf-8");
    const blocks = [
      ...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g),
    ].map((m) => JSON.parse(m[1]));
    const article = blocks.find((b) => b["@type"] === "Article");
    expect(article).toBeDefined();
    const ids = (article.citation ?? []).map((c: { "@id": string }) => c["@id"]);
    expect(ids).toEqual([
      citedWorkId("/library/ref-impro-johnstone"),
      citedWorkId("/library/ref-impro-storytellers-johnstone"),
    ]);
  });
});
