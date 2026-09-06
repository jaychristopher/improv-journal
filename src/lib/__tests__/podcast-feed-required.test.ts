import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const APP = path.join(process.cwd(), ".next", "server", "app");
const SHOWS = path.join(APP, "listen");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

function feeds(): { show: string; xml: string }[] {
  if (!fs.existsSync(SHOWS)) return [];
  const out: { show: string; xml: string }[] = [];
  for (const show of fs.readdirSync(SHOWS)) {
    const file = path.join(SHOWS, show, "feed.xml.body");
    if (fs.existsSync(file)) out.push({ show, xml: fs.readFileSync(file, "utf-8") });
  }
  return out;
}

/**
 * The elements a listed show cannot afford to lose.
 *
 * Before submission a missing element is a bug you find. After it, the show is
 * already published to an audience and degrades quietly — a directory that has
 * ingested a feed keeps serving the last good version of some fields and drops
 * others without telling anybody. This exists so the failure lands in CI rather
 * than in a listing nobody re-reads.
 *
 * Asserts presence, not markup, in the house style: every one of these failure
 * modes is an absence, and a test that checks the shape of an element passes
 * happily when the element is gone.
 */
describe("podcast feeds keep what directories require", () => {
  it.runIf(built)("declares an identity, artwork, a category and episodes", () => {
    const all = feeds();
    // Guard the guard: three shows exist, so a broken reader that finds none
    // fails here instead of passing over an empty list.
    expect(all.length).toBeGreaterThanOrEqual(3);

    const problems: string[] = [];
    for (const { show, xml } of all) {
      // podcast:guid is the show's identity across a feed-url change; Podcast
      // Index keys on it. It must appear exactly once — two would be ambiguous.
      const guids = (xml.match(/<podcast:guid>/g) ?? []).length;
      if (guids !== 1) {
        problems.push(`${show}: ${guids} podcast:guid (want 1)`);
      }
      if (!/xmlns:podcast=/.test(xml)) {
        problems.push(`${show}: podcast namespace not declared`);
      }

      if (!/<itunes:image\s+href="[^"]+"/.test(xml)) {
        problems.push(`${show}: no itunes:image`);
      }
      if (!/<itunes:category\s+text="[^"]+"/.test(xml)) {
        problems.push(`${show}: no itunes:category`);
      }
      if (!/<language>/.test(xml)) {
        problems.push(`${show}: no language`);
      }
      if (!/<item>/.test(xml)) {
        problems.push(`${show}: no episodes`);
      }
    }

    expect(problems, problems.join("; ")).toEqual([]);
  });

  /**
   * itunes:owner is the one required element that is environment-gated: it is
   * emitted only when PODCAST_OWNER_EMAIL is set, so it vanishes from any build
   * on a machine without it, and Apple will not accept a submission without it.
   *
   * Asserting it unconditionally would fail on every clean checkout, and a test
   * that fails for everyone is a test everyone learns to mute — which is the
   * state this guard exists to prevent. So it skips when the variable is unset
   * and says why.
   *
   * **CI must set PODCAST_OWNER_EMAIL for this check to mean anything.** Unset,
   * it proves nothing; that is the trade for it not crying wolf locally.
   */
  const ownerConfigured = Boolean(process.env.PODCAST_OWNER_EMAIL);

  it.runIf(built && ownerConfigured)("names an owner Apple can verify", () => {
    const problems: string[] = [];
    for (const { show, xml } of feeds()) {
      const owner = /<itunes:owner>([\s\S]*?)<\/itunes:owner>/.exec(xml);
      if (!owner) {
        problems.push(`${show}: no itunes:owner`);
        continue;
      }
      if (!/<itunes:email>[^<]+@[^<]+<\/itunes:email>/.test(owner[1])) {
        problems.push(`${show}: itunes:owner carries no email`);
      }
    }
    expect(problems, problems.join("; ")).toEqual([]);
  });

  it.runIf(built && !ownerConfigured)("reports the owner check as unproven, not passed", () => {
    // Deliberately visible. This spec exists so a run without the variable
    // reads as "not checked" rather than as a green owner assertion.
    expect(process.env.PODCAST_OWNER_EMAIL).toBeUndefined();
  });

  /**
   * Every episode needs an enclosure a client can actually fetch and size.
   *
   * length="0" is the shape podcast validators reject, and it is what this feed
   * emits whenever an episode's audio is missing from the durations manifest —
   * which is exactly what the manifest merge fix protects against.
   */
  it.runIf(built)("gives every episode a fetchable, sized enclosure", () => {
    let episodes = 0;
    const problems: string[] = [];

    for (const { show, xml } of feeds()) {
      for (const m of xml.matchAll(/<enclosure url="([^"]*)" length="([^"]*)"/g)) {
        episodes += 1;
        const [, url, length] = m;
        if (!/^https?:\/\//.test(url)) {
          problems.push(`${show}: enclosure url not absolute: ${url}`);
        }
        if (!(Number(length) > 0)) {
          problems.push(`${show}: ${url} has length="${length}"`);
        }
      }
    }

    expect(episodes).toBeGreaterThanOrEqual(130);
    expect(problems.slice(0, 10), `${problems.length} bad enclosures`).toEqual([]);
  });

  /**
   * A guid is a client's only way to recognise an episode it has already
   * delivered, so a duplicate hides an episode and a reused one re-delivers the
   * catalogue. These were the array index until the feeds grew from 11 episodes
   * to 78 in an afternoon, at which point every insertion shifted every guid
   * after it.
   */
  it.runIf(built)("gives every episode a unique, position-independent guid", () => {
    const problems: string[] = [];

    for (const { show, xml } of feeds()) {
      const guids = [...xml.matchAll(/<guid isPermaLink="false">([^<]+)<\/guid>/g)].map(
        (m) => m[1],
      );
      const unique = new Set(guids);
      if (guids.length === 0) {
        problems.push(`${show}: no episode guids`);
      }
      if (unique.size !== guids.length) {
        problems.push(`${show}: ${guids.length - unique.size} duplicate guids`);
      }
      // An index-shaped guid — "deep-cuts-4" — is the regression this replaced.
      const positional = guids.filter((g) => /^[a-z-]+-\d+$/.test(g));
      if (positional.length > 0) {
        problems.push(`${show}: ${positional.length} positional guids, e.g. ${positional[0]}`);
      }
    }

    expect(problems, problems.join("; ")).toEqual([]);
  });

  /*
   * `<copyright>` is deliberately not asserted here.
   *
   * PF-1.2 would have added it, and it was held instead: the narration is
   * synthesised and the scripts are model-written, so what is actually ownable
   * is the underlying prose rather than the recording, and asserting a blanket
   * claim over the feed would have been a legal statement made by a build step.
   * The element is optional — validators warn, none reject.
   *
   * When that decision is made, add the assertion here rather than trusting the
   * element to stay put.
   */
});
