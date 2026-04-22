export interface HomepageSymptomDefinition {
  id: string;
  label: string;
  description: string;
  diagnosis: string;
  pathId: string;
  bridgeSlug: string;
  threadId: string;
}

export const HOMEPAGE_SYMPTOMS: HomepageSymptomDefinition[] = [
  {
    id: "overthinking",
    label: "I freeze and overthink",
    description: "You go blank because your attention disappears into planning.",
    diagnosis:
      "Start with the beginner program, then use the overthinking guide and planning-mind lesson to get your attention back outside yourself.",
    pathId: "beginner-foundations",
    bridgeSlug: "how-to-stop-overthinking",
    threadId: "quieting-the-planning-mind",
  },
  {
    id: "nothing-to-say",
    label: "I do not know what to say next",
    description: "The moment dies because you are inventing instead of receiving.",
    diagnosis:
      "The fix is not more cleverness. Start with the beginner program, then use the listening guide and offers lesson to learn how to receive before you respond.",
    pathId: "beginner-foundations",
    bridgeSlug: "active-listening",
    threadId: "building-on-offers",
  },
  {
    id: "awkward",
    label: "I feel awkward and disconnected",
    description: "Self-monitoring gets louder than connection.",
    diagnosis:
      "Use the beginner program for the fundamentals, then the awkwardness guide and commitment lesson to shift attention back into the room.",
    pathId: "beginner-foundations",
    bridgeSlug: "how-to-be-less-awkward",
    threadId: "presence-and-commitment",
  },
  {
    id: "forcing-funny",
    label: "I try too hard to be funny",
    description: "Reaching for cleverness is flattening the scene.",
    diagnosis:
      "Go through the beginner program, then read the humor guide and return to offers. Honest building is a better first move than joke-chasing.",
    pathId: "beginner-foundations",
    bridgeSlug: "how-to-be-funny",
    threadId: "building-on-offers",
  },
  {
    id: "stage-fright",
    label: "Fear keeps me from committing",
    description: "You hesitate instead of making the first move.",
    diagnosis:
      "Start with the beginner program, then use the stage-fright guide and commitment lesson to turn activation into action instead of self-monitoring.",
    pathId: "beginner-foundations",
    bridgeSlug: "stage-fright",
    threadId: "presence-and-commitment",
  },
];
