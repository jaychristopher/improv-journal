import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { TOTAL, TWENTY_ONE_BANK, TWENTY_ONE_ROOMS } from "../twenty-one-questions-bank";

const APP = path.join(process.cwd(), ".next", "server", "app");
const PAGE = path.join(APP, "21-questions-game.html");
const built = fs.existsSync(PAGE);

/**
 * The tool is the hero of /21-questions-game, and a hero is a position as
 * much as a component. The server html has to carry the inline card, with its
 * six ways in and the count the page's title makes, and carry it before the
 * article starts — otherwise a phone shows a reader the preamble the tool
 * exists to skip (2026-09-25, the same arrangement as the prompt generator and
 * would-you-rather).
 */
describe("21 questions on the built page", () => {
  it.runIf(built)("renders its first step in the server html", () => {
    const html = fs.readFileSync(PAGE, "utf8");
    for (const room of TWENTY_ONE_ROOMS) {
      expect(html, room.id).toContain(room.label.replace("'", "&#x27;"));
    }
    // The count on the card is the bank's, and it is the title's 181. React
    // splits an expression from the text after it with a comment node in the
    // server html, so the number and the phrase are matched across it.
    const count = TWENTY_ONE_BANK.length + TOTAL;
    expect(html).toMatch(new RegExp(`${count}(<!-- -->)? questions, every one of them`));
  });

  it.runIf(built)("sits above the article, not inside or below it", () => {
    const html = fs.readFileSync(PAGE, "utf8");
    const hero = html.indexOf("Just run the 21");
    const article = html.indexOf("<article");
    expect(hero).toBeGreaterThan(-1);
    expect(article).toBeGreaterThan(-1);
    expect(hero).toBeLessThan(article);
  });

  it.runIf(built)("does not ship the dialog markup in the server html", () => {
    // The dialog is client-only. If it ever server-renders open, the page
    // arrives as a full-screen modal for every crawler and every reader.
    // Scoped below the nav, whose mobile menu is a dialog on purpose.
    const html = fs.readFileSync(PAGE, "utf8");
    const body = html.slice(html.indexOf("</nav>"));
    expect(body.length, "the page has content below the nav").toBeGreaterThan(1_000);
    expect(body).not.toContain('aria-modal="true"');
  });

  it.runIf(built)("keeps the article whole underneath, h1 and all 181 included", () => {
    // Nothing in the hero is a route, and the article stays the page for
    // search engines and for the reader who scrolls: its h1 is untouched and
    // every question the tool can deal is printed in it.
    const html = fs.readFileSync(PAGE, "utf8");
    expect(html).toMatch(/<h1[^>]*>21 Questions Game/);
    expect(html).toContain("The 21, In Order");
    expect(html).toContain("The Part You Can Practise");
  });
});
