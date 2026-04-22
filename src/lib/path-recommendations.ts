import type { Audience } from "./schema";

export interface PathRecommendation {
  id: string;
  title: string;
  label: string;
  rationale: string;
}

const RECOMMENDED_PATHS: Record<Audience, PathRecommendation> = {
  beginner: {
    id: "beginner-foundations",
    title: "Foundations: Your First Steps in Improv",
    label: "Recommended beginner program",
    rationale:
      "Start here if you want one clear beginner sequence. It turns receiving offers, building on them, and staying present into a short daily loop you can actually finish.",
  },
  intermediate: {
    id: "self-coaching-toolkit",
    title: "The Self-Coaching Toolkit",
    label: "Recommended next step",
    rationale:
      "This is the clearest bridge from basic knowledge to deliberate practice because it gives you a diagnostic vocabulary for what is actually breaking down.",
  },
  advanced: {
    id: "reference-guide",
    title: "The Improv Reference Guide",
    label: "Recommended reference path",
    rationale:
      "This path is the strongest overview when you want the full map, competing traditions, and source-grounded claims in one place.",
  },
  teacher: {
    id: "teaching-improv",
    title: "Teaching Improv: From Performer to Pedagogue",
    label: "Recommended teaching path",
    rationale:
      "Start here if you need to translate performance skill into curriculum, explanation, and classroom design.",
  },
  performer: {
    id: "advanced-game-and-character",
    title: "Advanced Game and Character",
    label: "Recommended mastery path",
    rationale:
      "This is the strongest first move for experienced performers because it sharpens the scene-level decisions that most directly change the quality of your work.",
  },
};

export function getRecommendedPath(audience: Audience): PathRecommendation {
  return RECOMMENDED_PATHS[audience];
}

export function isRecommendedPath(pathId: string, audience: Audience): boolean {
  return RECOMMENDED_PATHS[audience].id === pathId;
}
