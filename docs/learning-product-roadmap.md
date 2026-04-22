# Learning Product Roadmap

Concrete product roadmap for turning the current improv knowledge base into a higher-retention beginner learning product.

## Product Thesis

The project should optimize for learning effectiveness first.

That means:

- A brand-new improviser should know where to start in under 15 seconds.
- Every lesson should lead to an action, not just an insight.
- The product should help ideas become automatic through repetition, retrieval, and transfer into real conversations.
- Audio should become a repeatable weekly habit loop, not just an alternate format.
- Growth should come from high-intent bridge articles that route people into a tight beginner program.

Secondary outcomes:

- Increase weekly active listeners.
- Increase weekly return rate.
- Create the first meaningful loop for community participation.

## Current Strengths

- The content graph is unusually strong: `atoms -> threads -> paths -> bridges`.
- The beginner path architecture is already better than a typical blog.
- Thread pages now have lesson framing, practice links, and learner-state hooks.
- Bridge articles already function as top-of-funnel acquisition pages.
- Audio already exists across major surfaces.

## Current Weaknesses

- The site still behaves more like a library than a course.
- Beginners are routed by identity more than by symptom.
- Practice is present, but not yet structured into a repeatable regimen.
- There is no daily or weekly habit loop.
- Audio is available, but not yet packaged as a progression system.
- There is no direct mechanism for collecting learner confusion and turning it into product improvement.
- There is still no measurement layer proving where beginners fall off.

## Ranked Backlog

### 1. Flagship Beginner Program

- Goal: make one path meaningfully finishable.
- Why it matters: the current content is good, but "good content" is not the same thing as a learning system.
- Product move:
  - Turn `beginner-foundations` into a time-boxed program such as 14 days or 30 days.
  - Each day should have one lesson, one listen, one drill, one reflection, and one transfer task.
  - Completion should feel like a real outcome, not just "visited all threads."
- Success signal:
  - A beginner can complete the program without ever needing to browse the full library.

### 2. Symptom-Led Onboarding

- Goal: route users by failure mode instead of by self-classification.
- Why it matters: beginners often do not know whether they need a path, a guide, or a drill.
- Product move:
  - Replace or extend the homepage quiz to ask what breaks for them:
  - "I freeze."
  - "I overthink."
  - "I do not know what to say."
  - "I want better conversations."
  - "I want to get better on stage."
  - Route each answer to one recommended guide, one thread, and one starter drill.
- Success signal:
  - Homepage visitors reach a first useful page faster and bounce less.

### 3. Deliberate Practice Layer

- Goal: make every lesson produce reps.
- Why it matters: understanding alone does not make the ideas automatic.
- Product move:
  - Add explicit rep counts, success criteria, and transfer prompts to beginner lessons.
  - Each thread should define:
  - what to do now
  - what to notice
  - what failure looks like
  - where to apply it off-stage
- Success signal:
  - Learners can act on a lesson without inventing their own practice structure.

### 4. Spaced Recall and Review Queue

- Goal: make the ideas stick.
- Why it matters: becoming second nature requires retrieval, not just rereading.
- Product move:
  - Use the learner-state system to surface a daily queue:
  - review
  - practice
  - confidence check
  - revisit based on recency
  - Add short active-recall prompts for core atoms and threads.
- Success signal:
  - Returning users are pulled into a clear next repetition instead of a generic "continue."

### 5. Audio-First Habit Loop

- Goal: turn listening into a weekly cadence.
- Why it matters: weekly active listeners is one of the main success metrics.
- Product move:
  - Turn `/listen` into a progression surface, not just a show index.
  - Feature "listen next", "this week", and "continue listening."
  - Build a short-form daily listen mode for beginners.
- Success signal:
  - A user can stay in audio for a week and still progress through the learning system.

### 6. Bridge-to-Program Funnel

- Goal: convert search traffic into deliberate learners.
- Why it matters: bridge articles are the most scalable top-of-funnel surface in the current repo.
- Product move:
  - Every bridge page should end with one prescribed next step:
  - read this thread next
  - do this drill now
  - join this challenge
  - start this beginner sequence
  - Reduce choice overload in bridge CTAs.
- Success signal:
  - More guide readers start paths, threads, or drills instead of leaving after one article.

### 7. Dual-Context Teaching

- Goal: teach improv and self-improvement with the same core system.
- Why it matters: your wedge audience includes both brand-new improvisers and people using this for life, work, and relationships.
- Product move:
  - Give major concepts two clear transfer lanes:
  - on-stage
  - in-life
  - Make examples, drills, and reflection prompts explicitly support both.
- Success signal:
  - A self-improvement reader does not feel like they accidentally landed in a performer-only product.

### 8. Guided Challenges

- Goal: create structured short-term participation loops.
- Why it matters: challenges are the simplest way to create repeated engagement before building full community features.
- Product move:
  - Launch challenge formats such as:
  - 7 Days to Stop Overthinking
  - 14 Days of Foundations
  - Weekly Listening Club
  - Each challenge should have a daily check, a tiny rep, and a defined finish line.
- Success signal:
  - Beginners have a reason to come back tomorrow.

### 9. Structured Learner Input

- Goal: collect real confusion before building a heavyweight community system.
- Why it matters: there is no user proof yet, so the first community layer should be high-signal and lightweight.
- Product move:
  - Add prompts at the end of lessons:
  - What confused you?
  - Where did this fail in real life?
  - What are you still stuck on?
  - Convert responses into weekly editorial review.
- Success signal:
  - Content improvements start being driven by actual learner friction instead of guesses.

### 10. Canonical-to-Social Publishing Engine

- Goal: make the graph generate distribution assets.
- Why it matters: your long-term layered model depends on turning canonical teaching assets into social posts, replies, clips, and short forms.
- Product move:
  - Make each canonical asset yield:
  - short hooks
  - thread summaries
  - forum replies
  - email snippets
  - micro-audio ideas
  - The editorial model should be canonical first, derivative second.
- Success signal:
  - A small number of flagship assets can feed ongoing distribution without content drift.

## Recommended Sequence

### Phase 1: Tighten the Teaching Loop

- 1. Flagship Beginner Program
- 2. Symptom-Led Onboarding
- 3. Deliberate Practice Layer
- 6. Bridge-to-Program Funnel

### Phase 2: Build Retention

- 4. Spaced Recall and Review Queue
- 5. Audio-First Habit Loop
- 8. Guided Challenges

### Phase 3: Build Defensibility

- 9. Structured Learner Input
- 10. Canonical-to-Social Publishing Engine
- 7. Dual-Context Teaching

## Data Model Changes

These changes are the minimum useful model shifts to support the roadmap without prematurely introducing heavy infrastructure.

### Content

- `PathFrontmatter`
  - add `program_type?: "course" | "challenge" | "reference"`
  - add `program_length_days?: number`
  - add `default_cadence?: "daily" | "weekly" | "self-paced"`
  - add `core_habits?: string[]`
  - add `transfer_contexts?: ("stage" | "life" | "work" | "relationships")[]`

- `ThreadFrontmatter`
  - add `estimated_minutes?: number`
  - add `practice_reps?: string`
  - add `success_signal?: string`
  - add `transfer_prompt?: string`
  - add `challenge_day?: number`
  - add `difficulty?: "beginner" | "core" | "stretch"`

- `BridgeFrontmatter`
  - add `primary_problem?: string`
  - add `primary_cta_type?: "thread" | "path" | "exercise" | "challenge"`
  - add `primary_cta_target?: string`
  - add `secondary_cta_target?: string`

### Learner State

- `JourneyState` in [src/lib/journey.ts](/C:/Users/jaywe/projects/personal/improv-journal/src/lib/journey.ts)
  - add `activeProgramId?: string`
  - add `activeChallengeId?: string`
  - add `lastPracticedAt?: string`
  - add `reviewQueue?: string[]`
  - add `streakCount?: number`
  - add `lastCheckInAt?: string`

- `ThreadJourneyState`
  - add `timesReviewed?: number`
  - add `timesPracticed?: number`
  - add `lastPracticedAt?: string`
  - add `transferContextsUsed?: string[]`

### Optional Future Backend Models

- `LearnerQuestion`
  - `lessonId`
  - `pathId`
  - `promptType`
  - `body`
  - `submittedAt`

- `ChallengeCheckIn`
  - `challengeId`
  - `day`
  - `status`
  - `confidence`
  - `note`

## File-Level Change Map

These are the highest-leverage files to change for the next phase.

### Acquisition and Routing

- [src/app/page.tsx](/C:/Users/jaywe/projects/personal/improv-journal/src/app/page.tsx)
  - Turn the homepage into a stronger "start here" surface.
  - Add a direct flagship-program CTA above generic browsing links.

- [src/components/HomepageQuiz.tsx](/C:/Users/jaywe/projects/personal/improv-journal/src/components/HomepageQuiz.tsx)
  - Shift from identity-led routing to symptom-led routing.
  - Route answers to a guide + thread + drill or directly into the flagship program.

- [src/app/guides/page.tsx](/C:/Users/jaywe/projects/personal/improv-journal/src/app/guides/page.tsx)
  - Reframe guides by problem clusters instead of a flat list.

- [src/app/[slug]/page.tsx](/C:/Users/jaywe/projects/personal/improv-journal/src/app/%5Bslug%5D/page.tsx)
  - Make each bridge page resolve one primary CTA.
  - Add challenge or beginner-program entry points.

### Learning Experience

- [src/app/paths/[slug]/page.tsx](/C:/Users/jaywe/projects/personal/improv-journal/src/app/paths/%5Bslug%5D/page.tsx)
  - Support `course`, `challenge`, and `reference` display modes.
  - Add "start day 1" and "today's lesson" presentation for flagship paths.

- [src/app/threads/[slug]/page.tsx](/C:/Users/jaywe/projects/personal/improv-journal/src/app/threads/%5Bslug%5D/page.tsx)
  - Add explicit rep counts, success criteria, and transfer tasks.
  - Add a stronger end-of-lesson check-in loop.

- [src/components/LessonFrame.tsx](/C:/Users/jaywe/projects/personal/improv-journal/src/components/LessonFrame.tsx)
  - Expand from content framing into action framing.
  - Include "Do", "Notice", and "Use this in life" blocks.

- [src/components/LessonCheckpoint.tsx](/C:/Users/jaywe/projects/personal/improv-journal/src/components/LessonCheckpoint.tsx)
  - Add practice count, review intent, and challenge check-in actions.

- [src/app/practice/page.tsx](/C:/Users/jaywe/projects/personal/improv-journal/src/app/practice/page.tsx)
  - Add curated beginner practice packs instead of only taxonomy navigation.

### Retention and Audio

- [src/lib/journey.ts](/C:/Users/jaywe/projects/personal/improv-journal/src/lib/journey.ts)
  - Add review queue and streak logic.

- [src/components/ContinueJourney.tsx](/C:/Users/jaywe/projects/personal/improv-journal/src/components/ContinueJourney.tsx)
  - Upgrade to "today's next step" instead of generic continuation.

- [src/components/SyllabusProgress.tsx](/C:/Users/jaywe/projects/personal/improv-journal/src/components/SyllabusProgress.tsx)
  - Support review, practice, and challenge-day states.

- [src/app/listen/page.tsx](/C:/Users/jaywe/projects/personal/improv-journal/src/app/listen/page.tsx)
  - Add "listen next", "continue listening", and "short daily listens" groupings.

- [src/app/listen/[show]/page.tsx](/C:/Users/jaywe/projects/personal/improv-journal/src/app/listen/%5Bshow%5D/page.tsx)
  - Add learning-sequence framing around episodes, not just catalog browsing.

### Search and Discovery

- [src/app/search/page.tsx](/C:/Users/jaywe/projects/personal/improv-journal/src/app/search/page.tsx)
  - Add symptom searches and beginner quick filters like "I freeze" or "overthinking."

- [src/lib/content.ts](/C:/Users/jaywe/projects/personal/improv-journal/src/lib/content.ts)
  - Continue using renderer-level interlinking to support deeper navigation between guides, paths, threads, and practice pages.

### Instrumentation and Feedback

- [src/lib/analytics.ts](/C:/Users/jaywe/projects/personal/improv-journal/src/lib/analytics.ts)
  - Normalize event vocabulary for lesson started, practiced, reviewed, transferred, and completed.

- [src/app/layout.tsx](/C:/Users/jaywe/projects/personal/improv-journal/src/app/layout.tsx)
  - Ensure instrumentation is available on all primary flows.

- New future surface:
  - `src/components/LearnerFeedbackPrompt.tsx`
  - `src/app/api/learner-feedback/route.ts`
  - only after Phase 1 validates the value of the prompt

## First Implementation Sprint

This is the highest-value next sprint if the goal is learning effectiveness with minimum added complexity.

### Sprint Name

Flagship Beginner Program

### Objective

Convert the existing beginner path into a true beginner program with a single dominant start, a symptom-led route into it, and stronger lesson actionability.

### Scope

#### 1. Upgrade `beginner-foundations` into a program surface

- Add path metadata for:
  - `program_type: "course"`
  - `program_length_days`
  - `default_cadence`
  - `core_habits`
- Update the path page to render it as a structured program.

#### 2. Replace the first homepage question with symptom-led routing

- Ask what is breaking, not who the user is.
- Route the most common beginner symptoms into:
  - flagship path
  - relevant bridge page
  - relevant starter thread

#### 3. Add explicit practice structure to beginner threads

- Extend selected beginner thread frontmatter with:
  - `practice_reps`
  - `success_signal`
  - `transfer_prompt`
- Render those fields in `LessonFrame`.

#### 4. Strengthen bridge funnels into the beginner program

- Add one primary CTA pattern for bridge pages:
  - "Read this next"
  - "Do this drill"
  - "Start the beginner sequence"

### Deliverables

- A more focused homepage.
- A course-like beginner path.
- More actionable beginner thread pages.
- Cleaner bridge-to-program funnels.

### Acceptance Criteria

- A new learner can choose a starting point based on a concrete problem in under 30 seconds.
- The beginner path reads like a program, not a shelf of articles.
- Each beginner thread tells the learner exactly what to do next.
- Each selected bridge page has one clear next step into the teaching system.

### Files for Sprint 1

- [src/app/page.tsx](/C:/Users/jaywe/projects/personal/improv-journal/src/app/page.tsx)
- [src/components/HomepageQuiz.tsx](/C:/Users/jaywe/projects/personal/improv-journal/src/components/HomepageQuiz.tsx)
- [src/app/paths/[slug]/page.tsx](/C:/Users/jaywe/projects/personal/improv-journal/src/app/paths/%5Bslug%5D/page.tsx)
- [src/app/threads/[slug]/page.tsx](/C:/Users/jaywe/projects/personal/improv-journal/src/app/threads/%5Bslug%5D/page.tsx)
- [src/components/LessonFrame.tsx](/C:/Users/jaywe/projects/personal/improv-journal/src/components/LessonFrame.tsx)
- [src/app/[slug]/page.tsx](/C:/Users/jaywe/projects/personal/improv-journal/src/app/%5Bslug%5D/page.tsx)
- [src/lib/schema.ts](/C:/Users/jaywe/projects/personal/improv-journal/src/lib/schema.ts)
- `content/paths/beginner-foundations.md`
- selected beginner thread markdown files in `content/threads/`

## What Not To Build Yet

- Full accounts and sync across devices before the local learner loop proves useful.
- A heavy community platform before there is evidence of recurring contribution.
- Backend-heavy submission systems before simple structured prompts prove demand.
- More content categories before the flagship beginner sequence is excellent.

## One-Line Recommendation

Make `beginner-foundations` feel like a small, finishable program that people can start from a concrete problem, practice daily, listen to weekly, and revisit until the ideas become automatic.
