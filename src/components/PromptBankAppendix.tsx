import { PROMPT_CATEGORIES } from "@/lib/prompt-bank";
import {
  APPENDIX_ID,
  appendixHeading,
  KIND_HEADINGS,
  unlistedPrompts,
} from "@/lib/prompt-bank-appendix";

/**
 * The rest of the generator's bank, after the improv prompts guide's prose.
 *
 * A server component: the lists are in the HTML, which is the point — the
 * guide's sections list 140 prompts and the bank holds three times that, and
 * until 2026-09-30 the rest existed only in JavaScript. Grouped by kind in
 * the sections' order, with no links and no argument; the argument is above.
 * `data-print-keep` keeps it on the printed page as slips (globals.css).
 */
export function PromptBankAppendix({ markdown }: { markdown: string }) {
  const rest = unlistedPrompts(markdown);
  if (rest.length === 0) return null;
  return (
    <section
      aria-labelledby={APPENDIX_ID}
      data-prompt-bank={rest.length}
      data-print-keep=""
      className="prose prose-neutral dark:prose-invert mt-16 max-w-none"
    >
      <h2 id={APPENDIX_ID}>{appendixHeading(rest.length)}</h2>
      <p>
        Everything in the generator&apos;s bank that the sections above do not list, in the order
        the sections use. The generator ranks these for your room and never repeats one; on the page
        they are simply the rest, and they print as slips like the lists above.
      </p>
      {PROMPT_CATEGORIES.map((category) => {
        const prompts = rest.filter((p) => p.category === category.id);
        if (prompts.length === 0) return null;
        return (
          <div key={category.id}>
            <h3 id={`${APPENDIX_ID}-${category.id}`}>
              {KIND_HEADINGS[category.id]} ({prompts.length})
            </h3>
            <ul>
              {prompts.map((p) => (
                <li key={p.id}>{p.text}</li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
