# Weekly Learning Review

Lightweight review workflow for checking whether the beginner learning loop is actually helping people start, continue, practice, and come back.

## Scope

Primary segment:

- `path_id = beginner-foundations`

Primary event vocabulary:

- `learning_recommendation_shown`
- `learning_recommendation_clicked`
- `learning_path_started`
- `learning_lesson_viewed`
- `learning_lesson_completed`
- `learning_practice_logged`
- `learning_review_scheduled`
- `learning_review_completed`
- `learning_path_completed`

## Weekly Scorecard

Review these numbers each week:

1. Recommendation click-through rate
   `learning_recommendation_clicked / learning_recommendation_shown`
2. Path start rate
   count of `learning_path_started`
3. Lesson 1 reach
   users with `learning_lesson_viewed` where `thread_position = 1`
4. First lesson completion rate
   `learning_lesson_completed(completed=true, thread_position=1 if available)` relative to lesson 1 viewers
5. Practice engagement rate
   users with `learning_practice_logged` relative to lesson viewers
6. Review follow-through rate
   `learning_review_completed / learning_review_scheduled`
7. Path completion count
   count of `learning_path_completed`

## Breakdown Views

Look at each metric by these dimensions:

- `surface`
- `recommendation_kind`
- `thread_position`

This is the minimum useful cut for seeing where the loop breaks:

- `surface` shows whether `continue_journey` or `syllabus_progress` is the better re-entry point.
- `recommendation_kind` shows whether learners are actually responding to `continue`, `practice`, or `review`.
- `thread_position` shows where the beginner program starts leaking attention.

## Weekly Questions

Answer these in one short note each week:

1. Are recommendation clicks growing, flat, or falling?
2. Which surface produces better path starts: `continue_journey` or `syllabus_progress`?
3. At which thread position does completion drop most sharply?
4. Are learners scheduling reviews but not completing them?
5. Is practice usage concentrated in one lesson or spread across the sequence?

## Interpretation Rules

Use these rules before changing the product:

- If recommendation click-through is weak on both surfaces, tighten CTA copy before adding more destinations.
- If path starts are strong but lesson completion is weak, improve the lesson frame and checkpoint, not acquisition.
- If review scheduling is high but review completion is low, the review prompt is too abstract or too easy to ignore.
- If practice logging is near zero, the lesson does not make the rep obvious enough.
- If drop-off clusters at one thread position, revise that lesson before expanding the path.

## Capture Format

Store each weekly readout in one dated section or issue comment with:

- Date range reviewed
- Topline metrics
- Biggest drop-off point
- One product change to test next
- One content change to test next

Keep the workflow lightweight. The point is to create a repeatable editorial and product feedback loop, not a reporting project.
