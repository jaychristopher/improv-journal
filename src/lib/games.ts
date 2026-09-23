/**
 * The improv games collection.
 *
 * "improv games" is the site's most winnable keyword by a distance — real
 * monthly demand at a keyword difficulty of 1, on the site's home turf — but
 * the hub listed only the 17 exercise atoms, each cut to a 150-character
 * fragment.
 *
 * Short-form formats belong in the same collection: Freeze Tag and Scenes from
 * a Hat are improv games in every sense a searcher means. Long-form structures
 * like the Harold are not, so membership is taken from each atom's own
 * `shortform` tag rather than guessed at here.
 *
 * SERP checked 2026-08-23: winnable, and the softest results page on the site.
 * divecollective.org holds position six at DR 8 with no backlinks at all,
 * DR 20 and DR 23 sit at nine and ten, and the traffic is spread across the
 * page rather than taken by one encyclopedic result — positions three to ten
 * share roughly 2,100 visits between them.
 *
 * Note for whoever picks this up: this page is not a bridge, so none of the SEO
 * guards and neither audit script can see it. The verdict above is a comment
 * because there is nowhere structured to put it. Bringing the hand-built app
 * routes into the audit is the outstanding work.
 */

import { exerciseFocuses, FOCUSES } from "@/app/tools/exercise-picker/picker-config";

import { getAtomUrl, loadAtoms } from "./content";
import { CARD_LINE_CAP, drillsPreparingFor, formatsFedBy } from "./format-drills";
import { leadParagraph, stripLeadLabel } from "./seo";

/** A link on a game card's one-line prepare-with or feeds note. */
export interface GameLink {
  id: string;
  title: string;
  href: string;
}

export interface ImprovGame {
  id: string;
  title: string;
  href: string;
  tags: string[];
  /**
   * The picker's focus slugs this game answers to — presence, ensemble,
   * emotion, physicality, courage, recovery — or, for a format that carries
   * none of them, `formats` (see FORMATS_FOCUS).
   *
   * The hub's Focus filter used to read raw tags, and reached 20 of 41 games:
   * the focus vocabulary was written for exercises, and twelve of the fourteen
   * short forms carried none of it, so choosing any focus hid nearly every
   * format including the three the tests name as the reason formats are here.
   * These come from the same derivation the picker uses — frontmatter focus
   * tags, then the hand map, then the atoms the game illustrates (and, for
   * exercises only, the atoms it requires) — with the presence extras
   * (`listening`) folded into presence as the picker does.
   */
  focuses: string[];
  /** The entry's opening paragraph, taken from its own content. */
  description: string;
  /** One sentence of rules. See `how_to_play` on AtomFrontmatter. */
  howToPlay?: string;
  /** Short-form formats are played as games; exercises are trained as drills. */
  kind: "exercise" | "format";
  /**
   * For a format, up to CARD_LINE_CAP drills that prepare for it; empty for
   * an exercise. Derived from shared targets (format-drills.ts), never
   * authored: the hub listed formats and exercises as one inventory the graph
   * keeps as two, with ten edges between them (tracker entry 283).
   */
  prepareWith: GameLink[];
  /** The reverse: for an exercise, up to CARD_LINE_CAP formats it feeds. */
  feeds: GameLink[];
}

/**
 * The two kinds, as the hub groups them.
 *
 * Both are things a searcher for "improv games" means, and the page listed
 * them side by side as one inventory. They are two layers in the graph — a
 * format is played, an exercise is trained — and the derived line on each
 * card (`prepareWith`, `feeds`) is the join the graph itself does not make.
 */
export const GAME_GROUPS = [
  {
    key: "format",
    heading: "To play",
    description: "Short-form games with rules an audience can follow, built to be watched.",
  },
  {
    key: "exercise",
    heading: "To train",
    description: "Drills that isolate one skill, run in rehearsal while nobody is watching.",
  },
] as const;

/**
 * The facet a format lands in when nothing says what it trains.
 *
 * The derivation's last resort for an exercise is the atoms it `requires`. For
 * a format that resort read every show's need for commitment as its purpose:
 * 13 of the 14 short forms here were filed under "Courage & Commitment", seven
 * of them under courage alone, and the Courage chip listed Theatresports,
 * Micetro and Gorilla Theatre because the graph records that a show needs
 * commitment, which is true of every show (tracker entry 203, 2026-09-21).
 * Formats now read only their tags, the hand map and what they illustrate;
 * a format with none of those is filed here rather than under a borrowed
 * focus. The picker does not know this focus: it lists exercises only.
 */
export const FORMATS_FOCUS = { tag: "formats", label: "Show formats" } as const;

/** Collapse the picker's focus tags (including extras like `listening`) onto its focus slugs. */
function gameFocuses(focusTags: string[]): string[] {
  return FOCUSES.filter((f) => [f.tag, ...f.extraTags].some((t) => focusTags.includes(t))).map(
    (f) => f.tag,
  );
}

/**
 * The chips the hub's Focus facet offers, given the games it lists.
 *
 * The picker's six focuses always; `formats` only when some game carries it,
 * so the chip cannot appear on a list where every format has a real focus.
 */
export function focusFilterTags(games: ImprovGame[]): { label: string; tag: string }[] {
  const chips = FOCUSES.map((f) => ({ label: f.label.split(" & ")[0], tag: f.tag }));
  if (games.some((g) => g.focuses.includes(FORMATS_FOCUS.tag))) chips.push({ ...FORMATS_FOCUS });
  return chips;
}

export async function loadImprovGames(): Promise<ImprovGame[]> {
  const atoms = await loadAtoms();

  return atoms
    .filter((atom) => {
      const { type, tags } = atom.frontmatter;
      if (type === "exercise") return true;
      return type === "format" && (tags ?? []).includes("shortform");
    })
    .map((atom) => {
      const { id, title, type, tags = [], links, how_to_play } = atom.frontmatter;
      const kind = type === "exercise" ? ("exercise" as const) : ("format" as const);
      const focuses = gameFocuses(exerciseFocuses(id, tags, links, type));
      const toLink = (a: { id: string; title: string; url: string }): GameLink => ({
        id: a.id,
        title: a.title,
        href: a.url,
      });
      const prepareWith =
        kind === "format"
          ? drillsPreparingFor(id, atoms).drills.slice(0, CARD_LINE_CAP).map(toLink)
          : [];
      const feeds =
        kind === "exercise"
          ? formatsFedBy(id, atoms).formats.slice(0, CARD_LINE_CAP).map(toLink)
          : [];
      return {
        id,
        title,
        href: getAtomUrl({ id, type }),
        tags,
        focuses: focuses.length === 0 && kind === "format" ? [FORMATS_FOCUS.tag] : focuses,
        description: leadParagraph(stripLeadLabel(atom.content), 200),
        howToPlay: how_to_play,
        kind,
        prepareWith,
        feeds,
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}
