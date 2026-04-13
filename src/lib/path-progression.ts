/**
 * Static map defining the mastery sequence across paths.
 * Each path points to the next recommended path.
 */

const PROGRESSION: Record<string, string> = {
  "beginner-foundations": "physics-of-connection",
  "physics-of-connection": "systems-of-improv",
  "systems-of-improv": "self-coaching-toolkit",
  "self-coaching-toolkit": "advanced-game-and-character",
  "teaching-improv": "self-coaching-toolkit",
  "advanced-game-and-character": "mastering-the-form",
  "mastering-the-form": "the-art-of-ensemble",
  "the-art-of-ensemble": "reference-guide",
};

const PATH_TITLES: Record<string, string> = {
  "beginner-foundations": "Foundations: Your First Steps in Improv",
  "physics-of-connection": "The Physics of Connection",
  "systems-of-improv": "Systems of Improv: A Thinking Person's Guide",
  "self-coaching-toolkit": "The Self-Coaching Toolkit",
  "teaching-improv": "Teaching Improv: From Performer to Pedagogue",
  "advanced-game-and-character": "Advanced Game and Character",
  "mastering-the-form": "Mastering the Form",
  "the-art-of-ensemble": "The Art of Ensemble",
  "reference-guide": "The Improv Reference Guide",
};

export function getNextPath(currentPathId: string): { id: string; title: string } | null {
  const nextId = PROGRESSION[currentPathId];
  if (!nextId) return null;
  return { id: nextId, title: PATH_TITLES[nextId] ?? nextId };
}

export function getPathTitle(pathId: string): string {
  return PATH_TITLES[pathId] ?? pathId;
}
