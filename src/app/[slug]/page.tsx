import fs from "fs";
import Link from "next/link";
import { notFound } from "next/navigation";
import path from "path";

import { AudioPlayer } from "@/components/AudioPlayer";
import { Breadcrumb } from "@/components/Breadcrumb";
import { PodcastJsonLd } from "@/components/PodcastJsonLd";
import {
  getAtomBySlug,
  getAtomUrl,
  getAudioUrl,
  getBridgeBySlug,
  getPathBySlug,
  loadBridges,
} from "@/lib/content";

export async function generateStaticParams() {
  const bridges = await loadBridges();
  return bridges.map((b) => ({ slug: b.slug }));
}

// Related content for "Go Deeper" sections
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
};

export default async function BridgePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const bridge = await getBridgeBySlug(slug);
  if (!bridge) notFound();

  const fm = bridge.frontmatter;

  // Resolve exercises with proper URLs
  const relations = BRIDGE_RELATIONS[slug] ?? { exercises: [], threads: [], otherGuides: [] };
  const exercises = await Promise.all(
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
  );

  const entryPath = fm.entry_path ? await getPathBySlug(fm.entry_path) : null;
  const audioUrl = getAudioUrl("bridges", slug);

  // Get duration for structured data
  let audioDuration: string | undefined;
  if (audioUrl) {
    try {
      const durPath = path.join(process.cwd(), "public", "audio", "durations.json");
      const durations = JSON.parse(fs.readFileSync(durPath, "utf-8"));
      audioDuration = durations[audioUrl]?.formatted;
    } catch {
      /* no duration cache */
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
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

      {/* ── Post-article: focused CTAs, not a wall ────────────── */}
      <div className="border-foreground/10 mt-16 space-y-6 border-t pt-8">
        {/* Try this — exercises are the most actionable takeaway */}
        {exercises.length > 0 && (
          <div>
            <h2 className="text-foreground/40 mb-3 text-sm font-semibold tracking-wider uppercase">
              Try this
            </h2>
            <div className="space-y-2">
              {exercises.map((ex) => (
                <Link
                  key={ex.id}
                  href={ex.url}
                  className="border-foreground/10 bg-surface hover:border-foreground/30 block rounded-lg border p-3 transition-colors"
                >
                  <span className="text-sm font-medium">{ex.title}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Keep going — the path + one other guide */}
        <div>
          <h2 className="text-foreground/40 mb-3 text-sm font-semibold tracking-wider uppercase">
            Keep going
          </h2>
          <div className="space-y-2">
            {entryPath && (
              <Link
                href={`/paths/${entryPath.frontmatter.id}`}
                className="border-foreground/10 bg-surface hover:border-foreground/30 block rounded-lg border p-3 transition-colors"
              >
                <span className="text-sm font-medium">{entryPath.frontmatter.title}</span>
                <span className="text-foreground/40 mt-0.5 block text-xs">
                  The full learning path
                </span>
              </Link>
            )}
            {relations.otherGuides.slice(0, 2).map((g) => (
              <Link
                key={g.slug}
                href={`/${g.slug}`}
                className="border-foreground/10 bg-surface hover:border-foreground/30 block rounded-lg border p-3 transition-colors"
              >
                <span className="text-sm font-medium">{g.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
