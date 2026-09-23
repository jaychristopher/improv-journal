import type { AudioContentType } from "@/lib/audio";
import { getTranscript, renderTranscriptHtml } from "@/lib/transcripts";

/** The section's id; AudioPlayer's "Read the transcript" link points here. */
export const TRANSCRIPT_ANCHOR = "transcript";

/**
 * The href a player should offer for the page's transcript, or undefined
 * when the page renders no fold, so no player links to a section that is
 * not there.
 */
export function transcriptHref(layer: AudioContentType, id: string): string | undefined {
  const transcript = getTranscript(layer, id);
  return transcript && transcript.paragraphs.length > 0 ? `#${TRANSCRIPT_ANCHOR}` : undefined;
}

/**
 * The script behind a player, folded in a section of its own below the
 * article.
 *
 * Every content page plays a reading whose text was, until 2026-09-21, the
 * one text on the site no page showed (tracker entry 257). A native
 * `<details>` keeps the words in the server HTML, where a crawler and the
 * site's own linker can reach them, without putting a second essay above
 * the page's own; the summary says how long the reading takes to read,
 * since the player already says how long it takes to hear.
 *
 * It rendered inside the player card first, under the H1, so on all 319
 * pages the transcript preceded the article in DOM order and on 149 of
 * them it was most of the text in main: the first thousand words a crawler
 * met on a beginner lesson were two hosts talking about the subject rather
 * than the lesson (tracker entry 260). The fold now follows the prose and
 * precedes the connections, and the player links down to it.
 *
 * Renders nothing when the layer has no script for the id, so a player whose
 * audio has no source on disk is unchanged.
 *
 * Provenance: the section carries `data-derived` and, standing alone on a
 * guide, a lesson or a path, its own "computed" caption. On a concept page
 * it is the first block of the after-article region, whose wrapper draws the
 * one caption and the rule above it (tracker entry 317), so the caller
 * passes `className` to drop this section's own separator rather than
 * drawing two rules a caption apart.
 */
export async function Transcript({
  layer,
  id,
  currentUrl,
  body,
  className = "border-foreground/10 mt-12 border-t pt-6",
}: {
  layer: AudioContentType;
  id: string;
  /** The page's own URL, so the transcript never links to itself. */
  currentUrl: string | null;
  /**
   * The page's rendered body. Every target it links stays plain text in the
   * fold, so the transcript links only what the prose did not: before the
   * ledger a third of a concept page's transcript links and most of a
   * guide's repeated a body link (tracker entry 267). Optional so a caller
   * with no body still gets a linked fold, and the fold is then its own
   * ledger as before.
   */
  body?: string;
  /** The section's own separator; a region wrapper that draws the rule passes none. */
  className?: string;
}) {
  const transcript = getTranscript(layer, id);
  if (!transcript || transcript.paragraphs.length === 0) return null;
  const html = await renderTranscriptHtml(transcript.paragraphs, currentUrl, body);

  return (
    <section
      id={TRANSCRIPT_ANCHOR}
      data-transcript
      data-track="transcript"
      data-derived="true"
      className={className || undefined}
    >
      <details className="group [&>summary::-webkit-details-marker]:hidden">
        <summary className="text-foreground/50 hover:text-foreground/70 cursor-pointer list-none text-xs">
          <span className="group-open:hidden">
            {`Transcript (${transcript.minutes} min read)`} &darr;
          </span>
          <span className="hidden group-open:inline">Hide transcript &uarr;</span>
        </summary>
        <div className="prose prose-neutral dark:prose-invert prose-sm mt-3 max-w-none">
          {html.map((paragraph, index) => (
            <p key={index} dangerouslySetInnerHTML={{ __html: paragraph }} />
          ))}
        </div>
      </details>
    </section>
  );
}
