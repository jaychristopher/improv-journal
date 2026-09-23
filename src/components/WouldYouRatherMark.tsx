/**
 * The wordmark at the top of the /would-you-rather-questions hero.
 *
 * The page's thesis is that a pair is only worth asking if the room genuinely
 * divides — "five to five is the whole point" — so the mark is the question
 * with the split drawn under it: two bars of equal weight with a gap between
 * them, the same shape the pair card puts on screen when it deals. It is the
 * game's name rather than the tool's, because that is what a reader arriving
 * from search recognises.
 *
 * The words are real text inside the heading, not paths in an SVG: they scale
 * with the viewport, they are selectable, they are what a screen reader
 * announces, and they are the string search engines read. Only the split rule
 * is drawn.
 */
export function WouldYouRatherMark({ id }: { id?: string }) {
  return (
    <h2 id={id}>
      <span className="text-hero-foreground block text-[2.75rem] leading-[0.95] font-bold tracking-tight sm:text-6xl lg:text-7xl">
        Would you
        <br />
        rather
        <span className="text-hero-muted">?</span>
      </span>
      {/* The split: two halves, evenly weighted, with the gap between them
          doing the work. aria-hidden because the heading above already says
          everything this means. */}
      <span aria-hidden className="mt-5 flex w-full max-w-sm items-center gap-2 sm:mt-6">
        <span className="bg-hero-foreground/70 h-1 flex-1 rounded-full" />
        <span className="bg-hero-foreground/70 h-1 flex-1 rounded-full" />
      </span>
    </h2>
  );
}
