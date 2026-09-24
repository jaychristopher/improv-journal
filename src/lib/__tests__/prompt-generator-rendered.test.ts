import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { PROMPT_USE_CASES } from "../prompt-bank";

const APP = path.join(process.cwd(), ".next", "server", "app");
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "improv-prompts.html"));
const TOOL = path.join(APP, "tools", "improv-prompt-generator.html");
const builtTool = fs.existsSync(TOOL);

/**
 * The generator is the hero of /improv-prompts, and a hero is a position as
 * much as a component. The server html has to carry the inline card, with its
 * four ways in, and carry it before the article starts — otherwise a phone
 * shows a reader the preamble the tool exists to skip.
 */
describe("the prompt generator on the built page", () => {
  it.runIf(built)("renders its first step in the server html", () => {
    const html = fs.readFileSync(path.join(APP, "improv-prompts.html"), "utf8");
    expect(html).toContain("Give me a prompt");
    for (const room of PROMPT_USE_CASES) {
      expect(html, room.id).toContain(room.label);
    }
  });

  it.runIf(built)("sits above the article, not inside or below it", () => {
    const html = fs.readFileSync(path.join(APP, "improv-prompts.html"), "utf8");
    const hero = html.indexOf("Give me a prompt");
    const article = html.indexOf("<article");
    expect(hero).toBeGreaterThan(-1);
    expect(article).toBeGreaterThan(-1);
    expect(hero).toBeLessThan(article);
  });

  it.runIf(built)("does not ship the dialog markup in the server html", () => {
    // The dialog is client-only. If it ever server-renders open, the page
    // arrives as a full-screen modal for every crawler and every reader.
    //
    // Scoped to the page below the chrome since 2026-09-24. The nav's mobile
    // menu is a dialog too and is deliberately server-rendered — hidden with
    // CSS so its 20 destinations are in the HTML for a crawler — so a check
    // against the whole document was catching the navigation rather than the
    // generator it was written for.
    const html = fs.readFileSync(path.join(APP, "improv-prompts.html"), "utf8");
    const body = html.slice(html.indexOf("</nav>"));
    expect(body.length, "the page has content below the nav").toBeGreaterThan(1_000);
    expect(body).not.toContain('aria-modal="true"');
  });

  /**
   * The tool page owns the "improv prompt generator" keyword — the guide hero
   * deliberately does not say it — so the page has to exist, carry the tool,
   * and put the phrase in its h1 rather than anywhere else.
   */
  it.runIf(builtTool)("has a page of its own that carries the keyword in its h1", () => {
    const html = fs.readFileSync(TOOL, "utf8");
    expect(html).toMatch(/<h1[^>]*>Improv Prompt Generator/);
    expect(html).toContain("Give me a prompt");
    for (const room of PROMPT_USE_CASES) {
      expect(html, room.id).toContain(room.label);
    }
    expect(html).toContain('href="/improv-prompts"');
  });

  it.runIf(built)(
    "keeps the keyword out of the guide's headings, so the two pages do not compete",
    () => {
      const html = fs.readFileSync(path.join(APP, "improv-prompts.html"), "utf8");
      const headings = [...html.matchAll(/<h[1-3][^>]*>(.*?)<\/h[1-3]>/g)].map((m) => m[1]);
      const competing = headings.filter((h) => /prompt generator/i.test(h));
      expect(competing).toEqual([]);
    },
  );
});
