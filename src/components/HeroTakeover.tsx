/**
 * The shell both guide heroes sit in: /improv-prompts and
 * /would-you-rather-questions.
 *
 * Those two pages are tools first and articles second — a reader arrives
 * wanting a prompt or a pair, not a preamble — so the hero takes the whole
 * viewport on a phone rather than sitting in the column as a card. It is a
 * dark panel in both themes, because an inverted block is how a tool reads as
 * a tool next to a page of prose, and because the nav floats over it in light
 * text (globals.css, `body:has([data-hero-takeover])`).
 *
 * On a large screen it stops taking the viewport and becomes a 16:9 panel in
 * the article's own column, so the page under it is visible without
 * scrolling: a desktop reader can see both what the tool is and that there is
 * an article behind it, which on a phone they cannot.
 *
 * It renders as a sibling *above* `<main>`, not inside it. A full-bleed block
 * inside a centred, padded column has to cancel that column, and every way of
 * doing that leans on `vw` — which counts the scrollbar where the column does
 * not, so the panel ended up 7px wide of the viewport and offset to match.
 * Outside the column there is nothing to cancel: the section is a block child
 * of the body and fills it exactly, scrollbar and all.
 *
 * `data-hero-takeover` is the hook for the nav rules and for the tests. The
 * component is presentational and server-rendered; the tools mount their own
 * interactive parts inside it.
 */
export function HeroTakeover({
  children,
  /** Labels the region for assistive tech; each tool passes its own heading id. */
  labelledBy,
  hidden = false,
  takeover = true,
}: {
  children: React.ReactNode;
  labelledBy?: string;
  /** True while a tool's dialog is open, so the hero behind it goes inert. */
  hidden?: boolean;
  /**
   * False where the tool is mounted partway down a page rather than as its
   * hero — the dedicated generator page puts it under a heading and an
   * article. It keeps the dark panel and loses the viewport, the full bleed
   * and `data-hero-takeover`: a nav inverted for a panel the reader has
   * scrolled past would be light text on a light page.
   */
  takeover?: boolean;
}) {
  return (
    <div
      {...(takeover ? { "data-hero-takeover": true } : {})}
      // From `lg` the wrapper takes the site's own max width — the nav's, not
      // the article's narrower column. At the column's 624px a 16:9 panel is
      // 351px tall and this content is nearer 400, so the eyebrow and the
      // count were clipped off the top and bottom of it.
      className={takeover ? "w-full lg:mx-auto lg:max-w-5xl lg:px-6 lg:pt-10" : "my-6 w-full"}
    >
      <section
        aria-labelledby={labelledBy}
        aria-hidden={hidden}
        inert={hidden}
        className={[
          "bg-hero text-hero-foreground flex items-center overflow-hidden",
          takeover
            ? // svh rather than vh: on iOS the address bar would otherwise cut
              // the last row of buttons off the fold.
              "min-h-[100svh] lg:aspect-video lg:min-h-0 lg:rounded-2xl"
            : "rounded-2xl",
        ].join(" ")}
      >
        {/* pt clears the floating nav on a phone, where the hero starts at the
            top of the document and the nav has no background of its own. */}
        <div
          className={[
            "mx-auto w-full max-w-2xl",
            takeover ? "px-6 pt-24 pb-14 sm:px-8 lg:px-12 lg:py-12" : "px-6 py-8 sm:px-8",
          ].join(" ")}
        >
          {children}
        </div>
      </section>
    </div>
  );
}
