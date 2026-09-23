import type { HTMLAttributes } from "react";

import { autolinkInline } from "@/lib/content";

type ProseTag = "p" | "span" | "div" | "li" | "dd";

interface ProseProps extends Omit<
  HTMLAttributes<HTMLElement>,
  "children" | "dangerouslySetInnerHTML"
> {
  /** Plain prose, as the route file holds it — not HTML, not JSX. */
  text: string;
  /** The page the prose sits on, so a sentence never links back to it. */
  currentUrl: string | null;
  /** The block element; `span` for a run of text inside a hand-built `<p>`. */
  as?: ProseTag;
}

/**
 * A sentence a route file holds, sent through the site's autolinker.
 *
 * About 11,400 words of reader-facing prose live in `src/app` rather than in
 * `content/` — the hubs' orientation paragraphs, the picker's level and focus
 * copy, the tradition pages, the audience hubs (tracker entry 278). Rendered
 * as JSX text, none of it passed through `autolinkInline`, so the picker's
 * beginner copy named Pass the Clap, Big Booty and Zip Zap Zop and linked
 * none; the iO tradition page said "group mind … and the Harold" and linked
 * neither; the principles hub named be present and did not link it. Only
 * `LessonFrame` sent its strings through the linker.
 *
 * This is the one call `LessonFrame` makes, made available to a route file:
 * the text goes through the same remark pipeline a frontmatter field does
 * (so `&` and `<` are escaped by the renderer, and a concept title, an alias,
 * a source or a founder's name becomes a link), and the result is set as the
 * inner HTML of the element the page was already using. The markup and the
 * classes are the page's own; only the text node changes. The same rules
 * apply as everywhere else the linker runs: one link per target per string,
 * never to the page it is on, and the one-word titles
 * `GENERIC_ONE_WORD_ATOM_TITLES` declines stay plain.
 *
 * Async, so it must be rendered from a server component.
 */
export async function Prose({ text, currentUrl, as: Tag = "p", className, ...rest }: ProseProps) {
  const html = await autolinkInline(text, currentUrl);
  const classes = [className, "[&_a]:underline [&_a]:underline-offset-2"].filter(Boolean).join(" ");
  return <Tag {...rest} className={classes} dangerouslySetInnerHTML={{ __html: html }} />;
}
