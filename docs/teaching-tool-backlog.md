# Teaching Tool Backlog

Incremental product and content-system roadmap for turning the site into a stronger beginner teaching tool without introducing a backend or heavy operational overhead.

## Sprint 1: Course Shell for Beginners

### Issue: Extend path frontmatter with course scaffolding

- Labels: `type:content-system`, `area:paths`, `sprint:1`
- Status: `completed`
- Problem: paths currently describe a sequence, but not the teaching contract.
- Scope:
  - Add `learning_objectives`, `who_this_is_for`, `prerequisites`, `estimated_time`, `practice_cadence`, and `completion_outcome` to `PathFrontmatter`.
  - Update all path markdown files to include the new fields.
- Acceptance criteria:
  - Every path can render a course-style overview without fallback copy.
  - The content model supports explicit beginner guidance.

### Issue: Add validation coverage for path pedagogy metadata

- Labels: `type:quality`, `area:tests`, `sprint:1`
- Status: `completed`
- Problem: the repo has no automated check that paths are structured as teaching assets.
- Scope:
  - Add tests asserting that beginner-facing paths have the new course fields.
  - Add a test asserting the beginner recommendation points to a real path.
- Acceptance criteria:
  - Missing course metadata fails the test suite.
  - The beginner entry point cannot drift away from the content model silently.

### Issue: Redesign path headers into course overviews

- Labels: `type:ux`, `area:paths`, `sprint:1`
- Status: `completed`
- Problem: path pages read like collections, not like courses.
- Scope:
  - Replace the current path header with a course overview showing who the path is for, what learners will get, how to use it, and the completion outcome.
  - Keep a single dominant CTA above the syllabus.
- Acceptance criteria:
  - A new learner can understand the path in under 15 seconds.
  - The primary CTA is visible before the syllabus list.

### Issue: Converge beginner entry points on one recommended start

- Labels: `type:ux`, `area:onboarding`, `sprint:1`
- Status: `completed`
- Problem: homepage, `/paths`, and `/learn/beginner` currently suggest multiple equally valid starting points.
- Scope:
  - Introduce a shared beginner recommendation helper.
  - Surface the same starter path on the homepage quiz, `/paths`, and `/learn/beginner`.
  - Keep alternate entry points available, but secondary.
- Acceptance criteria:
  - The beginner recommendation is consistent across all three surfaces.
  - Alternate beginner paths remain discoverable but not dominant.

### Issue: Add a “Why this path first?” block to the beginner landing page

- Labels: `type:ux`, `area:onboarding`, `sprint:1`
- Status: `completed`
- Problem: even a good recommendation feels arbitrary without a rationale.
- Scope:
  - Add a dedicated explanation section to `/learn/beginner`.
  - Ground the explanation in the actual path metadata and learning goals.
- Acceptance criteria:
  - Beginners can understand why the default starting path exists.
  - The recommendation sounds intentional, not promotional.

## Sprint 2: Lesson Frame

### Issue: Add teaching metadata to threads

- Labels: `type:content-system`, `area:threads`, `sprint:2`
- Status: `completed`
- Scope:
  - Extend thread frontmatter with `lesson_goal`, `key_takeaway`, `common_mistake`, `practice_prompt`, and `reflection_prompt`.

### Issue: Introduce a reusable lesson frame component

- Labels: `type:ux`, `area:threads`, `sprint:2`
- Status: `completed`
- Scope:
  - Build a shared lesson scaffold for thread pages with `What you'll learn`, `Why it matters`, `Try this now`, and `Reflect`.

### Issue: Add validation coverage for beginner lesson metadata

- Labels: `type:quality`, `area:tests`, `sprint:2`
- Status: `completed`
- Scope:
  - Add a test asserting that every thread sequenced by a beginner-facing path includes `lesson_goal`, `key_takeaway`, `common_mistake`, `practice_prompt`, and `reflection_prompt`.

## Sprint 3: Multimodal Practice Flow

### Issue: Make exercises first-class within each lesson

- Labels: `type:ux`, `area:practice`, `sprint:3`
- Status: `completed`
- Scope:
  - Link lessons directly to exercises, including solo and partner variants.

### Issue: Build a consistent Read / Listen / Practice / Reflect flow

- Labels: `type:ux`, `area:multimodal`, `sprint:3`
- Status: `completed`
- Scope:
  - Reorder lesson pages so audio and practice feel integrated rather than adjacent.

## Sprint 4: Progression Memory

### Issue: Expand learner state beyond visited pages

- Labels: `type:product`, `area:journey`, `sprint:4`
- Status: `completed`
- Scope:
  - Track saved lessons, completion state, confidence, and recency in local storage.

### Issue: Personalize “continue” and “what’s next” based on learner state

- Labels: `type:ux`, `area:journey`, `sprint:4`
- Status: `completed`
- Scope:
  - Upgrade continue/resume components to recommend review, practice, or continuation.

## Sprint 5: Learning Analytics

### Issue: Normalize learning funnel events

- Labels: `type:analytics`, `area:instrumentation`, `sprint:5`
- Status: `planned`
- Scope:
  - Define a funnel event vocabulary for recommendation, start, lesson completion, practice engagement, and return behavior.

### Issue: Add reporting for beginner drop-off

- Labels: `type:analytics`, `area:review`, `sprint:5`
- Status: `planned`
- Scope:
  - Create a lightweight weekly workflow for reviewing path start and continuation rates.

## Sprint 6: Structured Community Input

### Issue: Collect learner friction and questions in-context

- Labels: `type:product`, `area:community`, `sprint:6`
- Status: `planned`
- Scope:
  - Add structured prompts for confusion, stuck points, and real scene failures.

### Issue: Create an editorial loop from learner input back into content

- Labels: `type:content-system`, `area:community`, `sprint:6`
- Status: `planned`
- Scope:
  - Define how learner questions become new guides, lesson revisions, and practice prompts.
