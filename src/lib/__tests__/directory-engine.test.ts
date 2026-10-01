import { describe, expect, it } from "vitest";

import {
  AGGREGATOR_HOSTS,
  buildPrompt,
  emptyCity,
  fixtureReply,
  KINDS,
  mergeCity,
  MISSING_RUNS_TO_DROP,
  normalizeDomain,
  parseEngineReply,
  rankEntries,
  validateEntry,
} from "../../../scripts/lib/directory.mjs";

/**
 * The directory engine's rules, held to fixtures.
 *
 * scripts/directory-engine.mjs runs daily in GitHub Actions with no one
 * watching: Claude reads the web for a city, the script checks what came
 * back, fetches every site, merges with the archive and ranks. The parts
 * that need no network live in scripts/lib/directory.mjs so they can be
 * held here — because a merge that silently dropped every entry, or kept a
 * closed theatre forever, would run for a week before anyone noticed.
 */
const META = {
  slug: "testville",
  city: "Testville",
  state: "Ohio",
  stateCode: "OH",
  metro: ["Nearby"],
};
const TODAY = "2026-10-01";

function entry(name: string, url: string, over: Record<string, unknown> = {}) {
  return validateEntry({
    name,
    url,
    kind: ["shows", "classes"],
    area: "Downtown",
    summary: "A theatre with a class programme and weekend shows, long enough to pass.",
    score: 70,
    reasons: "Fixture.",
    sources: [],
    ...over,
  }).entry!;
}

describe("reading a reply", () => {
  it("takes the fenced JSON, or the outermost braces, and nothing from prose", () => {
    const fenced = 'Here you go.\n```json\n{"entries":[{"name":"A"}],"closed":[]}\n```\nDone.';
    expect(parseEngineReply(fenced)?.entries).toHaveLength(1);
    const bare = 'Sure: {"entries":[{"name":"B"},{"name":"C"}]} end';
    expect(parseEngineReply(bare)?.entries).toHaveLength(2);
    expect(parseEngineReply("I could not find anything.")).toBeNull();
    expect(parseEngineReply('```json\n{"notes":"no entries key"}\n```')).toBeNull();
  });
});

describe("checking an entry", () => {
  it("keys an entry on its domain without www", () => {
    expect(normalizeDomain("https://www.secondcity.com/classes")).toBe("secondcity.com");
    expect(normalizeDomain("not a url")).toBeNull();
  });

  it("refuses what a reader must never be sent to: listings, socials, ticket sellers", () => {
    expect(AGGREGATOR_HOSTS.length).toBeGreaterThanOrEqual(15);
    for (const host of ["yelp.com", "www.facebook.com", "m.eventbrite.com"]) {
      const { entry: e, reason } = validateEntry({
        name: "Something",
        url: `https://${host}/x`,
        kind: ["shows"],
        summary: "A listing on somebody else's site, which is not a website of one's own.",
        score: 50,
      });
      expect(e, host).toBeNull();
      expect(reason).toMatch(/aggregator/);
    }
  });

  it("refuses a bad url, a missing kind, a score off the scale and a summary too short to read", () => {
    const base = {
      name: "Theatre",
      url: "https://theatre.example/",
      kind: ["shows"],
      summary: "A real theatre with a real site and a sentence long enough to pass.",
      score: 50,
    };
    expect(validateEntry({ ...base, url: "ftp://theatre.example" }).entry).toBeNull();
    expect(validateEntry({ ...base, url: "theatre" }).entry).toBeNull();
    expect(validateEntry({ ...base, kind: ["banana"] }).entry).toBeNull();
    expect(validateEntry({ ...base, score: 101 }).entry).toBeNull();
    expect(validateEntry({ ...base, score: "high" }).entry).toBeNull();
    expect(validateEntry({ ...base, summary: "Too short." }).entry).toBeNull();
    expect(validateEntry({ ...base, name: "" }).entry).toBeNull();
    expect(validateEntry(null).entry).toBeNull();
  });

  it("keeps the kinds in the archive's order, de-duplicated, and clips the prose rather than rejecting it", () => {
    const e = validateEntry({
      name: "  Theatre  ",
      url: "https://theatre.example/",
      kind: ["classes", "SHOWS", "classes", "jams"],
      summary: "x".repeat(400),
      area: "y".repeat(100),
      score: 72.6,
      signals: ["a", "", "b", "c", "d", "e", "f", "g"],
      sources: ["https://theatre.example/classes", "nope", "https://theatre.example/shows"],
    }).entry!;
    expect(e.kind).toEqual(KINDS);
    expect(e.name).toBe("Theatre");
    expect(e.id).toBe("theatre.example");
    expect(e.summary).toHaveLength(240);
    expect(e.area).toHaveLength(60);
    expect(e.score).toBe(73);
    expect(e.signals).toEqual(["a", "b", "c", "d", "e", "f"]);
    expect(e.sources).toEqual(["https://theatre.example/classes", "https://theatre.example/shows"]);
  });
});

describe("ranking", () => {
  it("is best first, then by name, with the rank written on", () => {
    const ranked = rankEntries([
      entry("Beta", "https://beta.example/", { score: 60 }),
      entry("Alpha", "https://alpha.example/", { score: 60 }),
      entry("Top", "https://top.example/", { score: 90 }),
    ]);
    expect(ranked.map((e) => [e.rank, e.name])).toEqual([
      [1, "Top"],
      [2, "Alpha"],
      [3, "Beta"],
    ]);
  });
});

describe("merging a reading into a city", () => {
  const theatre = entry("Theatre", "https://theatre.example/", { score: 80 });
  const jam = entry("Jam", "https://jam.example/", { kind: ["jams"], score: 40 });

  it("adds what answered, keeps the first-seen date, and never adds a site nobody could reach", () => {
    const first = mergeCity(emptyCity(META), [theatre, jam], {
      today: "2026-09-30",
      verified: new Set(["theatre.example"]),
    });
    expect(first.log).toMatchObject({ added: 1, updated: 0, dropped: 0, unverified: 0 });
    expect(first.city.entries.map((e) => e.id)).toEqual(["theatre.example"]);
    expect(first.city.entries[0]).toMatchObject({
      firstSeen: "2026-09-30",
      status: "live",
      rank: 1,
    });

    const second = mergeCity(first.city, [{ ...theatre, score: 85 }, jam], {
      today: TODAY,
      verified: new Set(["theatre.example", "jam.example"]),
    });
    expect(second.log).toMatchObject({ added: 1, updated: 1 });
    const kept = second.city.entries.find((e) => e.id === "theatre.example")!;
    expect(kept).toMatchObject({ firstSeen: "2026-09-30", lastSeen: TODAY, score: 85, rank: 1 });
    expect(second.city.updated).toBe(TODAY);
    expect(second.city.log[0]).toBe(second.log);
  });

  it("keeps an entry whose site did not answer this time, marked, rather than dropping it", () => {
    const { city } = mergeCity(emptyCity(META), [theatre], {
      today: "2026-09-30",
      verified: new Set(["theatre.example"]),
    });
    const next = mergeCity(city, [theatre], { today: TODAY, verified: new Set() });
    expect(next.log.unverified).toBe(1);
    expect(next.city.entries[0]).toMatchObject({ status: "unverified", lastSeen: "2026-09-30" });
  });

  it("counts the runs an entry goes unseen and drops it after the third", () => {
    let { city } = mergeCity(emptyCity(META), [theatre, jam], {
      today: "2026-09-30",
      verified: new Set(["theatre.example", "jam.example"]),
    });
    for (let run = 1; run < MISSING_RUNS_TO_DROP; run++) {
      ({ city } = mergeCity(city, [theatre], {
        today: TODAY,
        verified: new Set(["theatre.example"]),
      }));
      const unseen = city.entries.find((e) => e.id === "jam.example")!;
      expect(unseen, `run ${run}`).toMatchObject({ status: "unseen", missingRuns: run });
    }
    const gone = mergeCity(city, [theatre], {
      today: TODAY,
      verified: new Set(["theatre.example"]),
    });
    expect(gone.log.dropped).toBe(1);
    expect(gone.city.entries.map((e) => e.id)).toEqual(["theatre.example"]);
  });

  it("drops a theatre the reading reports closed, at once", () => {
    const { city } = mergeCity(emptyCity(META), [theatre, jam], {
      today: "2026-09-30",
      verified: new Set(["theatre.example", "jam.example"]),
    });
    const after = mergeCity(city, [theatre], {
      today: TODAY,
      verified: new Set(["theatre.example"]),
      closed: [
        { name: "Jam", url: "https://www.jam.example/", evidence: "The site says farewell." },
      ],
    });
    expect(after.log.dropped).toBe(1);
    expect(after.city.entries.map((e) => e.id)).toEqual(["theatre.example"]);
  });

  it("ignores a duplicate domain within one reading", () => {
    const twice = [theatre, { ...theatre, name: "Theatre again" }];
    const { city, log } = mergeCity(emptyCity(META), twice, {
      today: TODAY,
      verified: new Set(["theatre.example"]),
    });
    expect(log.added).toBe(1);
    expect(city.entries).toHaveLength(1);
  });
});

describe("what the engine asks and what it runs on dry", () => {
  it("names the city, its metro, the rubric, the shape, and what the archive already holds", () => {
    const city = mergeCity(emptyCity(META), [theatre_()], {
      today: TODAY,
      verified: new Set(["theatre.example"]),
    }).city;
    const prompt = buildPrompt(META, city);
    for (const must of [
      "Testville, Ohio",
      "Nearby",
      "35 for longevity",
      "```json",
      "https://theatre.example/",
      "Never invent",
    ]) {
      expect(prompt).toContain(must);
    }
    expect(buildPrompt(META, emptyCity(META))).toContain("holds nothing for this city yet");
  });

  it("gives --dry a reply every rule accepts", () => {
    const reply = fixtureReply(META);
    for (const raw of reply.entries) expect(validateEntry(raw).entry, raw.name).not.toBeNull();
  });
});

function theatre_() {
  return entry("Theatre", "https://theatre.example/", { score: 80 });
}
