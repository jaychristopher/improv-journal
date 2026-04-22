import { track } from "@vercel/analytics";
import posthog from "posthog-js";

export type AnalyticsScalar = string | number | boolean | null;
export type AnalyticsProperties = Record<string, AnalyticsScalar>;

export type LearningRecommendationKind = "continue" | "review" | "practice";
export type LearningSurface =
  | "continue_journey"
  | "journey_progress"
  | "lesson_checkpoint"
  | "syllabus_progress";
export type LearningTrigger = "manual" | "completion";
export type LearningConfidence = "low" | "medium" | "high";

export const LEARNING_EVENTS = {
  recommendationShown: "learning_recommendation_shown",
  recommendationClicked: "learning_recommendation_clicked",
  pathStarted: "learning_path_started",
  lessonViewed: "learning_lesson_viewed",
  lessonSaved: "learning_lesson_saved",
  lessonCompleted: "learning_lesson_completed",
  lessonConfidenceSet: "learning_lesson_confidence_set",
  practiceLogged: "learning_practice_logged",
  reviewScheduled: "learning_review_scheduled",
  reviewCompleted: "learning_review_completed",
  pathCompleted: "learning_path_completed",
} as const;

interface LearningContext {
  pathId?: string;
  threadId?: string;
  surface: LearningSurface;
}

interface LearningRecommendationPayload extends LearningContext {
  recommendationKind: LearningRecommendationKind;
  threadPosition: number;
  threadTotal: number;
}

interface LearningThreadPayload extends LearningContext {
  threadPosition?: number;
  threadTotal?: number;
}

function compactProperties(
  properties: Record<string, AnalyticsScalar | undefined>,
): AnalyticsProperties {
  return Object.fromEntries(
    Object.entries(properties).filter(([, value]) => value !== undefined),
  ) as AnalyticsProperties;
}

/**
 * Send a custom event to both Vercel Analytics and PostHog.
 * Properties must be flat scalars (string | number | boolean | null).
 */
export function trackEvent(name: string, properties?: AnalyticsProperties) {
  track(name, properties);
  posthog.capture(name, properties);
}

function trackLearningEvent(
  name: (typeof LEARNING_EVENTS)[keyof typeof LEARNING_EVENTS],
  properties: AnalyticsProperties,
) {
  trackEvent(name, properties);
}

function learningContextProperties(context: LearningContext): AnalyticsProperties {
  return compactProperties({
    path_id: context.pathId,
    thread_id: context.threadId,
    surface: context.surface,
  });
}

function learningThreadProperties(payload: LearningThreadPayload): AnalyticsProperties {
  return compactProperties({
    ...learningContextProperties(payload),
    thread_position: payload.threadPosition,
    thread_total: payload.threadTotal,
  });
}

export function trackLearningRecommendationShown(payload: LearningRecommendationPayload) {
  trackLearningEvent(
    LEARNING_EVENTS.recommendationShown,
    compactProperties({
      ...learningThreadProperties(payload),
      recommendation_kind: payload.recommendationKind,
    }),
  );
}

export function trackLearningRecommendationClicked(payload: LearningRecommendationPayload) {
  trackLearningEvent(
    LEARNING_EVENTS.recommendationClicked,
    compactProperties({
      ...learningThreadProperties(payload),
      recommendation_kind: payload.recommendationKind,
    }),
  );
}

export function trackLearningPathStarted(payload: {
  pathId?: string;
  surface: LearningSurface;
  threadTotal: number;
}) {
  trackLearningEvent(
    LEARNING_EVENTS.pathStarted,
    compactProperties({
      path_id: payload.pathId,
      surface: payload.surface,
      thread_total: payload.threadTotal,
    }),
  );
}

export function trackLearningLessonViewed(payload: LearningThreadPayload) {
  trackLearningEvent(LEARNING_EVENTS.lessonViewed, learningThreadProperties(payload));
}

export function trackLearningLessonSaved(
  payload: LearningContext & {
    saved: boolean;
  },
) {
  trackLearningEvent(
    LEARNING_EVENTS.lessonSaved,
    compactProperties({
      ...learningContextProperties(payload),
      saved: payload.saved,
    }),
  );
}

export function trackLearningLessonCompleted(
  payload: LearningContext & {
    completed: boolean;
    reviewQueued: boolean;
  },
) {
  trackLearningEvent(
    LEARNING_EVENTS.lessonCompleted,
    compactProperties({
      ...learningContextProperties(payload),
      completed: payload.completed,
      review_queued: payload.reviewQueued,
    }),
  );
}

export function trackLearningConfidenceSet(
  payload: LearningContext & {
    confidence: LearningConfidence;
  },
) {
  trackLearningEvent(
    LEARNING_EVENTS.lessonConfidenceSet,
    compactProperties({
      ...learningContextProperties(payload),
      confidence: payload.confidence,
    }),
  );
}

export function trackLearningPracticeLogged(
  payload: LearningContext & {
    practiceCount: number;
  },
) {
  trackLearningEvent(
    LEARNING_EVENTS.practiceLogged,
    compactProperties({
      ...learningContextProperties(payload),
      practice_count: payload.practiceCount,
    }),
  );
}

export function trackLearningReviewScheduled(
  payload: LearningContext & {
    reviewCount: number;
    reviewDueDays: number;
    trigger: LearningTrigger;
  },
) {
  trackLearningEvent(
    LEARNING_EVENTS.reviewScheduled,
    compactProperties({
      ...learningContextProperties(payload),
      review_count: payload.reviewCount,
      review_due_days: payload.reviewDueDays,
      trigger: payload.trigger,
    }),
  );
}

export function trackLearningReviewCompleted(
  payload: LearningContext & {
    reviewCount: number;
  },
) {
  trackLearningEvent(
    LEARNING_EVENTS.reviewCompleted,
    compactProperties({
      ...learningContextProperties(payload),
      review_count: payload.reviewCount,
    }),
  );
}

export function trackLearningPathCompleted(payload: {
  pathId?: string;
  surface: LearningSurface;
  threadTotal: number;
}) {
  trackLearningEvent(
    LEARNING_EVENTS.pathCompleted,
    compactProperties({
      path_id: payload.pathId,
      surface: payload.surface,
      thread_total: payload.threadTotal,
    }),
  );
}
