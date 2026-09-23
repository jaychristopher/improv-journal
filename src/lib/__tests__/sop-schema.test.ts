import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The SOP layer, and the measurement files it prescribes.
 *
 * `docs/sop/` is the most disciplined corpus in this repository and had never been
 * checked by anything. It carries a shared section schema that `docs/sop/README.md`
 * states as a contract ("SOP contract — every SOP must have"), and a "Lessons from
 * prior production" section that is the only place in the repository holding numbers
 * that came from readers rather than from the corpus.
 *
 * Tracker entry 350 (2026-09-22) found that SOP 17 specifies an output file for
 * exactly those numbers — `docs/youtube-week-N/measurement-<VideoId>.md`, sections at
 * 24h / 7d / 30d — and that none existed, so the feedback loop closed into prose. The
 * figures have since been moved into `docs/youtube-week-1/measurement-L1.md`,
 * `-L23.md` and `-L31.md` verbatim, and the SOP bullets link them. These guards keep
 * both halves: the schema the SOPs already keep, and the shape of the files the
 * numbers now live in.
 *
 * Every count here is a population guard as much as an assertion. The parser reads
 * markdown with regexes, and a regex that stops matching returns an empty list and
 * passes any test that only checks shape — so the sizes are asserted first.
 */

const ROOT = process.cwd();
const SOP_DIR = path.join(ROOT, "docs", "sop");
const DOCS_DIR = path.join(ROOT, "docs");

/**
 * The contract `docs/sop/README.md` states, plus the lessons section every numbered
 * SOP actually keeps. `Tools` is deliberately absent from this list and checked
 * separately below, because 2 SOPs do not have it.
 */
const CORE_SECTIONS = [
  "Purpose",
  "Inputs",
  "Outputs",
  "Steps",
  "Quality bar",
  "Common pitfalls",
  "Estimated time",
  "Lessons from prior production",
];

const LESSONS = "Lessons from prior production";

interface Sop {
  name: string;
  text: string;
  headings: string[];
  /** Numbered SOPs are `00`-`18` and the upstream `A01`-`A06`; README and the
   * REFERENCE / TEMPLATE files are not part of the schema. */
  numbered: boolean;
}

function loadSops(): Sop[] {
  return fs
    .readdirSync(SOP_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => {
      const text = fs.readFileSync(path.join(SOP_DIR, f), "utf-8");
      return {
        name: f,
        text,
        headings: [...text.matchAll(/^## (.+?)\s*$/gm)].map((m) => m[1]),
        numbered: /^(\d{2}|A\d{2})-/.test(f),
      };
    });
}

/**
 * Every `## ` section of a markdown file, keyed by heading. Split rather than matched
 * with a lookahead, so the last section of a file is as readable as the first — the
 * lessons section is always last, which is precisely where a lookahead-to-end would
 * have returned nothing and passed every assertion below.
 */
function sections(text: string): Map<string, string> {
  const out = new Map<string, string>();
  const parts = text.split(/^## /m).slice(1);
  for (const part of parts) {
    const nl = part.indexOf("\n");
    const heading = (nl === -1 ? part : part.slice(0, nl)).trim();
    out.set(heading, nl === -1 ? "" : part.slice(nl + 1));
  }
  return out;
}

/** The bullets under one `## ` section. */
function sectionBullets(text: string, heading: string): string[] {
  const body = sections(text).get(heading);
  if (body === undefined) return [];
  return [...body.matchAll(/^- (.+)$/gm)].map((x) => x[1]);
}

const sops = loadSops();
const numbered = sops.filter((s) => s.numbered);
const words = sops.reduce((n, s) => n + s.text.split(/\s+/).filter(Boolean).length, 0);

/** Every `measurement-*.md` file under any `docs/youtube-week-N` directory. */
function measurementFiles(): { name: string; text: string }[] {
  const out: { name: string; text: string }[] = [];
  for (const dir of fs.readdirSync(DOCS_DIR).filter((d) => /^youtube-week-/.test(d))) {
    const full = path.join(DOCS_DIR, dir);
    if (!fs.statSync(full).isDirectory()) continue;
    for (const f of fs.readdirSync(full).filter((f) => /^measurement-.+\.md$/.test(f))) {
      out.push({ name: `${dir}/${f}`, text: fs.readFileSync(path.join(full, f), "utf-8") });
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

describe("the SOP corpus", () => {
  it("is the size the schema assertions below are about", () => {
    // Reading 2026-09-22: 30 files, 25 of them numbered, 24915 words. Floors, because
    // the set grows when a new artifact earns an SOP — but if a glob or the numbered
    // pattern breaks, this fails instead of every assertion below passing on nothing.
    expect(sops.length).toBeGreaterThanOrEqual(30);
    expect(numbered.length).toBeGreaterThanOrEqual(25);
    expect(words).toBeGreaterThanOrEqual(20000);
    // The 4 non-numbered files are README, CRITIQUE-TEMPLATE and the 2 REFERENCEs.
    // They are outside the schema, so name them rather than letting a renamed SOP
    // silently drop out of `numbered` and out of every check.
    expect(sops.filter((s) => !s.numbered).map((s) => s.name)).toEqual([
      "CRITIQUE-TEMPLATE.md",
      "IMPROVEMENT-CYCLE.md",
      "README.md",
      "REFERENCE-channel-voice.md",
      "REFERENCE-engagement-rules.md",
    ]);
  });

  /**
   * The hard one. `README.md` states these as a contract every SOP must have, and
   * every numbered SOP keeps them — no floor, no exceptions list. A new SOP that
   * skips a section fails here, which is the whole point of writing the contract down.
   */
  it("keeps every contracted section on every numbered SOP", () => {
    const missing = numbered
      .map((s) => ({ name: s.name, gaps: CORE_SECTIONS.filter((h) => !s.headings.includes(h)) }))
      .filter((x) => x.gaps.length > 0);
    expect(missing).toEqual([]);
  });

  /**
   * `Tools` is in the README's contract too, and 2 numbered SOPs do not have it:
   * `06-critique-craft.md` (whose tooling is a reading pass, described under
   * "Reference patterns") and `15-upload-metadata.md` (which is a YouTube Studio form).
   * Named rather than tolerated in general — a third SOP dropping `Tools` is a
   * regression, and closing either of these two is an improvement this test should
   * make someone notice.
   */
  it("keeps Tools on every numbered SOP but the 2 that never had it", () => {
    const WITHOUT_TOOLS = new Set(["06-critique-craft.md", "15-upload-metadata.md"]);
    const lacking = numbered.filter((s) => !s.headings.includes("Tools")).map((s) => s.name);
    expect(lacking.filter((n) => !WITHOUT_TOOLS.has(n))).toEqual([]);
    // Reading 2026-09-22: 23 of 25 carry Tools. Floor, so filling one of the 2 gaps
    // passes and dropping a third fails.
    expect(numbered.length - lacking.length).toBeGreaterThanOrEqual(23);
  });

  /**
   * The lessons section is what makes the SOPs a record rather than a manual, and
   * `README.md`'s "Lessons curation policy" caps each at 5 with overflow archived —
   * so the total is expected to drift slowly, not to fall.
   */
  it("records lessons on the files that carry them, and the count only rises", () => {
    const withLessons = sops.filter((s) => sectionBullets(s.text, LESSONS).length > 0);
    const total = sops.reduce((n, s) => n + sectionBullets(s.text, LESSONS).length, 0);
    // Reading 2026-09-22: 26 of 30 files carry lessons — the 25 numbered SOPs plus
    // REFERENCE-channel-voice.md. Dated floor: entry 350 measured 26, and an SOP
    // losing its lessons section is the loss this guards.
    expect(withLessons.length).toBeGreaterThanOrEqual(26);
    for (const s of numbered) expect(sectionBullets(s.text, LESSONS).length).toBeGreaterThan(0);
    // Reading 2026-09-22: 105 lessons. Floor that may only rise; the curation policy
    // moves retired lessons to `docs/sop/lessons-archive/`, so if that ever starts
    // happening this floor is the thing to revisit rather than lower quietly.
    expect(total).toBeGreaterThanOrEqual(105);
  });
});

describe("the measurement files SOP 17 specifies", () => {
  const files = measurementFiles();

  it("exist for the videos whose numbers the SOP recorded", () => {
    // Reading 2026-09-22: 3 files, all in week 1 — L1, L23 and L31 are the only
    // videos any SOP lessons section carries audience data for. The other 2 rendered
    // videos (L2, L4) and FramingEffect have no recorded reading, so they have no
    // file; an empty window is left empty rather than invented.
    expect(files.map((f) => f.name)).toEqual([
      "youtube-week-1/measurement-L1.md",
      "youtube-week-1/measurement-L23.md",
      "youtube-week-1/measurement-L31.md",
    ]);
  });

  /**
   * The shape is the point of the file: 3 windows side by side is what lets a second
   * video's numbers sit beside the first's. A file missing a window would read as a
   * measurement nobody took rather than a window nobody has reached.
   */
  it("parse into the 3 windows the SOP names", () => {
    expect(files.length).toBeGreaterThanOrEqual(3);
    for (const f of files) {
      const windows = sections(f.text);
      expect([...windows.keys()]).toEqual(["24h", "7d", "30d"]);
      // Every window says something — a figure or, explicitly, that nothing was
      // recorded. A silent window is indistinguishable from a lost one.
      for (const w of ["24h", "7d", "30d"]) {
        expect(windows.get(w)?.trim().length ?? 0).toBeGreaterThan(0);
      }
    }
  });

  /**
   * The move has to be lossless in both directions: the numbers must be in the file,
   * and the SOP bullet they came from must still be there and must point at it. Entry
   * 350's complaint was that the data lived only in the SOP; the fix must not become
   * the reverse.
   */
  it("carry the figures verbatim, and SOP 17 still holds and links each bullet", () => {
    const byName = new Map(files.map((f) => [f.name, f.text]));
    const l1 = byName.get("youtube-week-1/measurement-L1.md") ?? "";
    const l23 = byName.get("youtube-week-1/measurement-L23.md") ?? "";
    const l31 = byName.get("youtube-week-1/measurement-L31.md") ?? "";
    // The figures as SOP 17 recorded them. Asserted as strings, not parsed, because
    // rounding or reformatting one is exactly the corruption a move can introduce.
    for (const figure of ["187", "6.4%", "78", "3:12", "74% of 4:18"]) {
      expect(l1).toContain(figure);
    }
    expect(l23).toContain("14");
    expect(l23).toContain("team building activities");
    expect(l31).toContain("n=23");

    const sop17 = sops.find((s) => s.name === "17-post-publish-measurement.md");
    expect(sop17).toBeDefined();
    const bullets = sectionBullets(sop17!.text, LESSONS);
    // Reading 2026-09-22: 4 bullets, 3 of them per-video readings that now link a file.
    expect(bullets.length).toBeGreaterThanOrEqual(4);
    expect(bullets.filter((b) => b.includes("measurement-")).length).toBeGreaterThanOrEqual(3);
    for (const id of ["L1", "L23", "L31"]) {
      expect(sop17!.text).toContain(`measurement-${id}.md`);
      // And the link resolves: SOP 17 sits in docs/sop, the files in docs/youtube-week-1.
      expect(fs.existsSync(path.join(DOCS_DIR, "youtube-week-1", `measurement-${id}.md`))).toBe(
        true,
      );
    }
    // The Outputs section still specifies the path these files implement, so a
    // rewrite of the SOP that drops the spec fails here rather than orphaning them.
    expect(sop17!.text).toContain("measurement-<VideoId>.md");
  });
});

/**
 * The improvement cycle's own remedies.
 *
 * `docs/sop/IMPROVEMENT-CYCLE.md` records 15 numbered concerns, every one marked
 * `completed`, each naming the fix it shipped. Tracker entry 351 (2026-09-22) checked
 * them one at a time: 11 of the 15 fixes are documents, and every document exists. The
 * other 3 are rules about future behaviour, and all 3 had already been broken without
 * anything noticing — the 5-lesson cap exceeded on 4 SOPs with no archive to demote
 * into, `Tools` missing on 2 SOPs, and SOP 17's output file absent (entry 350, guarded
 * above). The fixes that could be verified by looking are right; the ones that needed a
 * checker are wrong. So this block is the checker: the claims table, the cap, and the
 * archive the cap sends overflow to.
 */
const IMPROVEMENT_CYCLE = path.join(SOP_DIR, "IMPROVEMENT-CYCLE.md");
const LESSONS_ARCHIVE = path.join(SOP_DIR, "lessons-archive");
const readme = sops.find((s) => s.name === "README.md")?.text ?? "";

/** The cap `README.md`'s "Lessons curation policy" states, read back from it below. */
const LESSONS_CAP = 5;

/**
 * The SOPs already over the cap on 2026-09-22, with the count each held. A ceiling per
 * file, not a licence: the count may fall, and a 5th SOP going over fails. Demoting a
 * lesson is an editorial judgement — which observation is least load-bearing — so it is
 * the author's call and not a test's; `docs/seeds.md` lists the candidates. Entry 351.
 */
const OVER_CAP = new Map([
  ["12-remotion-composition.md", 6],
  ["14-thumbnail.md", 7],
  ["15-upload-metadata.md", 7],
  ["A06-bridge-creation.md", 6],
]);

/**
 * Every file the "Improvement applied" column of `IMPROVEMENT-CYCLE.md` claims a fix
 * produced, as an absolute path to stat.
 *
 * Three forms appear in that column, and all 3 are parsed rather than listed here,
 * because a hand-kept list of claims would stop matching the table the moment a 16th
 * concern is added:
 * - a document name, `CRITIQUE-TEMPLATE.md` or a bare `README` (which is this README);
 * - an SOP id, written `SOP 14` or as a bare id in a list, `17 (post-publish
 *   measurement)`, resolved to whichever numbered SOP carries that prefix;
 * - a path with a placeholder segment, `lessons-archive/<SOP-id>.md`, which names no
 *   single file — the claim there is the directory, so the directory is what is stated.
 */
function improvementClaims(): {
  rows: number;
  completed: number;
  claims: { concern: number; claim: string; target: string }[];
} {
  const text = fs.readFileSync(IMPROVEMENT_CYCLE, "utf-8");
  const claims: { concern: number; claim: string; target: string }[] = [];
  let rows = 0;
  let completed = 0;
  for (const line of text.split("\n")) {
    const cells = line.split("|").map((c) => c.trim());
    if (cells.length < 6 || !/^\d+$/.test(cells[1])) continue;
    rows += 1;
    if (cells[3] === "completed") completed += 1;
    const concern = Number(cells[1]);
    const applied = cells[4];
    const seen = new Set<string>();
    const add = (claim: string, target: string) => {
      if (seen.has(claim)) return;
      seen.add(claim);
      claims.push({ concern, claim, target });
    };
    // Directory-bearing paths first, so their filename half is not read a second time
    // as a bare document name below.
    const WITH_DIR = /(?:[\w.-]+\/)+[\w.<>-]+\.md/g;
    for (const m of applied.matchAll(WITH_DIR)) {
      const claimed = m[0];
      const placeholder = claimed.includes("<");
      const dir = claimed.slice(0, claimed.lastIndexOf("/"));
      add(claimed, path.join(SOP_DIR, placeholder ? dir : claimed));
    }
    const rest = applied.replace(WITH_DIR, " ");
    for (const m of rest.matchAll(/\b[A-Za-z][\w-]*\.md\b/g)) add(m[0], path.join(SOP_DIR, m[0]));
    for (const m of [
      ...rest.matchAll(/\bSOP (\d{2}|A\d{2})\b/g),
      ...rest.matchAll(/\b(\d{2}|A\d{2}) \(/g),
    ]) {
      const id = m[1];
      const file = numbered.find((s) => s.name.startsWith(`${id}-`));
      add(`SOP ${id}`, path.join(SOP_DIR, file?.name ?? `${id}-absent.md`));
    }
    if (/\bREADME\b/.test(rest)) add("README", path.join(SOP_DIR, "README.md"));
  }
  return { rows, completed, claims };
}

describe("the fixes the SOP improvement cycle claims it shipped", () => {
  const { rows, completed, claims } = improvementClaims();

  it("still reads as 15 concerns, all completed, naming the files this test stats", () => {
    // Reading 2026-09-22: 15 rows, 15 completed, 23 distinct claims across them. The
    // claims count is a floor because the parser is regexes over a markdown table — if
    // the table is reformatted and the cells stop splitting, every existence assertion
    // below would pass on an empty list instead of failing here.
    expect(rows).toBe(15);
    expect(completed).toBe(rows);
    expect(claims.length).toBeGreaterThanOrEqual(23);
    // The 3 parsed forms are all present, so a parser that quietly loses one is caught.
    expect(claims.filter((c) => c.claim === "README").length).toBeGreaterThanOrEqual(9);
    expect(claims.filter((c) => c.claim.startsWith("SOP ")).length).toBeGreaterThanOrEqual(8);
    expect(claims.filter((c) => c.claim.endsWith(".md")).length).toBeGreaterThanOrEqual(4);
  });

  /**
   * The cheap half of entry 351's check, and the half that holds: a fix that named a
   * document produced that document. This fails when a claimed file is deleted or
   * renamed without the table following, which is the way a completed row turns into a
   * lie — the row is never revisited once it says `completed`.
   */
  it("produced every file it names, but for the archive nothing has been demoted into", () => {
    const absent = claims
      .filter((c) => !fs.existsSync(c.target))
      .map((c) => `${c.concern}: ${c.claim}`);
    // Dated allowance, 2026-09-22: concern 15's policy sends overflow lessons to
    // `lessons-archive/<SOP-id>.md` and the directory has never been created, because
    // no lesson has ever been demoted — see the cap below, which 4 SOPs exceed. Named
    // rather than tolerated in general, and it may only shrink: creating the directory
    // empties this list, and any other claim going absent fails.
    const ALLOWED_ABSENT = new Set(["15: lessons-archive/<SOP-id>.md"]);
    expect(absent.filter((a) => !ALLOWED_ABSENT.has(a))).toEqual([]);
    expect(absent.length).toBeLessThanOrEqual(1);
  });
});

describe("the lessons cap the curation policy sets", () => {
  const counts = new Map(numbered.map((s) => [s.name, sectionBullets(s.text, LESSONS).length]));

  it("is stated in the README in the terms this test reads it", () => {
    // The policy is prose, and a test asserting a bare 5 would go on passing after the
    // cap moved. Assert the sentence the number comes from, and the archive path the
    // overflow goes to, so a rewritten policy fails here first.
    expect(readme).toContain(`In-SOP cap: ${LESSONS_CAP} lessons max`);
    expect(readme).toContain("lessons-archive/");
    // Population: the cap is per numbered SOP, so the check is only as good as the set
    // it runs over.
    expect(counts.size).toBeGreaterThanOrEqual(25);
  });

  /**
   * A ceiling rather than a floor, which is the opposite direction from the lessons
   * total above and deliberately so: the total may only rise, and no single SOP may
   * hold more than the cap. The 4 already over it were over it before anything checked
   * (entry 351) and are named with the count each held, so they may shrink and a 5th
   * may not appear.
   */
  it("holds on every SOP but the 4 that were already over it", () => {
    const over = [...counts].filter(([, n]) => n > LESSONS_CAP);
    const unnamed = over.filter(([name]) => !OVER_CAP.has(name)).map(([name, n]) => `${name} ${n}`);
    expect(unnamed).toEqual([]);
    // Each named SOP may only fall. Reading 2026-09-22: 6, 7, 7, 6.
    for (const [name, allowance] of OVER_CAP) {
      expect(counts.get(name) ?? 0).toBeLessThanOrEqual(allowance);
    }
    // And the population of over-cap SOPs may only fall too, so emptying one of the 4
    // is a pass and the allowance entry it leaves behind is visibly stale.
    expect(over.length).toBeLessThanOrEqual(OVER_CAP.size);
  });

  /**
   * The archive does not exist yet, and creating it is the author's move — the policy
   * says which lesson goes is a judgement about which is least load-bearing. This check
   * is written so that move needs no edit here: while the directory is absent it holds
   * the policy that specifies it, and the day it appears it starts checking the naming
   * the policy gives, one file per SOP id.
   */
  it("sends overflow to an archive named after the SOPs, whenever that archive appears", () => {
    if (!fs.existsSync(LESSONS_ARCHIVE)) {
      // Absent on 2026-09-22. The assertion that survives is that the policy still
      // names it — a policy quietly dropped would otherwise leave this test vacuous.
      expect(readme).toContain("Archive overflow");
      return;
    }
    const files = fs.readdirSync(LESSONS_ARCHIVE).sort();
    // An archive directory with nothing in it is a worse state than no directory: it
    // reads as a policy being kept.
    expect(files.length).toBeGreaterThan(0);
    const sopNames = new Set(numbered.map((s) => s.name));
    // Every file is the SOP's own filename, which is the naming the policy's example
    // shows. A renamed SOP orphans its archive, and that is the failure worth catching
    // — the retired lessons would otherwise point at nothing.
    expect(files.filter((f) => !sopNames.has(f))).toEqual([]);
  });
});
