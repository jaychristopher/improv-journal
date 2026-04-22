import { beforeEach, describe, expect, it, vi } from "vitest";

const { trackMock, captureMock } = vi.hoisted(() => ({
  trackMock: vi.fn(),
  captureMock: vi.fn(),
}));

vi.mock("@vercel/analytics", () => ({
  track: trackMock,
}));

vi.mock("posthog-js", () => ({
  default: {
    capture: captureMock,
  },
}));

import {
  LEARNING_EVENTS,
  trackLearningLessonCompleted,
  trackLearningRecommendationShown,
  trackLearningReviewScheduled,
} from "@/lib/analytics";

describe("learning analytics helpers", () => {
  beforeEach(() => {
    trackMock.mockClear();
    captureMock.mockClear();
  });

  it("sends normalized recommendation events to both providers", () => {
    trackLearningRecommendationShown({
      pathId: "beginner-foundations",
      threadId: "building-on-offers",
      recommendationKind: "review",
      surface: "continue_journey",
      threadPosition: 2,
      threadTotal: 7,
    });

    const expected = {
      path_id: "beginner-foundations",
      thread_id: "building-on-offers",
      surface: "continue_journey",
      thread_position: 2,
      thread_total: 7,
      recommendation_kind: "review",
    };

    expect(trackMock).toHaveBeenCalledWith(LEARNING_EVENTS.recommendationShown, expected);
    expect(captureMock).toHaveBeenCalledWith(LEARNING_EVENTS.recommendationShown, expected);
  });

  it("keeps review scheduling payloads flat and omits missing optional fields", () => {
    trackLearningReviewScheduled({
      threadId: "building-on-offers",
      surface: "lesson_checkpoint",
      reviewCount: 0,
      reviewDueDays: 1,
      trigger: "completion",
    });

    trackLearningLessonCompleted({
      pathId: "beginner-foundations",
      threadId: "building-on-offers",
      surface: "lesson_checkpoint",
      completed: true,
      reviewQueued: true,
    });

    expect(trackMock).toHaveBeenNthCalledWith(1, LEARNING_EVENTS.reviewScheduled, {
      thread_id: "building-on-offers",
      surface: "lesson_checkpoint",
      review_count: 0,
      review_due_days: 1,
      trigger: "completion",
    });
    expect(trackMock).toHaveBeenNthCalledWith(2, LEARNING_EVENTS.lessonCompleted, {
      path_id: "beginner-foundations",
      thread_id: "building-on-offers",
      surface: "lesson_checkpoint",
      completed: true,
      review_queued: true,
    });
    expect(captureMock).toHaveBeenNthCalledWith(1, LEARNING_EVENTS.reviewScheduled, {
      thread_id: "building-on-offers",
      surface: "lesson_checkpoint",
      review_count: 0,
      review_due_days: 1,
      trigger: "completion",
    });
    expect(captureMock).toHaveBeenNthCalledWith(2, LEARNING_EVENTS.lessonCompleted, {
      path_id: "beginner-foundations",
      thread_id: "building-on-offers",
      surface: "lesson_checkpoint",
      completed: true,
      review_queued: true,
    });
  });
});
