import { buildDiagram } from "@/lib/diagrams";

interface DiagramProps {
  /** Path under public/, e.g. "/images/harold-structure.svg". */
  src: string;
  /**
   * Describes the information, not the artefact. Becomes the `<title>`, which
   * is the accessible name — there is no `alt` on an inlined SVG.
   */
  alt: string;
  /** Optional sentence of context, rendered beneath in the prose voice. */
  caption?: string;
}

/**
 * A content diagram on a JSX route page.
 *
 * Markdown pages get diagrams through `inlineDiagrams`, but `/practice/formats`,
 * `/how-it-works/principles` and `/improv-games` are components with no markdown
 * prose, so the transform chain never sees them. This is the same inlining by
 * the other door — same files, same tokens, same guards.
 *
 * Server component: the SVG is read at build time, so nothing ships to the
 * client and the markup is identical to the markdown path's output.
 */
export function Diagram({ src, alt, caption }: DiagramProps) {
  const svg = buildDiagram(src, alt);

  // A missing or malformed file renders nothing rather than a broken graphic.
  // The guard tests catch this in CI; this is the runtime backstop.
  if (!svg) return null;

  return (
    <figure className="my-8">
      <div dangerouslySetInnerHTML={{ __html: svg }} />
      {caption && (
        <figcaption className="text-foreground/70 mt-2 text-sm italic">{caption}</figcaption>
      )}
    </figure>
  );
}
