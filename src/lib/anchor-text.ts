import { AUTHOR_SAMEAS } from "./author-entities";
import type { BridgeTargetKeyword, PageSubject } from "./schema";

/**
 * How a guide is named when another page links to it.
 *
 * This lived twice — once in top-guides for the footer, once in
 * related-bridges for the block at the foot of every guide — and the second
 * copy carried the comment "see top-guides", which is the shape this
 * codebase's duplication bugs keep taking: one value computed in two places,
 * agreeing until one of them is improved. The proper-noun rule was added to
 * the footer copy and the related-guides copy did not get it.
 *
 * Both now call this.
 */

/**
 * Whether a page says a phrase, read the way a reader would.
 *
 * Case does not matter, a line break inside a phrase is a space, a hyphen is
 * a space ("Warm-Up Games" says "warm up games", which is how it is searched),
 * and the markdown emphasis and link brackets that can sit inside a phrase
 * are not characters. Whole-phrase, bounded by non-word characters, so
 * "improv" is not found inside "improvisation" and "20 questions" is not
 * found in "21 questions".
 */
export function normaliseText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[*_`[\]]/g, "")
    .replace(/[\s-]+/g, " ");
}

function pageContains(page: string, keyword: string): boolean {
  const phrase = normaliseText(keyword).trim();
  if (!phrase) return false;
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}(?=$|[^a-z0-9])`).test(page);
}

/**
 * Anchor text for a guide, chosen from its declared keywords.
 *
 * The highest-volume keyword is not always the right label. Twelve guides
 * declare one whose parent topic differs from their primary's, and on those the
 * anchor was describing a topic the page is not aiming at: "overthinking" for
 * a guide targeting "how to stop overthinking", "communication skills" for
 * people-skills, "constructive feedback" for how-to-give-feedback. Sitewide
 * anchor text is a strong signal about what a page is for, and it was pointing
 * at the wrong subject on 330 pages at a time.
 *
 * So: the highest-volume keyword that shares the primary's parent topic, which
 * keeps the better-phrased variants ("theater games" over "theatre games") and
 * rejects the ones that belong to another topic.
 *
 * That rule read only the keyword table, and the table is not required to
 * match the page. Seven guides were linked from every page of the site under a
 * phrase the guide never contains: "20 questions game" (12,000 a month) for a
 * page that only ever says "21", "relationship questions" for
 * questions-for-couples, "how to be a better listener" for a guide about being
 * a good one. The site-wide anchor for a page is the one string every other
 * page uses to describe it, and for those seven it was a description the page
 * could not confirm.
 *
 * So when the page text is supplied, the pick is the highest-volume same-topic
 * keyword the page actually says, in its title or its body. Falls back to the
 * primary when none of them is present (three guides declare a primary that
 * is a longer form of what the page says), and to the old rule when no text
 * is given, because a caller without the body cannot do better.
 */
export function anchorKeyword(
  keywords: BridgeTargetKeyword[],
  pageText?: string,
): BridgeTargetKeyword | undefined {
  const primary = keywords[0];
  if (!primary) return undefined;
  const sameTopic = keywords.filter((k) => !primary.parent || k.parent === primary.parent);
  const byVolume = [...(sameTopic.length > 0 ? sameTopic : [primary])].sort(
    (a, b) => b.volume - a.volume,
  );
  if (pageText === undefined) return byVolume[0];

  const page = normaliseText(pageText);
  return byVolume.find((k) => pageContains(page, k.keyword)) ?? primary;
}

function titleCase(keyword: string): string {
  return keyword.charAt(0).toUpperCase() + keyword.slice(1);
}

/**
 * Words that differ between British and American spelling and nothing else,
 * as [british, american], each inflection its own entry so a match is a
 * whole word and never a stem. The corpus has no house spelling (tracker
 * entry 279: theatre 173 against theater 180 across the five content layers,
 * behaviour 108 against behavior 164, by this list on 2026-09-22); this is
 * the list `spelling.test.ts` counts the mixing by and the list the anchor
 * rule below reads.
 *
 * Deliberately absent: the bare verb/noun pair practise/practice, because
 * "practice" is the British noun too and a keyword is usually a noun phrase
 * ("improv practice"), so treating it as the American verb would re-spell a
 * label that was right. Its unambiguous inflections are here. Likewise
 * licence/license, metre/meter, tyre/tire and grey/gray, where the American
 * form is also a different British word, and dialogue/monologue, which
 * American English mostly spells the British way.
 */
export const SPELLING_PAIRS: readonly (readonly [string, string])[] = [
  ["theatre", "theater"],
  ["theatres", "theaters"],
  ["behaviour", "behavior"],
  ["behaviours", "behaviors"],
  ["behavioural", "behavioral"],
  ["behaviourally", "behaviorally"],
  ["judgement", "judgment"],
  ["judgements", "judgments"],
  ["judgemental", "judgmental"],
  ["judgementally", "judgmentally"],
  ["towards", "toward"],
  ["recognise", "recognize"],
  ["recognises", "recognizes"],
  ["recognised", "recognized"],
  ["recognising", "recognizing"],
  ["recognisable", "recognizable"],
  ["recognisably", "recognizably"],
  ["realise", "realize"],
  ["realises", "realizes"],
  ["realised", "realized"],
  ["realising", "realizing"],
  ["realisation", "realization"],
  ["centre", "center"],
  ["centres", "centers"],
  ["centred", "centered"],
  ["centring", "centering"],
  ["colour", "color"],
  ["colours", "colors"],
  ["coloured", "colored"],
  ["colourful", "colorful"],
  ["colouring", "coloring"],
  ["programme", "program"],
  ["programmes", "programs"],
  ["learnt", "learned"],
  ["practised", "practiced"],
  ["practising", "practicing"],
  ["organise", "organize"],
  ["organises", "organizes"],
  ["organised", "organized"],
  ["organising", "organizing"],
  ["organisation", "organization"],
  ["organisations", "organizations"],
  ["organisational", "organizational"],
  ["apologise", "apologize"],
  ["apologises", "apologizes"],
  ["apologised", "apologized"],
  ["apologising", "apologizing"],
  ["apologiser", "apologizer"],
  ["emphasise", "emphasize"],
  ["emphasises", "emphasizes"],
  ["emphasised", "emphasized"],
  ["emphasising", "emphasizing"],
  ["memorise", "memorize"],
  ["memorises", "memorizes"],
  ["memorised", "memorized"],
  ["memorising", "memorizing"],
  ["prioritise", "prioritize"],
  ["prioritises", "prioritizes"],
  ["prioritised", "prioritized"],
  ["prioritising", "prioritizing"],
  ["summarise", "summarize"],
  ["summarises", "summarizes"],
  ["summarised", "summarized"],
  ["summarising", "summarizing"],
  ["criticise", "criticize"],
  ["criticises", "criticizes"],
  ["criticised", "criticized"],
  ["criticising", "criticizing"],
  ["minimise", "minimize"],
  ["minimises", "minimizes"],
  ["minimised", "minimized"],
  ["minimising", "minimizing"],
  ["maximise", "maximize"],
  ["maximises", "maximizes"],
  ["maximised", "maximized"],
  ["maximising", "maximizing"],
  ["internalise", "internalize"],
  ["internalises", "internalizes"],
  ["internalised", "internalized"],
  ["internalising", "internalizing"],
  ["normalise", "normalize"],
  ["normalises", "normalizes"],
  ["normalised", "normalized"],
  ["normalising", "normalizing"],
  ["generalise", "generalize"],
  ["generalises", "generalizes"],
  ["generalised", "generalized"],
  ["generalising", "generalizing"],
  ["generalisation", "generalization"],
  ["specialise", "specialize"],
  ["specialises", "specializes"],
  ["specialised", "specialized"],
  ["specialising", "specializing"],
  ["visualise", "visualize"],
  ["visualises", "visualizes"],
  ["visualised", "visualized"],
  ["visualising", "visualizing"],
  ["visualisation", "visualization"],
  ["characterise", "characterize"],
  ["characterises", "characterizes"],
  ["characterised", "characterized"],
  ["characterising", "characterizing"],
  ["stabilise", "stabilize"],
  ["stabilises", "stabilizes"],
  ["stabilised", "stabilized"],
  ["stabilising", "stabilizing"],
  ["paralyse", "paralyze"],
  ["paralyses", "paralyzes"],
  ["paralysed", "paralyzed"],
  ["paralysing", "paralyzing"],
  ["analyse", "analyze"],
  ["analysed", "analyzed"],
  ["analysing", "analyzing"],
  ["favour", "favor"],
  ["favours", "favors"],
  ["favoured", "favored"],
  ["favourite", "favorite"],
  ["favourites", "favorites"],
  ["favourable", "favorable"],
  ["honour", "honor"],
  ["honours", "honors"],
  ["honoured", "honored"],
  ["honouring", "honoring"],
  ["humour", "humor"],
  ["humourless", "humorless"],
  ["flavour", "flavor"],
  ["flavours", "flavors"],
  ["flavoured", "flavored"],
  ["labour", "labor"],
  ["labours", "labors"],
  ["laboured", "labored"],
  ["neighbour", "neighbor"],
  ["neighbours", "neighbors"],
  ["neighbouring", "neighboring"],
  ["neighbourhood", "neighborhood"],
  ["defence", "defense"],
  ["defences", "defenses"],
  ["offence", "offense"],
  ["offences", "offenses"],
  ["catalogue", "catalog"],
  ["catalogues", "catalogs"],
  ["catalogued", "cataloged"],
  ["skilful", "skillful"],
  ["skilfully", "skillfully"],
  ["fulfil", "fulfill"],
  ["fulfils", "fulfills"],
  ["fulfilment", "fulfillment"],
  ["enrol", "enroll"],
  ["enrols", "enrolls"],
  ["enrolment", "enrollment"],
  ["travelled", "traveled"],
  ["travelling", "traveling"],
  ["traveller", "traveler"],
  ["travellers", "travelers"],
  ["cancelled", "canceled"],
  ["cancelling", "canceling"],
  ["modelled", "modeled"],
  ["modelling", "modeling"],
  ["labelled", "labeled"],
  ["labelling", "labeling"],
  ["signalled", "signaled"],
  ["signalling", "signaling"],
  ["counselled", "counseled"],
  ["counselling", "counseling"],
  ["counsellor", "counselor"],
  ["sceptic", "skeptic"],
  ["sceptics", "skeptics"],
  ["sceptical", "skeptical"],
  ["scepticism", "skepticism"],
  ["artefact", "artifact"],
  ["artefacts", "artifacts"],
  ["manoeuvre", "maneuver"],
  ["manoeuvres", "maneuvers"],
  ["ageing", "aging"],
  ["spelt", "spelled"],
  ["dreamt", "dreamed"],
  ["burnt", "burned"],
  ["leant", "leaned"],
  ["spoilt", "spoiled"],
];

const SPELLING_TWIN = new Map<string, string>();
for (const [british, american] of SPELLING_PAIRS) {
  SPELLING_TWIN.set(british, american);
  SPELLING_TWIN.set(american, british);
}

/**
 * The keyword in the page's own spelling, where the two differ only by
 * dialect.
 *
 * The footer labels a promoted guide by its highest-volume keyword, and the
 * keyword volumes are American-majority, so `/theatre-games` — titled
 * "Theatre Games: What They Are and How to Run Them" — was "Theater games"
 * in the footer of every page including its own (tracker entry 279). The
 * keyword's words are the right words; its spelling is Ahrefs's. So a word
 * whose dialect twin the title uses, and whose own form the title does not,
 * takes the title's form. Word by word, so "theater games for kids" against
 * a title that says "theatre" becomes "theatre games for kids", and a keyword
 * the title does not spell either way is left as declared.
 */
export function pageSpelling(keyword: string, title: string): string {
  const titleWords = new Set(title.toLowerCase().match(/[a-z]+/g) ?? []);
  return keyword.replace(/[a-z]+/gi, (word) => {
    const own = word.toLowerCase();
    const twin = SPELLING_TWIN.get(own);
    if (!twin || titleWords.has(own) || !titleWords.has(twin)) return word;
    return word[0] === word[0].toUpperCase() ? twin[0].toUpperCase() + twin.slice(1) : twin;
  });
}

/**
 * A keyword that is somebody's name is capitalised as a name.
 *
 * titleCase raises the first letter, which is right for the phrases almost
 * every guide targets — "How to be funny" is correct — and wrong for the few
 * that target a proper noun. "del close" came out as "Del close" on every page
 * of the site the moment the SERP-floor rule promoted it.
 *
 * The page already knows the answer: a guide about a named entity declares it
 * as its subject, spelled properly, for the structured data. Using that spelling
 * is only allowed when it is the same string as the keyword, so this corrects
 * capitalisation and can never quietly retarget an anchor at something the page
 * is not aiming for. (theatre-games is a Thing, not a name, so it never reaches
 * this rule; its "Theatre games" comes from pageSpelling, which keeps the
 * higher-volume keyword's words and the page's own spelling of them.)
 */
function properName(keyword: string, subject?: PageSubject): string | undefined {
  if (!subject) return undefined;
  if (subject.type !== "Person" && subject.type !== "Organization") return undefined;
  return subject.name.toLowerCase() === keyword.toLowerCase() ? subject.name : undefined;
}

/**
 * A name sitting inside a longer keyword is capitalised too.
 *
 * properName only fires when the whole keyword is the entity, which covers
 * "del close" and misses "anne bogart viewpoints" — that rendered as "Anne
 * bogart viewpoints", a surname in lower case, in the footer of every page and
 * in the related-guides block of eleven more.
 *
 * author-entities.ts already holds the verified spelling of every person this
 * site names, each one checked against the Wikipedia API before it was added.
 * Six keywords across four guides contain one: del close, anne bogart
 * viewpoints, viola spolin, viola spolin theatre games, keith johnstone improv,
 * viola spolin games. Reusing that list is not a repurposing so much as the
 * only place the correct spellings are written down.
 *
 * Matching is whole-word, so a name can never be found inside a longer one.
 */
function capitaliseKnownNames(keyword: string): string {
  let result = keyword;
  for (const name of Object.keys(AUTHOR_SAMEAS)) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(`\\b${escaped}\\b`, "gi"), name);
  }
  return result;
}

/**
 * The finished label: the right keyword, capitalised the right way.
 *
 * Returns undefined when a guide declares no keywords, so a caller can fall
 * back to the page title rather than render an empty link.
 *
 * `pageText` is the guide's title and markdown body, title first on its own
 * line — the shape every caller builds; with it the label is a phrase the
 * page contains (see anchorKeyword), spelled the way the title spells it
 * (see pageSpelling). Every caller has the bridge in hand, so every caller
 * should pass it.
 */
export function anchorLabel(
  keywords: BridgeTargetKeyword[],
  subject?: PageSubject,
  pageText?: string,
): string | undefined {
  const head = anchorKeyword(keywords, pageText);
  if (!head) return undefined;
  // The page's own declared entity wins outright where it is the whole keyword.
  const name = properName(head.keyword, subject);
  if (name) return name;
  const title = pageText?.split("\n", 1)[0] ?? "";
  return titleCase(capitaliseKnownNames(pageSpelling(head.keyword, title)));
}
