import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArticleJsonLd } from "@/components/ArticleJsonLd";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Prose } from "@/components/Prose";
import { TraditionCurriculum } from "@/components/TraditionCurriculum";
import { getAtomsForTradition, getAtomUrl, getTraditionNames, loadAtoms } from "@/lib/content";
import { ogImages, pageTitle, SITE_NAME } from "@/lib/seo";
import { curriculumFor } from "@/lib/tradition-curriculum";
import {
  type Disagreement,
  sortDisagreements,
  splitTraditionMembers,
} from "@/lib/tradition-disagreements";
import {
  guidesDrawingOn,
  TRADITION_IDS,
  type TraditionGuide,
  type TraditionId,
} from "@/lib/tradition-guides";
import { TRADITION_SUBJECTS } from "@/lib/tradition-subjects";
import { type TraditionText, traditionTexts } from "@/lib/tradition-texts";

/**
 * How many guides the block shows before folding. Twelve is the sidebar's
 * per-group budget too; Johnstone is drawn on by 29 guides and a list that
 * long above the concepts would push the page's own material below the fold.
 */
const GUIDES_SHOWN = 12;

// `desc` is the visible tagline and is deliberately terse. `meta` is the search
// snippet, which has 158 characters to spend and was spending fifty.
//
// `guide` points at the full guide for a tradition where one exists. These
// pages are assembled from atom metadata and are thin on their own — Search
// Console had /traditions/close ranking for "del close improv" on a page that
// is mostly navigation. The link hands that intent to the page written for it
// rather than leaving the two to compete.
const TRADITION_INFO: Record<
  string,
  {
    label: string;
    desc: string;
    meta: string;
    guide?: { href: string; label: string };
    /**
     * What the school actually argues, what it was arguing against, and where
     * it fails. The note above records that these pages are thin and mostly
     * navigation; adding a guide link handed the intent away for `close` and
     * left the other four with nothing of their own. A comparative account of
     * the five schools is the most distinctive thing on this site and it was
     * the one page class with none of it written down.
     */
    orientation: string[];
  }
> = {
  johnstone: {
    label: "Keith Johnstone",
    desc: "Story-first. Status as the engine. Spontaneity through surrender.",
    meta: "Keith Johnstone's improv: story first, status as the engine of every scene, and spontaneity reached by surrender rather than effort. Impro, 1979.",
    orientation: [
      "The claim underneath everything Johnstone taught is that imagination is not a gift some people were issued. It is a capacity most people had trained out of them by an education that rewarded the correct answer, and the job of a teacher is to remove the inhibition rather than to install a skill.",
      "That is why status does so much work here. It gave improvisers something concrete and physical to play at a moment when the alternative instruction was to be interesting, and it turned scene work into something observable — who is taking up space, who is apologising, which way the seesaw is tipping.",
      "Where it strains is comedy structure. Johnstone is superb on why a scene is alive and comparatively uninterested in why it is funny, and groups raised purely on this material tend to produce work that is truthful, well-observed and slightly shapeless.",
    ],
  },
  /**
   * The same handoff as `close`, and the more clear-cut of the two: title and
   * h1 were both exactly "Viola Spolin", which is the primary keyword
   * /viola-spolin targets at 800 a month. An exact duplicate of another page's
   * head term is the strongest possible signal that the two are the same
   * page, and the thin one wins those often enough to matter.
   *
   * Named after the mechanism rather than an institution, because unlike iO
   * there is not one — Spolin's method reached people through Second City and
   * through her own books rather than through a theatre she ran. Point of
   * Concentration is hers, is what the school actually turns on, and is
   * targeted by no page here. "Theater games" was the other candidate and is
   * ruled out: /theatre-games targets it at 1,900, so that rename would have
   * moved the collision rather than ended it.
   */
  spolin: {
    label: "Spolin and the Point of Concentration",
    desc: "Present-moment awareness. The body as primary instrument. Point of Concentration.",
    meta: "Spolin's improv: present-moment awareness, the body as the primary instrument, and the Point of Concentration. Improvisation for the Theater, 1963.",
    guide: { href: "/viola-spolin", label: "Viola Spolin: the woman who invented theater games" },
    orientation: [
      "Spolin's route in is attention, and the mechanism is the Point of Concentration — a single thing to attend to that is narrow enough to occupy the part of you that would otherwise be watching yourself perform. Solve the problem and the behaviour she wanted arrives as a side effect.",
      "The school is unusual in treating the teacher as part of the mechanism rather than as somebody who explains and then withdraws. A game is set, a problem is named, and the adjustments happen live while it runs — which is why so much of the material reads as instructions to a person standing at the side of the room.",
      "Its blind spot is performance. Spolin was solving for participation and transfer, not for an audience, so the school has almost nothing to say about how a show is shaped or why one scene is funnier than another — which is precisely the gap the Chicago schools grew into.",
    ],
  },
  /**
   * Named for the school rather than the man, and that is the whole point of
   * the rename. The note above records that Search Console had this page
   * ranking for "del close improv"; the guide link was added then, and it was
   * not enough. The title, the h1 and the meta description all still opened
   * with his name, so the page went on claiming the term it was supposed to be
   * handing over — and /del-close targets "del close" at 2,000 a month with a
   * SERP whose weakest top-ten page is DR 2, which makes it the most winnable
   * volume on this site and much too valuable to split.
   *
   * iO is the theatre Halpern founded and Close joined, so the school has an
   * institution to be named after in a way the Johnstone and Spolin pages do
   * not. Both names stay in the body, where they belong.
   */
  close: {
    label: "iO and the Harold",
    desc: "Group mind. Connections across scenes. The Harold as spiritual endeavor.",
    meta: "The iO school of improv: group mind, connections carried across scenes, and the Harold as a spiritual endeavor. Built by Charna Halpern and Del Close.",
    guide: { href: "/del-close", label: "Del Close: the ideas that still run improv" },
    orientation: [
      "The Harold's actual argument is that a show can be one thing rather than a sequence of bits. Material established in the first three minutes returns in the twentieth changed, and the audience's pleasure comes from recognising a pattern nobody planned — which is why the group has to function as a single perceiving unit rather than as skilled individuals taking turns.",
      "Its opponent is invisible now, and that is worth knowing. This school formed against Second City's revue tradition, where improvisation was a tool for generating sketches that would then be written and performed. Nearly every insistence in it — ensemble over star, form over bit, truth over joke — is a position taken against that.",
      "Its weakest inheritance is a phrase. There are no mistakes, in the sense the book meant it, is a claim that anything can be justified after the fact, so nothing has to be treated as failure in the moment. Detached from that it has become permission for a great deal of unexamined work.",
    ],
  },
  ucb: {
    label: "Upright Citizens Brigade",
    desc: "Game-first. Pattern recognition and heightening. Comedy as the goal.",
    meta: "The UCB school of improv: game first, pattern recognition and heightening, and comedy as the explicit goal. From the UCB Comedy Improvisation Manual.",
    orientation: [
      "UCB's contribution is that it made improv teachable at scale. Where the schools before it described what good scenes have in common and trusted you to absorb it, this one supplies a procedure — find the first unusual thing, establish what is normal so the unusual has something to be unusual against, then ask what else would be true if this were.",
      "That precision is why its vocabulary is now close to a lingua franca. Knowing what somebody means by the game of the scene is table stakes in most rooms on either side of the Atlantic, and a performer who has read three books of improv philosophy and still cannot start a scene will get more from this material in an afternoon.",
      "The failure mode is the direct cost of the same virtue. A procedure invites you to run it, and analytical game-hunting produces scenes that are technically correct and completely dead. It is also a house style presented as a general theory: game is one thing a scene can be built around, and relationship, character and narrative are others it is not much interested in.",
    ],
  },
  annoyance: {
    label: "Annoyance Theatre / TJ & Dave",
    desc: "Commitment-first. Honest behavior. Trust the relationship.",
    meta: "The Annoyance and TJ & Dave: commitment first, honest behavior ahead of cleverness, and trusting the relationship. Napier's Improvise, 2004.",
    orientation: [
      "This is the corrective school. Its argument is that the rules improv teaches — do not deny, support your partner, stay in the moment — are individually reasonable and collectively paralysing, because a performer running seven checks cannot also be present. Napier's replacement is short enough to use under pressure: do something, notice what you did, commit to it.",
      "TJ and Dave arrive at a similar place from the other direction. They take no suggestion, run an hour with no conventional edits, and treat the relationship between the two people on stage as the only material there is — which makes listening a complete method rather than a slogan, because with no suggestion and no edit there is nothing else to work from.",
      "It is a corrective rather than a foundation, and that distinction matters. Take care of yourself first is aimed at support practised as deference, and a beginner who adopts it without the discipline it is telling them to loosen becomes exactly the player everybody dreads. This school works on people who already have the training it is arguing with.",
    ],
  },
};

export async function generateStaticParams() {
  return getTraditionNames().map((tradition) => ({ tradition }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tradition: string }>;
}): Promise<Metadata> {
  const { tradition } = await params;
  const info = TRADITION_INFO[tradition];
  if (!info) return {};
  return {
    title: pageTitle(info.label),
    description: info.meta,
    alternates: { canonical: `/traditions/${tradition}` },
    openGraph: {
      siteName: SITE_NAME,
      locale: "en_US",
      title: info.label,
      description: info.meta,
      url: `/traditions/${tradition}`,
      type: "article",
      images: ogImages(info.label, "Tradition"),
    },
  };
}

export default async function TraditionPage({
  params,
}: {
  params: Promise<{ tradition: string }>;
}) {
  const { tradition } = await params;
  const info = TRADITION_INFO[tradition];
  if (!info) notFound();

  // Membership is any link to the tradition's references, and until
  // 2026-09-21 the page listed every member as a concept "citing" it. An atom
  // whose only edge is `contrasts` is arguing with the tradition, not drawing
  // on it — ten of Annoyance's 36 were the UCB game apparatus, shown as its
  // concepts beneath a section quoting Napier's objections to them (tracker
  // entry 58). The two groups render apart, and only the informed group
  // counts as "its concepts" for the objections below.
  const { informed: atoms, contested } = splitTraditionMembers(
    tradition,
    await getAtomsForTradition(tradition),
  );

  // Counter-positions, sorted by whose objection each one is. The label in
  // `**Counter-position (Napier):**` names the objector; an unlabelled one
  // belongs to whichever traditions the host atom cites. Before 2026-09-21
  // every counter-position on every member atom was shown here as this
  // tradition's pushback, so the UCB page carried fourteen objections by
  // Napier, Johnstone and TJ & Dave and none of its own (tracker entry 191).
  const allAtoms = await loadAtoms();
  const { pushback, objections } = sortDisagreements(tradition, allAtoms, atoms);

  // The guides whose prose names this school's founder. Until 2026-09-22 the
  // page read the atoms and the library and never the bridges, so the layer
  // that receives search traffic and the layer that says where the ideas come
  // from were one click from each other in neither direction (tracker entry
  // 271). Ordered by reach as the topic hubs are.
  const guides = TRADITION_IDS.includes(tradition as TraditionId)
    ? await guidesDrawingOn(tradition as TraditionId)
    : [];

  // The works the school is defined by: the same reference ids
  // `getAtomsForTradition` walks to when it decides which concepts are this
  // tradition's. Until 2026-09-22 the page rendered everything computed from
  // those works and never the works, so it carried 0 links to the library
  // while every one of the books linked back here (tracker entry 288). The
  // header's "Key texts" line was plain text naming the same books; the
  // block replaces it with the links.
  const texts = await traditionTexts(tradition);

  // The lessons and paths where this school's concepts outnumber every
  // other's by a margin. Until 2026-09-22 the page read the concepts, the
  // objections, the books and the guides and never the curriculum, though
  // the curriculum is the layer with a slope: the beginner paths are Close,
  // Johnstone and Spolin and the performer paths UCB and Close (tracker
  // entry 330). Empty for a school that leads nowhere, and the block stays
  // off the page.
  const curriculum = TRADITION_IDS.includes(tradition as TraditionId)
    ? await curriculumFor(tradition as TraditionId)
    : { lessons: [], paths: [] };

  // Group by type
  const byType = new Map<string, typeof atoms>();
  for (const a of atoms) {
    const t = a.frontmatter.type;
    if (!byType.has(t)) byType.set(t, []);
    byType.get(t)!.push(a);
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      {/* These pages carried no structured data at all, while being the
          ones a query like "del close improv" actually lands on. */}
      <ArticleJsonLd
        title={info.label}
        description={info.meta}
        url={`/traditions/${tradition}`}
        eyebrow="Tradition"
        subject={TRADITION_SUBJECTS[tradition]}
        // The school as its texts, machine-readably: the works by the `#work`
        // ids their library pages declare, the way a concept's Article cites them.
        citation={texts.flatMap((t) => (t.citation ? [t.citation] : []))}
      />
      <Breadcrumb
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Traditions", href: "/traditions" },
          { label: info.label },
        ]}
      />

      <header className="mb-12">
        <span className="text-foreground/40 text-xs tracking-wider uppercase">tradition</span>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{info.label}</h1>
        <Prose
          text={info.desc}
          currentUrl={`/traditions/${tradition}`}
          className="text-foreground/60 mt-2"
        />
        {info.orientation.map((paragraph) => (
          <Prose
            text={paragraph}
            currentUrl={`/traditions/${tradition}`}
            className="text-foreground/70 mt-4"
            key={paragraph.slice(0, 40)}
          />
        ))}
        {info.guide && (
          <p className="mt-4 text-sm" data-track="tradition-guide" data-derived="true">
            <Link href={info.guide.href} className="underline">
              {info.guide.label}
            </Link>
          </p>
        )}
      </header>

      {/* The texts: the definition the code uses, shown before what it computes */}
      {texts.length > 0 && (
        <section className="mb-12" data-track="tradition-texts" data-derived="true">
          <h2 className="mb-1 text-lg font-semibold">
            The texts
            <span className="text-foreground/40 ml-2 font-normal">({texts.length})</span>
          </h2>
          <Prose
            text="The works that define the school here: a concept is this tradition's when it cites one of them."
            currentUrl={`/traditions/${tradition}`}
            className="text-foreground/50 mb-4 text-sm"
          />
          <TextList texts={texts} />
        </section>
      )}

      {/* Disagreements — the unique value */}
      {pushback.length > 0 && (
        <section className="mb-12" data-track="pushback" data-derived="true">
          <h2 className="mb-4 text-lg font-semibold">Where this tradition pushes back</h2>
          <DisagreementList items={pushback} />
        </section>
      )}
      {objections.length > 0 && (
        <section className="mb-12" data-track="objections" data-derived="true">
          <h2 className="mb-1 text-lg font-semibold">Objections raised on its concepts</h2>
          <Prose
            text="Counter-positions from other schools, recorded on concepts this tradition informs."
            currentUrl={`/traditions/${tradition}`}
            className="text-foreground/50 mb-4 text-sm"
          />
          <DisagreementList items={objections} />
        </section>
      )}

      {guides.length > 0 && (
        <section className="mb-12" data-track="tradition-guides" data-derived="true">
          <h2 className="mb-1 text-lg font-semibold">
            Guides that draw on this tradition
            <span className="text-foreground/40 ml-2 font-normal">({guides.length})</span>
          </h2>
          <Prose
            text="Guides that name this school's founder or link this page: the pages readers arrive on, citing a lineage they rarely name."
            currentUrl={`/traditions/${tradition}`}
            className="text-foreground/50 mb-4 text-sm"
          />
          <GuideList guides={guides.slice(0, GUIDES_SHOWN)} />
          {guides.length > GUIDES_SHOWN && (
            <details className="group mt-3">
              <summary className="text-foreground/40 hover:text-foreground/60 cursor-pointer list-none text-xs">
                <span className="group-open:hidden">{`+${guides.length - GUIDES_SHOWN} more →`}</span>
                <span className="hidden group-open:inline">Show fewer</span>
              </summary>
              <div className="mt-3">
                <GuideList guides={guides.slice(GUIDES_SHOWN)} />
              </div>
            </details>
          )}
        </section>
      )}

      <TraditionCurriculum curriculum={curriculum} currentUrl={"/traditions/" + tradition} />

      {/* Concepts that cite this tradition */}
      <section data-track="tradition-concepts" data-derived="true">
        <h2 className="mb-4 text-lg font-semibold">
          Concepts citing this tradition
          <span className="text-foreground/40 ml-2 font-normal">({atoms.length})</span>
        </h2>
        {Array.from(byType.entries())
          .sort((a, b) => b[1].length - a[1].length)
          .map(([type, typeAtoms]) => (
            <div key={type} className="mb-6">
              <h3 className="text-foreground/30 mb-2 text-xs capitalize">
                {type}s ({typeAtoms.length})
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {typeAtoms.map((a) => (
                  <Link
                    key={a.frontmatter.id}
                    href={getAtomUrl({
                      id: a.frontmatter.id,
                      type: a.frontmatter.type,
                    })}
                    className="border-foreground/10 bg-surface hover:border-foreground/30 rounded-lg border p-3 transition-colors"
                  >
                    <span className="text-sm font-medium">{a.frontmatter.title}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
      </section>

      {contested.length > 0 && (
        <section className="mt-12" data-track="contested-concepts" data-derived="true">
          <h2 className="mb-1 text-lg font-semibold">
            Concepts this tradition argues with
            <span className="text-foreground/40 ml-2 font-normal">({contested.length})</span>
          </h2>
          <Prose
            text="Linked to this tradition only as a contrast: ideas it argues with rather than informs."
            currentUrl={`/traditions/${tradition}`}
            className="text-foreground/50 mb-4 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            {contested.map((a) => (
              <Link
                key={a.frontmatter.id}
                href={getAtomUrl({
                  id: a.frontmatter.id,
                  type: a.frontmatter.type,
                })}
                className="border-foreground/10 bg-surface hover:border-foreground/30 rounded-lg border p-3 transition-colors"
              >
                <span className="text-sm font-medium">{a.frontmatter.title}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function TextList({ texts }: { texts: TraditionText[] }) {
  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {texts.map((text) => (
        <li key={text.id}>
          <Link
            href={text.url}
            className="border-foreground/10 bg-surface hover:border-foreground/30 block rounded-lg border p-3 transition-colors"
          >
            <span className="text-sm font-medium">{text.title}</span>
            {(text.authors.length > 0 || text.year) && (
              <span className="text-foreground/50 mt-1 block text-xs">
                {[text.authors.join(", "), text.year].filter(Boolean).join(" · ")}
              </span>
            )}
            {text.citedBy > 0 && (
              <span className="text-foreground/40 mt-1 block text-xs">
                cited by {text.citedBy} concept{text.citedBy === 1 ? "" : "s"}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function GuideList({ guides }: { guides: TraditionGuide[] }) {
  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {guides.map((guide) => (
        <li key={guide.slug}>
          <Link
            href={`/${guide.slug}`}
            className="border-foreground/10 bg-surface hover:border-foreground/30 block rounded-lg border p-3 transition-colors"
          >
            <span className="text-sm font-medium">{guide.title}</span>
            {guide.mentions > 1 && (
              <span className="text-foreground/40 ml-2 text-xs">cited {guide.mentions} times</span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function DisagreementList({ items }: { items: Disagreement[] }) {
  return (
    <div className="space-y-4">
      {items.slice(0, 8).map((d, i) => (
        <div key={i} className="border-foreground/10 border-l-2 pl-4">
          <p className="text-foreground/70 text-sm">
            {d.label && <span className="text-foreground/40">{d.label}: </span>}
            {d.text}
          </p>
          <Link
            href={d.atomUrl}
            className="text-foreground/40 hover:text-foreground/60 mt-1 inline-block text-xs"
          >
            from {d.atomTitle} &rarr;
          </Link>
        </div>
      ))}
    </div>
  );
}
