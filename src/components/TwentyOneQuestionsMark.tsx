import { TOTAL } from "@/lib/twenty-one-questions-bank";

/**
 * The wordmark at the top of the /21-questions-game hero.
 *
 * The page's thesis is that the number is the entire mechanism — a fixed
 * count removes the polite exit and guarantees an ending — so the mark is the
 * game's name with the count drawn under it: twenty-one ticks of equal weight,
 * the same row the card fills in as the round runs. It is the game's name
 * rather than the tool's, because that is what a reader arriving from search
 * recognises.
 *
 * The words are real text inside the heading, not paths in an SVG: they scale
 * with the viewport, they are selectable, they are what a screen reader
 * announces, and they are the string search engines read. Only the count is
 * drawn.
 */
export function TwentyOneQuestionsMark({ id }: { id?: string }) {
  return (
    <h2 id={id}>
      <span className="text-hero-foreground block text-[2.75rem] leading-[0.95] font-bold tracking-tight sm:text-6xl lg:text-7xl">
        21
        <br />
        questions
        <span className="text-hero-muted">.</span>
      </span>
      {/* The count: twenty-one ticks, evenly weighted. aria-hidden because the
          heading above already says the number. */}
      <span aria-hidden className="mt-5 flex w-full max-w-sm items-center gap-1 sm:mt-6">
        {Array.from({ length: TOTAL }, (_, i) => (
          <span key={i} className="bg-hero-foreground/70 h-1 flex-1 rounded-full" />
        ))}
      </span>
    </h2>
  );
}
