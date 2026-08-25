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
 * rejects the ones that belong to another topic. Falls back to the primary.
 */
export function anchorKeyword(keywords: BridgeTargetKeyword[]): BridgeTargetKeyword | undefined {
  const primary = keywords[0];
  if (!primary) return undefined;
  const sameTopic = keywords.filter((k) => !primary.parent || k.parent === primary.parent);
  return [...(sameTopic.length > 0 ? sameTopic : [primary])].sort((a, b) => b.volume - a.volume)[0];
}

function titleCase(keyword: string): string {
  return keyword.charAt(0).toUpperCase() + keyword.slice(1);
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
 * is not aiming for — theatre-games keeps the deliberate "Theater games", which
 * is the higher-volume variant and not what its subject is called.
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
 */
export function anchorLabel(
  keywords: BridgeTargetKeyword[],
  subject?: PageSubject,
): string | undefined {
  const head = anchorKeyword(keywords);
  if (!head) return undefined;
  // The page's own declared entity wins outright where it is the whole keyword.
  return properName(head.keyword, subject) ?? titleCase(capitaliseKnownNames(head.keyword));
}
