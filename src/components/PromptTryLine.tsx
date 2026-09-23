import Link from "next/link";

import { categoriesNaming, generatorHrefFor } from "@/lib/prompt-bank";

/**
 * "Try it" on a concept the prompt generator has material for.
 *
 * Seven concepts — relationship, initiation, environment, space work, want,
 * tilt, suggestion — are the generator's categories under their own names,
 * and none of their pages linked the tool (tracker entry 332, 2026-09-22).
 * Derived from the same `concepts` field the generator reads, so the two
 * cannot drift: a concept gets the line when a category names it, and the
 * link opens the tool pre-set to that category (`?category=…`, read by
 * PromptGenerator after mount). Null for the 198 concepts no category names.
 *
 * `data-derived="true"` marks it as computed (derived-provenance.test.ts).
 * Mounted inside the concept sidebar it inherits the region's caption and
 * draws none of its own; it carries no `data-track` name, so the sweep of
 * tracked blocks neither counts it nor flags a doubled marker.
 */
export function PromptTryLine({ atomId }: { atomId: string }) {
  const category = categoriesNaming(atomId)[0];
  if (!category) return null;
  return (
    <p className="text-foreground/50 text-xs" data-prompt-try={category.id} data-derived="true">
      Try it:{" "}
      <Link
        href={generatorHrefFor(category.id)}
        className="text-foreground/70 hover:text-foreground underline underline-offset-2"
      >
        prompts for <em>{category.label.toLowerCase()}</em>
      </Link>{" "}
      &rarr;
    </p>
  );
}

/** Whether a concept gets the line, for tests and for a mount that wants to know before rendering. */
export function hasPromptTryLine(atomId: string): boolean {
  return categoriesNaming(atomId).length > 0;
}
