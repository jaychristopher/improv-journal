import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { PROMPT_BANK } from "../prompt-bank";
import {
  APPENDIX_ID,
  appendixContents,
  listedPrompts,
  normalizePrompt,
  unlistedPrompts,
} from "../prompt-bank-appendix";

const ROOT = process.cwd();
const BUILD = path.join(ROOT, ".next", "server", "app");
const built = fs.existsSync(path.join(BUILD, "index.html"));
const GUIDE = path.join(ROOT, "content", "bridges", "improv-prompts.md");
const markdown = fs.readFileSync(GUIDE, "utf8");

const decode = (s: string) =>
  s
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/<!--\s*-->/g, "");

/**
 * Every prompt in the bank is on the guide, and the guide says how many.
 *
 * The sections list 140 and argue for them; the rest of the bank is rendered
 * after the prose by PromptBankAppendix (2026-09-30), so the page is the
 * bank's canonical statement rather than a sample of it, and the title's
 * number is the bank's. A bank that grows without the title moving, or a
 * section that lists a prompt the appendix still repeats, fails here.
 */
describe("the rest of the bank on the guide", () => {
  it("is exactly the bank minus what the sections list", () => {
    const listed = listedPrompts(markdown);
    const rest = unlistedPrompts(markdown);
    // 140 listed and 347 more on 2026-09-30.
    expect(listed.size).toBeGreaterThanOrEqual(140);
    expect(rest.length + listed.size).toBe(PROMPT_BANK.length);
    for (const p of rest) expect(listed.has(normalizePrompt(p.text)), p.text).toBe(false);
    expect(appendixContents(markdown)[0]?.text).toBe(`The Other ${rest.length}, by Kind`);
  });

  it("puts the bank's count in the title, the description and the H1", () => {
    const n = PROMPT_BANK.length;
    expect(markdown).toMatch(new RegExp(`^title: "Improv Prompts: ${n} Scene Starters`, "m"));
    expect(markdown).toMatch(new RegExp(`^description: "${n} prompts`, "m"));
    expect(markdown).toMatch(new RegExp(`^# Improv Prompts: ${n} Scene Starters`, "m"));
  });

  it.runIf(built)("renders every unlisted prompt on the built guide, after the prose", () => {
    const html = fs.readFileSync(path.join(BUILD, "improv-prompts.html"), "utf8");
    const start = html.indexOf(`id="${APPENDIX_ID}"`);
    expect(start).toBeGreaterThan(0);
    // After the article body, before the hand-off blocks.
    expect(start).toBeGreaterThan(html.indexOf('data-track="body"'));
    const section = decode(html.slice(start, html.indexOf("</section>", start)));
    const rest = unlistedPrompts(markdown);
    expect(section.match(/<li>/g)?.length).toBe(rest.length);
    for (const p of rest) expect(section, p.text).toContain(`<li>${p.text}</li>`);
    // The contents list offers it like any other section.
    expect(html).toContain(`href="#${APPENDIX_ID}"`);
  });

  it("stays on the printed page as slips", () => {
    const css = fs.readFileSync(path.join(ROOT, "src", "app", "globals.css"), "utf8");
    const print = css.slice(css.indexOf("@media print"));
    expect(print).toMatch(/:not\(\[data-print-keep\]\)/);
    expect(print).toMatch(/\[data-print-keep\] li \{[^}]*border-bottom: 1px dashed/);
  });
});
