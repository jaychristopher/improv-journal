/**
 * Which show a page's audio belongs to.
 *
 * The shows define their own membership by content type — Deep Cuts filters on
 * threads, The Improv Lab on atoms, The Physics of Connection on the guides —
 * so this mirrors that rather than inventing a second rule. Kept as a small
 * literal so it can be used from a server component without loading content.
 */
export type AudioKind = "atom" | "bridge" | "thread";

export const SHOW_FOR_KIND: Record<AudioKind, { id: string; title: string }> = {
  atom: { id: "improv-lab", title: "The Improv Lab" },
  bridge: { id: "physics-of-connection", title: "The Physics of Connection" },
  thread: { id: "deep-cuts", title: "Deep Cuts" },
};
