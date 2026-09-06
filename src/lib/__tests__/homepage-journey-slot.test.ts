import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const APP = path.join(ROOT, ".next", "server", "app");
const HOME = path.join(APP, "index.html");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(HOME);

const PAGE = path.join(ROOT, "src", "app", "page.tsx");

/**
 * The homepage offers one starting point, not two.
 *
 * "Start here" and the journey card were stacked, so a returning reader
 * mid-course met both: a card telling them to begin the seven-day programme
 * directly above a card telling them to continue it. Two answers to the same
 * question, in the two most prominent slots on the site.
 *
 * They are alternatives, so they now share a slot — the card is passed into
 * ContinueJourney as children and shown until localStorage says otherwise. That
 * also removes a layout shift, since the journey card replaces something rather
 * than being inserted above it.
 *
 * Half of this is a source assertion, which is unusual here and deliberate. The
 * journey card never appears in server-rendered html — it depends on
 * localStorage — so no amount of reading the build can tell the two arrangements
 * apart. What can be checked is that the card is still inside the component
 * rather than a sibling of it, which is the thing that would regress.
 */
describe("homepage starting point", () => {
  it("keeps the start-here card inside the journey slot", () => {
    const src = fs.readFileSync(PAGE, "utf-8");

    // Exactly one ContinueJourney, and it takes children rather than self-closing.
    const uses = src.match(/<ContinueJourney\b/g) ?? [];
    expect(uses.length).toBe(1);
    expect(src).toMatch(/<ContinueJourney[^/>]*>/);
    expect(src).not.toMatch(/<ContinueJourney[^>]*\/>/);
    expect(src).toContain("</ContinueJourney>");

    // And the card it falls back to is the thing inside it.
    const slot = src.slice(src.indexOf("<ContinueJourney"), src.indexOf("</ContinueJourney>"));
    expect(slot).toContain("Start here");
  });

  it.runIf(built)("still serves the start-here card to a first-time visitor", () => {
    const html = fs.readFileSync(HOME, "utf-8").replace(/<script[\s\S]*?<\/script>/g, "");
    expect(html).toContain("Start here");
    // The journey card is client-only by nature; if it ever appears in the
    // server html the state is being read somewhere it cannot be trusted.
    expect(html).not.toContain("Today&#x27;s next step");
    expect(html).not.toContain("Today's next step");
  });
});
