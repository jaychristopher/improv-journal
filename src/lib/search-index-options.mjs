/**
 * The one MiniSearch configuration, read by the builder and the loader.
 *
 * Plain JavaScript because `src/lib/search-index.ts` is bundled for the
 * browser and `scripts/build-search-index.mjs` runs under node; a file both
 * can import is the only way to have one field list. Since 2026-09-22 it
 * reads one TypeScript table (`SPELLING_PAIRS`, below), so the builder loads
 * it through jiti — the loader it already uses for the atom graph — rather
 * than natively. The path is the same; the parity test checks the path.
 *
 * Why one list matters. The builder indexed `aliases` from 2026-08-27 so that
 * "Who/What/Where" or "Tag-out" would find the atoms that declare them, and
 * the loader kept its own copy of the options with three fields. MiniSearch
 * only scores the fields the *loading* options name, so the alias postings
 * sat in public/search-index.json for three weeks and were never consulted:
 * "task saturation" returned Small Talk, Gorilla Theatre and Flow, not
 * Cognitive Bandwidth. The fix was recorded in a comment beside code that did
 * not do it. Now there is nothing to keep in sync.
 *
 * `MiniSearch.loadJSON` needs the same fields it was built with, in the same
 * order, so do not reorder these without rebuilding the index.
 *
 * `problem` (2026-09-22) is a guide's `primary_problem`: the reader's problem
 * in the reader's words ("you open with something fine and the conversation
 * is dead within thirty seconds"). Until now it rendered only on the CTA card
 * at the foot of the guide, shared no content word with the description, and
 * was in no index, so a reader who typed their problem as the site itself
 * phrases it found nothing (novel-insights 291). Only guides carry it; every
 * other document leaves the field empty. See the builder for the source.
 *
 * `keyword` (2026-09-22, appended) is a guide's primary keyword, the phrase
 * it was written to rank for. Seven guides did not come first in site
 * search for their own primary keyword, and on five of them the page that
 * outranked the guide was a concept or a reference whose title *is* the
 * keyword — "yes and improv" returned the Yes, And technique, "how to be
 * present" the Be Present principle, "psychological safety" Edmondson's
 * paper — because the title boost is 3 and a concept's title is the phrase
 * while the guide's is a sentence (novel-insights 316). A field only guides
 * fill lets a query that is a guide's keyword reach the guide on a field
 * the concept does not have, while a query that is a concept's title still
 * returns the concept. Only guides fill it. See the builder for the source.
 *
 * `sections` (2026-09-22, appended) is every h2 and h3 of a document with the
 * first sentence beneath it. Until it existed the index held the first 500
 * characters of each page and nothing else — 3.1% of a guide, 7.0% of the
 * corpus — so the 342 questions the guides ask in the reader's own words and
 * answer in 42,497 words were outside it on all 78, and not one guide's first
 * question heading fell inside the window (novel-insights 337). It is also
 * the only field whose stored half is addressable: the builder stores an
 * `{ id, heading }` anchor per section so a result that matched here can be
 * sent to `/slug#section-id` rather than to the top of the page.
 */

import { SPELLING_PAIRS } from "./anchor-text";

/**
 * British spelling → American, one whole word at a time.
 *
 * The corpus has no house spelling (tracker entry 279), and MiniSearch's
 * `fuzzy: 0.2` allows one edit at seven letters while *theatre* → *theater*
 * is a transposition, two edits under the Levenshtein distance it uses; nor
 * is either a prefix of the other. So the two spellings were two terms: the
 * index held 31 documents that spelt it only the British way and 44 only
 * the American, and the guide that targets "theater games" ranked eighth
 * for that query and first for "theatre games" (tracker entry 311). The
 * one-edit pairs (*behaviour*, *judgement*) were only partly served: fuzzy
 * matching reaches the other spelling but scores it lower, so the two
 * queries returned different sets in a different order.
 *
 * Every term passes through this at index time and at query time — the
 * same function, from the same options object, in the builder and the
 * loader — so a document's spelling and a reader's spelling meet at one
 * term whichever side each is on.
 *
 * American is the canonical side because it is the larger one everywhere
 * the site is measured against: 44 American-only documents to 31 British
 * in the index, the Ahrefs keyword table and its `parent` topics ("theater
 * games") spell American, and a dialect twin never changes what the term
 * means. The choice is invisible to a reader typing a query; it shows only
 * in `autoSuggest`, whose suggestions are index terms, so a reader who types
 * "theatr" is offered "theater". The pairs are anchor-text.ts's table — each
 * inflection its own whole-word entry, and the ambiguous pairs it declines
 * (practise/practice, licence/license, metre/meter) declined here too, for
 * the reason it gives.
 */
const AMERICAN_SPELLING = new Map(SPELLING_PAIRS);

/**
 * @param {string} term a whole, lower-cased term
 * @returns {string} the American spelling where the term is a British one
 *   from `SPELLING_PAIRS`, otherwise the term unchanged
 */
export function normaliseDialect(term) {
  return AMERICAN_SPELLING.get(term) ?? term;
}

export const MINISEARCH_OPTIONS = {
  fields: ["title", "aliases", "body", "tags", "problem", "keyword", "sections"],
  storeFields: ["title", "url", "layer", "type", "docId", "links", "sections"],
  // MiniSearch's default processTerm lower-cases; this keeps that and folds
  // the dialect on top. It applies to indexed fields and to queries alike
  // (searchOptions declares no processTerm of its own, so search falls back
  // to this one), which is the only way the two sides can meet.
  /** @param {string} term */
  processTerm: (term) => normaliseDialect(term.toLowerCase()),
  searchOptions: {
    // An alias is a name for the thing, so it outranks a body mention, but
    // the title is still the name the site chose. The problem sentence sits
    // between them: it is what the guide was written to answer, in the words
    // a reader types, but the title is still the name.
    //
    // The keyword's boost is small because the field is sparse, and a boost
    // is not comparable across fields of different density. MiniSearch
    // scores a term by BM25 within its field, with the inverse document
    // frequency taken over every document in the index and the average
    // field length over every document too; 78 guides fill `keyword` and
    // 289 documents leave it empty, so a term found there is rare by
    // construction and its score per term is a few times a title's before
    // any boost. Measured 2026-09-22, sweeping the boost on one built index:
    // at 3.5, the value that reads as "above the title", 77 of 78 guides
    // came first for their keyword and thirteen one-word concept titles
    // went to their guide ("Trust", "Warm-Up", "Viewpoints", "Be Present");
    // at 1, the same 77 and eight lost concepts; at 0.55, 76 guides and no
    // concept lost against the 202 of 205 the index returned before the
    // field existed. The two not first are not twins: "how to stop
    // overthinking" is beaten by its relationship sibling and "improv warm
    // up games" by the games hub. Above 0.56 the guide whose title says
    // "trust" twice takes the query "Trust" from the concept, so the value
    // is a window and not a slope; search-names.test.ts holds both counts.
    //
    // `sections` is 0.4. The entry that asked for the field proposed a boost
    // between `body` and `problem`; measurement put it below `body`, and the
    // reason is worth keeping. Swept on one built index 2026-09-22 against
    // the 342 question headings the guides ask (each query the heading
    // verbatim, the target its own guide), the 78 primary keywords, the 205
    // concept titles and the hub readings search-names.test.ts holds:
    //
    //   field absent   117 questions return their own guide first, 153 top 3
    //   0.4            189 first, 245 top 3 — /listen slips to #3 for "Listen"
    //   0.5            204 first, 251 — and Organic Opening loses its title
    //   0.8            222 first, 267 — /listen #4, /traditions #2 as well
    //   0.85           224 first, 268 — and "Viewpoints" goes to the guide,
    //                  the exact trade the `keyword` field undid (entry 316)
    //   2.0            262 first, 304 — 3 guides lose their own keyword too
    //
    // 0.4 is the largest value at which no reading already recorded gets
    // worse except one: the listen hub, which "Listen" returned second behind
    // the active-listening guide and now returns third behind two guides
    // about listening. Two get better — 77 of 78 guides come first for their
    // primary keyword where 76 did, /improv-warm-up-games having taken its
    // own keyword back from the games hub — and the concept layer holds at
    // 202 of 205 with the same three residue ids. Above 0.5 each further step
    // buys questions by handing a named page's own title to a page whose
    // heading merely repeats it, which is the trade this file has twice
    // refused. search-names.test.ts holds the hub, keyword and concept
    // counts; search-depth.test.ts holds the question reach.
    boost: { title: 3, problem: 2.5, aliases: 2, sections: 0.4, keyword: 0.55 },
    fuzzy: 0.2,
    prefix: true,
  },
};
