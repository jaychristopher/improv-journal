import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArticleJsonLd } from "@/components/ArticleJsonLd";
import { AudioPlayer } from "@/components/AudioPlayer";
import { Breadcrumb } from "@/components/Breadcrumb";
import { LevelRedirect } from "@/components/LevelRedirect";
import { PodcastJsonLd } from "@/components/PodcastJsonLd";
import { WhatsNext } from "@/components/WhatsNext";
import { getAudioDuration } from "@/lib/audio-manifest";
import {
  getAtomBySlug,
  getAtomUrl,
  getAudioUrl,
  getBridgeBySlug,
  getPathBySlug,
  getThreadBySlug,
  loadBridges,
} from "@/lib/content";
import type { BridgeFrontmatter } from "@/lib/schema";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const bridge = await getBridgeBySlug(slug);
  if (!bridge) return {};

  const fm = bridge.frontmatter;
  return {
    title: fm.title,
    description: fm.description,
    keywords: fm.target_keywords?.map((keyword: { keyword: string }) => keyword.keyword),
    alternates: { canonical: `/${slug}` },
    openGraph: { title: fm.title, description: fm.description, url: `/${slug}`, type: "article" },
  };
}

export async function generateStaticParams() {
  const bridges = await loadBridges();
  return bridges.map((bridge) => ({ slug: bridge.slug }));
}

const BRIDGE_RELATIONS: Record<
  string,
  {
    exercises: string[];
    threads: { id: string; label: string }[];
    otherGuides: { slug: string; label: string }[];
  }
> = {
  "how-to-stop-overthinking": {
    exercises: ["mirroring", "one-word-scene", "blind-offer"],
    threads: [
      { id: "quieting-the-planning-mind", label: "Quieting the Planning Mind" },
      { id: "the-system-underneath", label: "The System Underneath" },
    ],
    otherGuides: [
      { slug: "active-listening", label: "Active Listening" },
      { slug: "stage-fright", label: "Stage Fright Is Not Your Enemy" },
      { slug: "how-to-be-funny", label: "How to Be Funny" },
    ],
  },
  "psychological-safety": {
    exercises: ["mirroring", "gift-giving", "last-word-response"],
    threads: [{ id: "physics-of-every-room", label: "The Physics of Every Room" }],
    otherGuides: [
      { slug: "active-listening", label: "Active Listening" },
      { slug: "how-to-stop-overthinking", label: "How to Stop Overthinking" },
    ],
  },
  "active-listening": {
    exercises: ["last-word-response", "mirroring", "one-word-scene"],
    threads: [
      { id: "building-on-offers", label: "Building on Offers" },
      { id: "quieting-the-planning-mind", label: "Quieting the Planning Mind" },
    ],
    otherGuides: [
      { slug: "psychological-safety", label: "Psychological Safety" },
      { slug: "how-to-stop-overthinking", label: "How to Stop Overthinking" },
    ],
  },
  "how-to-be-funny": {
    exercises: ["one-word-scene", "emotional-honesty-scene", "first-line-drill"],
    threads: [{ id: "the-game-beneath-the-game", label: "The Game Beneath the Game" }],
    otherGuides: [
      { slug: "active-listening", label: "Active Listening" },
      { slug: "stage-fright", label: "Stage Fright Is Not Your Enemy" },
    ],
  },
  "stage-fright": {
    exercises: ["mirroring", "group-mind-cultivation"],
    threads: [{ id: "the-performers-edge", label: "The Performer's Edge" }],
    otherGuides: [
      { slug: "how-to-stop-overthinking", label: "How to Stop Overthinking" },
      { slug: "psychological-safety", label: "Psychological Safety" },
    ],
  },
  "team-building-activities": {
    exercises: ["mirroring", "gift-giving", "one-word-scene", "yes-and-chain"],
    threads: [{ id: "the-inner-game-expanded", label: "The Inner Game Expanded" }],
    otherGuides: [
      { slug: "psychological-safety", label: "Psychological Safety" },
      { slug: "how-to-give-feedback", label: "How to Give Feedback" },
    ],
  },
  "how-to-be-more-confident": {
    exercises: ["blind-offer", "first-line-drill"],
    threads: [{ id: "quieting-the-planning-mind", label: "Quieting the Planning Mind" }],
    otherGuides: [
      { slug: "stage-fright", label: "Stage Fright Is Not Your Enemy" },
      { slug: "how-to-stop-overthinking", label: "How to Stop Overthinking" },
    ],
  },
  "how-to-be-more-creative": {
    exercises: ["one-word-scene", "blind-offer"],
    threads: [{ id: "the-system-underneath", label: "The System Underneath" }],
    otherGuides: [
      { slug: "how-to-be-funny", label: "How to Be Funny" },
      { slug: "how-to-stop-overthinking", label: "How to Stop Overthinking" },
    ],
  },
  "how-to-deal-with-conflict": {
    exercises: ["mirroring", "emotional-honesty-scene", "status-transfer"],
    threads: [{ id: "the-inner-game-expanded", label: "The Inner Game Expanded" }],
    otherGuides: [
      { slug: "active-listening", label: "Active Listening" },
      { slug: "psychological-safety", label: "Psychological Safety" },
    ],
  },
  "how-to-give-feedback": {
    exercises: ["directed-scene", "mirroring"],
    threads: [{ id: "the-teachers-toolkit", label: "The Teacher's Toolkit" }],
    otherGuides: [
      { slug: "psychological-safety", label: "Psychological Safety" },
      { slug: "team-building-activities", label: "Team Building Activities" },
    ],
  },
  "what-is-improv": {
    exercises: ["yes-and-chain", "one-word-scene", "mirroring"],
    threads: [{ id: "first-rule-you-already-know", label: "The First Rule You Already Know" }],
    otherGuides: [
      { slug: "how-to-be-funny", label: "How to Be Funny" },
      { slug: "how-to-stop-overthinking", label: "How to Stop Overthinking" },
    ],
  },
  "team-building-questions": {
    exercises: ["mirroring", "gift-giving"],
    threads: [{ id: "physics-of-every-room", label: "The Physics of Every Room" }],
    otherGuides: [
      { slug: "team-building-activities", label: "Team Building Activities" },
      { slug: "psychological-safety", label: "Psychological Safety" },
    ],
  },
  "5-minute-team-building": {
    exercises: ["mirroring", "yes-and-chain", "gift-giving", "one-word-scene"],
    threads: [{ id: "building-on-offers", label: "Building on Offers" }],
    otherGuides: [
      { slug: "team-building-activities", label: "Team Building Activities" },
      { slug: "team-building-questions", label: "Team Building Questions" },
    ],
  },
  "collaboration-skills": {
    exercises: ["mirroring", "group-mind-cultivation", "one-word-scene"],
    threads: [{ id: "playing-together-at-the-highest-level", label: "Playing Together" }],
    otherGuides: [
      { slug: "team-building-activities", label: "Team Building Activities" },
      { slug: "active-listening", label: "Active Listening Skills" },
    ],
  },
  "how-to-be-present": {
    exercises: ["mirroring", "last-word-response", "one-word-scene"],
    threads: [{ id: "quieting-the-planning-mind", label: "Quieting the Planning Mind" }],
    otherGuides: [
      { slug: "how-to-stop-overthinking", label: "How to Stop Overthinking" },
      { slug: "active-listening", label: "Active Listening Skills" },
    ],
  },
  "how-to-be-vulnerable": {
    exercises: ["emotional-honesty-scene", "blind-offer"],
    threads: [{ id: "the-inner-game-expanded", label: "The Inner Game" }],
    otherGuides: [
      { slug: "psychological-safety", label: "Psychological Safety" },
      { slug: "how-to-be-more-confident", label: "How to Be More Confident" },
    ],
  },
  "group-dynamics": {
    exercises: ["mirroring", "group-mind-cultivation", "status-transfer"],
    threads: [{ id: "playing-together-at-the-highest-level", label: "Playing Together" }],
    otherGuides: [
      { slug: "collaboration-skills", label: "Collaboration Skills" },
      { slug: "team-building-activities", label: "Team Building Activities" },
    ],
  },
  "interpersonal-communication-skills": {
    exercises: ["last-word-response", "mirroring", "one-word-scene"],
    threads: [{ id: "building-on-offers", label: "Building on Offers" }],
    otherGuides: [
      { slug: "active-listening", label: "Active Listening Skills" },
      { slug: "how-to-be-present", label: "How to Be Present" },
    ],
  },
  "how-to-overcome-fear-of-failure": {
    exercises: ["blind-offer", "first-line-drill", "emotional-honesty-scene"],
    threads: [{ id: "the-inner-game-expanded", label: "The Inner Game" }],
    otherGuides: [
      { slug: "stage-fright", label: "Stage Fright Is Not Your Enemy" },
      { slug: "how-to-be-vulnerable", label: "How to Be Vulnerable" },
    ],
  },
  "how-to-stop-overthinking-in-a-relationship": {
    exercises: ["mirroring", "emotional-honesty-scene", "last-word-response"],
    threads: [{ id: "quieting-the-planning-mind", label: "Quieting the Planning Mind" }],
    otherGuides: [
      { slug: "how-to-stop-overthinking", label: "How to Stop Overthinking" },
      { slug: "how-to-be-vulnerable", label: "How to Be Vulnerable" },
    ],
  },
};

interface BridgeActionLink {
  href: string;
  label: string;
  title: string;
}

interface BridgePrimaryCta extends BridgeActionLink {
  description?: string;
  eventTarget: string;
}

async function resolveBridgePrimaryCta(fm: BridgeFrontmatter): Promise<BridgePrimaryCta | null> {
  const description = fm.primary_problem
    ? `If your main issue is ${fm.primary_problem}, this is the clearest next step.`
    : undefined;

  if (!fm.primary_cta_type || !fm.primary_cta_target) return null;

  switch (fm.primary_cta_type) {
    case "path": {
      const path = await getPathBySlug(fm.primary_cta_target);
      if (!path) return null;

      return {
        label:
          path.frontmatter.id === "beginner-foundations"
            ? "Start the beginner sequence"
            : "Start this path",
        title: path.frontmatter.title,
        href: `/paths/${path.frontmatter.id}`,
        description,
        eventTarget: path.frontmatter.id,
      };
    }
    case "thread": {
      const thread = await getThreadBySlug(fm.primary_cta_target);
      if (!thread) return null;

      return {
        label: "Read this next",
        title: thread.frontmatter.title,
        href: `/threads/${thread.frontmatter.id}`,
        description,
        eventTarget: thread.frontmatter.id,
      };
    }
    case "exercise": {
      const atom = await getAtomBySlug(fm.primary_cta_target);
      if (!atom || atom.frontmatter.type !== "exercise") return null;

      return {
        label: "Do this drill",
        title: atom.frontmatter.title,
        href: getAtomUrl({ id: atom.frontmatter.id, type: atom.frontmatter.type }),
        description,
        eventTarget: atom.frontmatter.id,
      };
    }
    case "challenge":
      return null;
  }
}

async function resolveBridgeSecondaryCta(targetId?: string): Promise<BridgeActionLink | null> {
  if (!targetId) return null;

  const path = await getPathBySlug(targetId);
  if (path) {
    return {
      label: "Then start this path",
      title: path.frontmatter.title,
      href: `/paths/${path.frontmatter.id}`,
    };
  }

  const thread = await getThreadBySlug(targetId);
  if (thread) {
    return {
      label: "Then read this lesson",
      title: thread.frontmatter.title,
      href: `/threads/${thread.frontmatter.id}`,
    };
  }

  const atom = await getAtomBySlug(targetId);
  if (atom) {
    return {
      label: atom.frontmatter.type === "exercise" ? "Then do this drill" : "Then read this",
      title: atom.frontmatter.title,
      href: getAtomUrl({ id: atom.frontmatter.id, type: atom.frontmatter.type }),
    };
  }

  return null;
}

export default async function BridgePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const bridge = await getBridgeBySlug(slug);
  if (!bridge) notFound();

  const fm = bridge.frontmatter;
  const relations = BRIDGE_RELATIONS[slug] ?? { exercises: [], threads: [], otherGuides: [] };
  const [exercises, entryPath, primaryCta, secondaryCta] = await Promise.all([
    Promise.all(
      relations.exercises.map(async (id) => {
        const atom = await getAtomBySlug(id);
        return atom
          ? {
              id,
              title: atom.frontmatter.title,
              url: getAtomUrl({ id, type: atom.frontmatter.type }),
            }
          : { id, title: id, url: `/practice/exercises/${id}` };
      }),
    ),
    fm.entry_path ? getPathBySlug(fm.entry_path) : null,
    resolveBridgePrimaryCta(fm),
    resolveBridgeSecondaryCta(fm.secondary_cta_target),
  ]);
  const audioUrl = getAudioUrl("bridges", slug);
  const audioDuration = audioUrl ? getAudioDuration(audioUrl) : undefined;
  const fallbackPrimaryCta: BridgePrimaryCta | null = entryPath
    ? {
        label:
          entryPath.frontmatter.id === "beginner-foundations"
            ? "Start the beginner sequence"
            : "Start this path",
        title: entryPath.frontmatter.title,
        href: `/paths/${entryPath.frontmatter.id}`,
        description: fm.primary_problem
          ? `If your main issue is ${fm.primary_problem}, this is the clearest next step.`
          : "This is the clearest next step from this guide.",
        eventTarget: entryPath.frontmatter.id,
      }
    : null;
  const resolvedPrimaryCta = primaryCta ?? fallbackPrimaryCta;
  const relatedLinks = [
    secondaryCta,
    exercises[0]
      ? {
          label: "Or do this drill",
          title: exercises[0].title,
          href: exercises[0].url,
        }
      : null,
  ].filter((link): link is BridgeActionLink => Boolean(link));
  const uniqueRelatedLinks = relatedLinks.filter(
    (link, index, collection) =>
      link.href !== resolvedPrimaryCta?.href &&
      collection.findIndex((candidate) => candidate.href === link.href) === index,
  );

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <ArticleJsonLd
        title={fm.title}
        description={fm.description}
        url={`/${slug}`}
        datePublished={fm.created}
        dateModified={fm.updated}
      />
      <Breadcrumb crumbs={[{ label: "Home", href: "/" }, { label: fm.title }]} />

      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{fm.title}</h1>
        <p className="text-foreground/60 mt-2 text-sm">{fm.description}</p>
      </header>

      {audioUrl && (
        <>
          <AudioPlayer src={audioUrl} />
          <PodcastJsonLd
            title={fm.title}
            description={fm.description}
            audioUrl={audioUrl}
            pageUrl={`/${slug}`}
            duration={audioDuration}
          />
        </>
      )}

      <article
        className="prose prose-neutral dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: bridge.html.replace(/^<h1[^>]*>.*?<\/h1>\s*/i, "") }}
      />

      <div className="border-foreground/10 mt-16 space-y-6 border-t pt-8">
        {resolvedPrimaryCta && (
          <WhatsNext
            variant="bridge-primary-cta"
            label={resolvedPrimaryCta.label}
            title={resolvedPrimaryCta.title}
            href={resolvedPrimaryCta.href}
            description={resolvedPrimaryCta.description}
            eventTarget={resolvedPrimaryCta.eventTarget}
          />
        )}

        {uniqueRelatedLinks.length > 0 && (
          <div>
            <h2 className="text-foreground/40 mb-3 text-sm font-semibold tracking-wider uppercase">
              One more useful step
            </h2>
            <div className="space-y-2">
              {uniqueRelatedLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="border-foreground/10 bg-surface hover:border-foreground/30 block rounded-lg border p-3 transition-colors"
                >
                  <span className="text-foreground/40 text-xs tracking-wider uppercase">
                    {link.label}
                  </span>
                  <span className="mt-1 block text-sm font-medium">{link.title}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {!resolvedPrimaryCta && entryPath?.frontmatter.audience?.[0] && (
          <LevelRedirect level={entryPath.frontmatter.audience[0]} context="bridge" />
        )}
      </div>
    </main>
  );
}
