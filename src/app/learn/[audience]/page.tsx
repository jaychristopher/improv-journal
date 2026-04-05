import { notFound } from "next/navigation";
import Link from "next/link";
import { loadPaths, loadAtoms, loadBridges } from "@/lib/content";
import type { Audience } from "@/lib/schema";

const AUDIENCES: Record<
  string,
  { title: string; subtitle: string; description: string; bridgeSlugs: string[]; atomHighlights: string[] }
> = {
  beginner: {
    title: "Starting Improv? Here's Your Map.",
    subtitle: "Three paths, from \"what is this?\" to \"I can do a scene.\"",
    description:
      "If you're new to improv — or curious what it can teach you about connection, listening, and thinking on your feet — start here.",
    bridgeSlugs: [
      "how-to-stop-overthinking",
      "how-to-be-funny",
      "stage-fright",
    ],
    atomHighlights: [
      "be-present", "be-positive", "be-honest", "be-simple", "be-brave",
      "yes-and", "active-listening", "offers", "obvious-choice", "accepting-the-offer",
      "mirroring", "one-word-scene", "gift-giving", "blind-offer",
      "relationship", "character", "want", "base-reality",
    ],
  },
  intermediate: {
    title: "Stuck at a Plateau? Here's Your Diagnostic.",
    subtitle: "You can do scenes. You can't tell why some work. That changes now.",
    description:
      "Around the two-year mark, every improviser tells themselves the same thing: 'I am terrible at improv.' You're not. You're in the knowledge-ability gap. Here's how to break through.",
    bridgeSlugs: ["how-to-stop-overthinking"],
    atomHighlights: [
      "systemic-collapse-modes", "systemic-health-indicators",
      "internal-computation", "performing-cleverness", "hesitation",
      "bulldozing", "steering", "overcomplication", "judgment",
      "latency-recovery", "fracture-recovery", "decay-recovery",
      "emotion-switch", "emotional-honesty-scene", "no-backspace-scene",
      "fracture-repair-drill", "first-line-drill",
    ],
  },
  teacher: {
    title: "You Can Do It. Now Learn to Teach It.",
    subtitle: "Structure, feedback, and the ability to explain WHY.",
    description:
      "The performer-to-teacher transition is an identity shift, not just a skill transfer. This path gives you the explanatory layer, the curriculum framework, and the feedback skills.",
    bridgeSlugs: ["how-to-stop-overthinking", "stage-fright"],
    atomHighlights: [
      "safety-in-the-room", "curriculum-design", "warm-up",
      "side-coaching", "giving-notes", "reading-the-room",
      "irreversibility", "cognitive-bandwidth", "shared-reality-fragility",
      "mirroring", "one-word-scene", "gift-giving", "emotion-switch",
      "genre-scene", "group-mind-cultivation", "directed-scene",
    ],
  },
  performer: {
    title: "From Competent to Artist.",
    subtitle: "Three paths for performers who've mastered the basics.",
    description:
      "You know the Harold. You can find game. You edit well. The question shifts from 'how do I do this?' to 'who am I when I do this?' These paths take you there.",
    bridgeSlugs: ["stage-fright"],
    atomHighlights: [
      "armando", "la-ronde", "narrative-longform", "organic-longform",
      "two-person-longform", "genre-format",
      "game-types", "game-evolution", "pattern-break", "analogous-scene",
      "physicality", "status-dynamics", "character-through-game",
      "backline-craft", "heat-and-weight", "performance-state",
      "audience-relationship", "failing-forward", "finding-your-voice",
    ],
  },
  advanced: {
    title: "The Improv Reference Guide",
    subtitle: "Cross-referenced, multi-tradition analysis.",
    description:
      "For writers, researchers, podcast hosts, and serious practitioners who need sourced, comparative analysis across Johnstone, Spolin, Close, UCB, and Annoyance traditions.",
    bridgeSlugs: [],
    atomHighlights: [
      "yes-and", "game-of-the-scene", "status", "presence", "editing",
      "reality-construction", "irreversibility", "cognitive-bandwidth",
      "shared-reality-fragility", "continuous-signaling",
      "meaning-is-relational", "interdependence",
    ],
  },
};

const VALID_AUDIENCES = Object.keys(AUDIENCES);

export async function generateStaticParams() {
  return VALID_AUDIENCES.map((audience) => ({ audience }));
}

export default async function LearnPage({
  params,
}: {
  params: Promise<{ audience: string }>;
}) {
  const { audience } = await params;
  if (!VALID_AUDIENCES.includes(audience)) notFound();

  const config = AUDIENCES[audience];
  const [paths, atoms, bridges] = await Promise.all([
    loadPaths(),
    loadAtoms(),
    loadBridges(),
  ]);

  // Filter paths by audience
  const audiencePaths = paths.filter((p) =>
    p.frontmatter.audience?.includes(audience as Audience)
  );

  // Filter bridges by slug
  const audienceBridges = bridges.filter((b) =>
    config.bridgeSlugs.includes(b.slug)
  );

  // Filter highlight atoms
  const highlightAtoms = atoms.filter((a) =>
    config.atomHighlights.includes(a.frontmatter.id)
  );

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <Link
        href="/"
        className="text-sm text-foreground/40 hover:text-foreground/60 mb-8 block"
      >
        &larr; Home
      </Link>

      <header className="mb-12">
        <span className="text-xs uppercase tracking-wider text-foreground/40">
          learn · {audience}
        </span>
        <h1 className="text-3xl font-bold tracking-tight mt-1">
          {config.title}
        </h1>
        <p className="text-foreground/60 mt-2">{config.subtitle}</p>
        <p className="text-sm text-foreground/40 mt-3">{config.description}</p>
      </header>

      {/* Bridge articles for common concerns */}
      {audienceBridges.length > 0 && (
        <section className="mb-12">
          <h2 className="text-lg font-semibold mb-4">
            If you're wondering...
          </h2>
          <div className="space-y-3">
            {audienceBridges.map((b) => (
              <Link
                key={b.slug}
                href={`/guides/${b.slug}`}
                className="block border border-foreground/10 rounded-lg p-4 hover:border-foreground/30 transition-colors"
              >
                <h3 className="font-medium text-sm">
                  {b.frontmatter.title}
                </h3>
                <p className="text-xs text-foreground/40 mt-1">
                  {b.frontmatter.description}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Paths */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-4">
          {audiencePaths.length === 1 ? "Your path" : "Your paths"}
        </h2>
        <div className="space-y-4">
          {audiencePaths.map((p) => (
            <Link
              key={p.frontmatter.id}
              href={`/paths/${p.frontmatter.id}`}
              className="block border border-foreground/10 rounded-lg p-5 hover:border-foreground/30 transition-colors"
            >
              <h3 className="font-semibold">{p.frontmatter.title}</h3>
              <p className="text-sm text-foreground/60 mt-1">
                {p.frontmatter.description}
              </p>
              <span className="text-xs text-foreground/40 mt-2 block">
                {p.frontmatter.threads?.length ?? 0} threads
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Key concepts */}
      {highlightAtoms.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4">
            Key concepts at this level
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {highlightAtoms.map((a) => (
              <Link
                key={a.frontmatter.id}
                href={`/atoms/${a.frontmatter.id}`}
                className="border border-foreground/10 rounded-lg p-3 hover:border-foreground/30 transition-colors"
              >
                <span className="text-sm font-medium">
                  {a.frontmatter.title}
                </span>
                <span className="text-xs text-foreground/40 block mt-0.5">
                  {a.frontmatter.type}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
