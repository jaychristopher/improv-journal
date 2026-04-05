import { notFound } from "next/navigation";
import Link from "next/link";
import {
  loadBridges,
  getBridgeBySlug,
  getAtomBySlug,
  getPathBySlug,
  getAudioUrl,
} from "@/lib/content";
import { AudioPlayer } from "@/components/AudioPlayer";
import { Breadcrumb } from "@/components/Breadcrumb";

export async function generateStaticParams() {
  const bridges = await loadBridges();
  return bridges.map((b) => ({ slug: b.slug }));
}

// Map bridge slugs to related content for "Go Deeper" sections
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
      {
        id: "quieting-the-planning-mind",
        label: "Quieting the Planning Mind",
      },
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
    threads: [
      {
        id: "physics-of-every-room",
        label: "The Physics of Every Room",
      },
    ],
    otherGuides: [
      { slug: "active-listening", label: "Active Listening" },
      {
        slug: "how-to-stop-overthinking",
        label: "How to Stop Overthinking",
      },
    ],
  },
  "active-listening": {
    exercises: ["last-word-response", "mirroring", "one-word-scene"],
    threads: [
      { id: "building-on-offers", label: "Building on Offers" },
      {
        id: "quieting-the-planning-mind",
        label: "Quieting the Planning Mind",
      },
    ],
    otherGuides: [
      {
        slug: "psychological-safety",
        label: "Psychological Safety",
      },
      {
        slug: "how-to-stop-overthinking",
        label: "How to Stop Overthinking",
      },
    ],
  },
  "how-to-be-funny": {
    exercises: [
      "one-word-scene",
      "emotional-honesty-scene",
      "first-line-drill",
    ],
    threads: [
      {
        id: "the-game-beneath-the-game",
        label: "The Game Beneath the Game",
      },
    ],
    otherGuides: [
      { slug: "active-listening", label: "Active Listening" },
      { slug: "stage-fright", label: "Stage Fright Is Not Your Enemy" },
    ],
  },
  "stage-fright": {
    exercises: ["mirroring", "group-mind-cultivation"],
    threads: [
      { id: "the-performers-edge", label: "The Performer's Edge" },
    ],
    otherGuides: [
      {
        slug: "how-to-stop-overthinking",
        label: "How to Stop Overthinking",
      },
      {
        slug: "psychological-safety",
        label: "Psychological Safety",
      },
    ],
  },
};

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const bridge = await getBridgeBySlug(slug);
  if (!bridge) notFound();

  const fm = bridge.frontmatter;

  // Resolve entry atoms
  const entryAtoms = await Promise.all(
    (fm.entry_atoms ?? []).map(async (id) => {
      const atom = await getAtomBySlug(id);
      return atom
        ? { id, title: atom.frontmatter.title, type: atom.frontmatter.type }
        : { id, title: id, type: "unknown" };
    })
  );

  // Resolve exercises
  const relations = BRIDGE_RELATIONS[slug] ?? {
    exercises: [],
    threads: [],
    otherGuides: [],
  };
  const exercises = await Promise.all(
    relations.exercises.map(async (id) => {
      const atom = await getAtomBySlug(id);
      return atom
        ? { id, title: atom.frontmatter.title }
        : { id, title: id };
    })
  );

  // Resolve entry path
  const entryPath = fm.entry_path
    ? await getPathBySlug(fm.entry_path)
    : null;

  const audioUrl = getAudioUrl("bridges", slug);

  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <Breadcrumb
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Guides", href: "/#guides" },
          { label: fm.title },
        ]}
      />

      <header className="mb-8">
        <span className="text-xs uppercase tracking-wider text-foreground/40">
          guide
        </span>
        <h1 className="text-3xl font-bold tracking-tight mt-1">{fm.title}</h1>
        <p className="text-foreground/60 mt-2 text-sm">{fm.description}</p>
      </header>

      {audioUrl && <AudioPlayer src={audioUrl} />}

      <article
        className="prose prose-neutral dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: bridge.html }}
      />

      {/* ── Go Deeper ─────────────────────────────────────────────── */}
      <div className="mt-16 pt-8 border-t border-foreground/10 space-y-8">
        <h2 className="text-xl font-semibold">Go Deeper</h2>

        {/* Entry Path */}
        {entryPath && (
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground/40 mb-3">
              The full path
            </h3>
            <Link
              href={`/paths/${entryPath.frontmatter.id}`}
              className="block border border-foreground/10 rounded-lg p-4 hover:border-foreground/30 transition-colors"
            >
              <span className="font-medium">
                {entryPath.frontmatter.title}
              </span>
              <p className="text-sm text-foreground/60 mt-1">
                {entryPath.frontmatter.description}
              </p>
            </Link>
          </div>
        )}

        {/* Related Concepts */}
        {entryAtoms.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground/40 mb-3">
              Related concepts
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {entryAtoms.map((atom) => (
                <Link
                  key={atom.id}
                  href={`/atoms/${atom.id}`}
                  className="border border-foreground/10 rounded-lg p-3 hover:border-foreground/30 transition-colors"
                >
                  <span className="text-sm font-medium">{atom.title}</span>
                  <span className="text-xs text-foreground/40 block mt-0.5">
                    {atom.type}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Exercises */}
        {exercises.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground/40 mb-3">
              Try these exercises
            </h3>
            <ul className="space-y-2">
              {exercises.map((ex) => (
                <li key={ex.id}>
                  <Link
                    href={`/atoms/${ex.id}`}
                    className="text-sm hover:underline"
                  >
                    {ex.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Related Threads */}
        {relations.threads.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground/40 mb-3">
              Related threads
            </h3>
            <ul className="space-y-2">
              {relations.threads.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/threads/${t.id}`}
                    className="text-sm hover:underline"
                  >
                    {t.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Other Guides */}
        {relations.otherGuides.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground/40 mb-3">
              More guides
            </h3>
            <ul className="space-y-2">
              {relations.otherGuides.map((g) => (
                <li key={g.slug}>
                  <Link
                    href={`/guides/${g.slug}`}
                    className="text-sm hover:underline"
                  >
                    {g.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
