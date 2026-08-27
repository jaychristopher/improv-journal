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
 * Podcast episodes carry show notes that link back.
 *
 * Every episode is the spoken version of a page on this site, and the feed
 * always knew the url — it sat in `<link>`, which most podcast apps do not
 * render. What they render is `<description>`, and that carried no route back
 * at all: 37 episodes, not one link to the site they came from.
 *
 * It is the one channel here that produces links rather than consuming them.
 * Aggregators republish show notes as html, so this field is what gets
 * syndicated, and the `content` namespace was declared on the channel and
 * never used.
 *
 * Asserts presence rather than markup. If showNotes returned an empty string
 * the feed would still be valid xml, still validate, still play, and quietly
 * stop pointing anywhere — an absence is the only symptom.
 */
describe("podcast feeds carry show notes", () => {
  it.runIf(built)("gives every episode notes that link to its own page", () => {
    const all = feeds();
    expect(all.length).toBeGreaterThanOrEqual(2);

    let episodes = 0;
    const missing: string[] = [];

    for (const { show, xml } of all) {
      const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
      expect(items.length).toBeGreaterThan(0);

      for (const item of items) {
        episodes += 1;
        const notes = /<content:encoded>([\s\S]*?)<\/content:encoded>/.exec(item)?.[1];
        const link = /<link>([^<]+)<\/link>/.exec(item)?.[1];
        if (!notes || !link) {
          missing.push(`${show}: an item has no show notes`);
          continue;
        }
        // The notes must point at the page the episode was made from, not
        // merely at the site — a generic footer link would pass a weaker check.
        if (!notes.includes(`href="${link}"`)) {
          missing.push(`${show}: notes do not link ${link}`);
        }
        if (!/<itunes:summary>/.test(item)) missing.push(`${show}: ${link} has no itunes:summary`);
      }
    }

    expect(episodes).toBeGreaterThanOrEqual(30);
    expect(missing).toEqual([]);
  });
});
