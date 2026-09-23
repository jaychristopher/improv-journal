import fs from "fs";
import path from "path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LessonFrame } from "../../components/LessonFrame";
import { autolinkInline, getAtomUrl, loadAtoms, loadThreads } from "../content";

const APP = path.join(process.cwd(), ".next", "server", "app");
const built =
  fs.existsSync(path.join(APP, "threads")) && fs.existsSync(path.join(APP, "index.html"));

/** The lesson-frame fields the frame renders as prose. */
const FRAME_FIELDS = [
  "lesson_goal",
  "key_takeaway",
  "common_mistake",
  "practice_prompt",
  "success_signal",
  "transfer_prompt",
  "reflection_prompt",
] as const;

function mentions(text: string, title: string): boolean {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![A-Za-z0-9])${escaped}(?![A-Za-z0-9])`, "i").test(text);
}

/**
 * Lessons whose practice prompt names an exercise by its title, and which
 * exercises. This is the population the linking test runs over, derived from
 * the content rather than listed by hand so a new prompt joins it unasked.
 */
async function promptsNamingExercises() {
  const [atoms, threads] = await Promise.all([loadAtoms(), loadThreads()]);
  const exercises = atoms.filter((a) => a.frontmatter.type === "exercise");
  return threads
    .map((t) => ({
      id: t.frontmatter.id,
      prompt: t.frontmatter.practice_prompt ?? "",
      named: exercises
        .filter(
          (e) =>
            t.frontmatter.practice_prompt &&
            mentions(t.frontmatter.practice_prompt, e.frontmatter.title),
        )
        .map((e) => ({
          id: e.frontmatter.id,
          url: getAtomUrl({ id: e.frontmatter.id, type: "exercise" }),
        })),
    }))
    .filter((t) => t.named.length > 0);
}

/**
 * The lesson frame's prose fields are linked like the body is.
 *
 * They were rendered as plain strings, outside the markdown and autolink
 * pipeline, so on Quieting the Planning Mind the prompt "Run mirroring, a
 * one-word scene, or a blind offer" carried no link on a page whose sidebar
 * linked all three exercises. The frame is the one place a lesson says what
 * to do and what to avoid, and it was the one prose on the page with no links.
 */
describe("lesson frame links", () => {
  it("links every exercise a practice prompt names by title", async () => {
    const lessons = await promptsNamingExercises();
    // Floor at what the corpus holds today (2026-09-21): one lesson,
    // quieting-the-planning-mind, naming three exercises. Two other prompts
    // name exercises in a form the title matcher does not recognise —
    // "last-word-response" for Last Word Response, "yes-and chain" for
    // Yes, And Chain — and those stay unlinked until the prompt or the
    // matcher changes. Raise this floor when they do; do not lower it.
    expect(lessons.length).toBeGreaterThanOrEqual(1);
    expect(lessons.flatMap((l) => l.named).length).toBeGreaterThanOrEqual(3);

    for (const lesson of lessons) {
      const html = await autolinkInline(lesson.prompt, `/threads/${lesson.id}`);
      for (const exercise of lesson.named) {
        expect(html, `${lesson.id} → ${exercise.id}`).toContain(`href="${exercise.url}"`);
      }
    }
  });

  it("links something in more than one lesson's frame, not just the prompts", async () => {
    // The frame has seven prose fields; the prompt is one. This guards the
    // pipeline as a whole: if the autolinker silently stopped linking, the
    // count falls to zero and the test above could still pass on one lesson.
    const threads = await loadThreads();
    let linkedLessons = 0;
    for (const t of threads) {
      const fm = t.frontmatter as unknown as Record<string, string | undefined>;
      let any = false;
      for (const field of FRAME_FIELDS) {
        const text = fm[field];
        if (!text) continue;
        if ((await autolinkInline(text, `/threads/${fm.id}`)).includes("<a href=")) any = true;
      }
      if (any) linkedLessons += 1;
    }
    // Three today (2026-09-21): two goals naming Beyond the Stage, one goal
    // naming internal-computation, plus the prompt above.
    expect(linkedLessons).toBeGreaterThanOrEqual(3);
  });

  it("renders the linked prompt as markup rather than escaped text", async () => {
    const [lesson] = await promptsNamingExercises();
    expect(lesson).toBeTruthy();
    const tree = await LessonFrame({
      practicePrompt: lesson.prompt,
      currentUrl: `/threads/${lesson.id}`,
      children: null,
    });
    const html = renderToStaticMarkup(tree);
    for (const exercise of lesson.named) {
      expect(html, exercise.id).toContain(`href="${exercise.url}"`);
    }
    expect(html).not.toContain("&lt;a ");
  });

  it.runIf(built)("ships those links in the built lesson page", async () => {
    for (const lesson of await promptsNamingExercises()) {
      const file = path.join(APP, "threads", `${lesson.id}.html`);
      const html = fs.readFileSync(file, "utf-8");
      // Only the prompt's own section: the sidebar further down links the
      // same exercises, and a slice that ran to the end of the page would
      // pass on those.
      const start = html.indexOf("Do this now");
      expect(start, `${lesson.id} has a Do this now section`).toBeGreaterThan(-1);
      const frame = html.slice(start, html.indexOf("</section>", start));
      for (const exercise of lesson.named) {
        expect(frame, `${lesson.id} → ${exercise.id}`).toContain(`href="${exercise.url}"`);
      }
    }
  });
});
