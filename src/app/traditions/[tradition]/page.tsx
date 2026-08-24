import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/Breadcrumb";
import {
  extractCounterPositions,
  getAtomsForTradition,
  getAtomUrl,
  getTraditionNames,
} from "@/lib/content";
import { ogImages, pageTitle, SITE_NAME } from "@/lib/seo";

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
    keyTexts: string[];
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
    keyTexts: ["Impro (1979)", "Impro for Storytellers (1999)"],
    orientation: [
      "The claim underneath everything Johnstone taught is that imagination is not a gift some people were issued. It is a capacity most people had trained out of them by an education that rewarded the correct answer, and the job of a teacher is to remove the inhibition rather than to install a skill.",
      "That is why status does so much work here. It gave improvisers something concrete and physical to play at a moment when the alternative instruction was to be interesting, and it turned scene work into something observable — who is taking up space, who is apologising, which way the seesaw is tipping.",
      "Where it strains is comedy structure. Johnstone is superb on why a scene is alive and comparatively uninterested in why it is funny, and groups raised purely on this material tend to produce work that is truthful, well-observed and slightly shapeless.",
    ],
  },
  spolin: {
    label: "Viola Spolin",
    desc: "Present-moment awareness. The body as primary instrument. Point of Concentration.",
    meta: "Viola Spolin's improv: present-moment awareness, the body as the primary instrument, and Point of Concentration. Improvisation for the Theater, 1963.",
    keyTexts: ["Improvisation for the Theater (1963)"],
    orientation: [
      "Spolin's route in is attention, and the mechanism is the Point of Concentration — a single thing to attend to that is narrow enough to occupy the part of you that would otherwise be watching yourself perform. Solve the problem and the behaviour she wanted arrives as a side effect.",
      "The school is unusual in treating the teacher as part of the mechanism rather than as somebody who explains and then withdraws. A game is set, a problem is named, and the adjustments happen live while it runs — which is why so much of the material reads as instructions to a person standing at the side of the room.",
      "Its blind spot is performance. Spolin was solving for participation and transfer, not for an audience, so the school has almost nothing to say about how a show is shaped or why one scene is funnier than another — which is precisely the gap the Chicago schools grew into.",
    ],
  },
  close: {
    label: "Del Close & Charna Halpern",
    desc: "Group mind. Connections across scenes. The Harold as spiritual endeavor.",
    meta: "Del Close and Charna Halpern's improv: group mind, connections carried across scenes, and the Harold as a spiritual endeavor. Truth in Comedy, 1994.",
    keyTexts: ["Truth in Comedy (1994)"],
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
    keyTexts: ["UCB Comedy Improvisation Manual (2013)", "Will Hines Substack"],
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
    keyTexts: ["Improvise (Napier, 2004)", "Speed of Life (TJ & Dave, 2015)"],
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

  const atoms = await getAtomsForTradition(tradition);

  // Extract counter-positions that mention this tradition
  const disagreements: {
    atomTitle: string;
    atomUrl: string;
    text: string;
  }[] = [];
  for (const a of atoms) {
    const cps = extractCounterPositions(a.content);
    for (const cp of cps) {
      if (cp.text.length > 20) {
        disagreements.push({
          atomTitle: a.frontmatter.title,
          atomUrl: getAtomUrl({
            id: a.frontmatter.id,
            type: a.frontmatter.type,
          }),
          text:
            cp.text.length > 200
              ? cp.text.substring(0, 200).replace(/\s+\S*$/, "") + "..."
              : cp.text,
        });
      }
    }
  }

  // Group by type
  const byType = new Map<string, typeof atoms>();
  for (const a of atoms) {
    const t = a.frontmatter.type;
    if (!byType.has(t)) byType.set(t, []);
    byType.get(t)!.push(a);
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
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
        <p className="text-foreground/60 mt-2">{info.desc}</p>
        {info.orientation.map((paragraph) => (
          <p key={paragraph.slice(0, 40)} className="text-foreground/70 mt-4">
            {paragraph}
          </p>
        ))}
        <p className="text-foreground/40 mt-6 text-xs">Key texts: {info.keyTexts.join(" · ")}</p>
        {info.guide && (
          <p className="mt-4 text-sm">
            <Link href={info.guide.href} className="underline">
              {info.guide.label}
            </Link>
          </p>
        )}
      </header>

      {/* Disagreements — the unique value */}
      {disagreements.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-4 text-lg font-semibold">Where this tradition pushes back</h2>
          <div className="space-y-4">
            {disagreements.slice(0, 8).map((d, i) => (
              <div key={i} className="border-foreground/10 border-l-2 pl-4">
                <p className="text-foreground/70 text-sm">{d.text}</p>
                <Link
                  href={d.atomUrl}
                  className="text-foreground/40 hover:text-foreground/60 mt-1 inline-block text-xs"
                >
                  from {d.atomTitle} &rarr;
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Concepts that cite this tradition */}
      <section>
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
    </main>
  );
}
