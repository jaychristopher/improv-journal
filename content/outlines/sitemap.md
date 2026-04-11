# Complete Sitemap & Page Outlines

## Architecture Overview

```
/                                    ← Homepage (rewritten as hub of hubs)
├── /learn/                          ← NEW: Hub by audience
│   ├── /learn/beginner              ← 3 paths for beginners
│   ├── /learn/intermediate          ← Self-coaching toolkit
│   ├── /learn/advanced              ← Reference guide
│   ├── /learn/teacher               ← Teaching improv
│   └── /learn/performer             ← 3 mastery paths
├── /guides/                         ← NEW: Bridge articles (the front doors)
│   ├── /guides/how-to-stop-overthinking
│   ├── /guides/psychological-safety
│   ├── /guides/active-listening
│   ├── /guides/how-to-be-funny
│   └── /guides/stage-fright
├── /concepts/                       ← NEW: Hub by atom type
│   ├── /concepts/principles         ← 8 principles
│   ├── /concepts/techniques         ← 26 techniques
│   ├── /concepts/exercises          ← 16 exercises
│   ├── /concepts/formats            ← 8 formats
│   ├── /concepts/laws               ← 6 laws
│   ├── /concepts/definitions        ← 26 definitions
│   ├── /concepts/antipatterns       ← 9 antipatterns
│   └── /concepts/patterns           ← 6 patterns
├── /paths/{slug}                    ← 9 path detail pages (existing)
├── /threads/{slug}                  ← 20 thread detail pages (existing)
├── /atoms/{slug}                    ← 149 atom detail pages (existing)
├── /sources/{slug}                  ← Source detail pages (existing)
├── /library/                        ← NEW: Reading list hub (reference atoms)
└── /api/graph                       ← Graph API (existing)
```

**Total pages: ~220**
- 1 homepage
- 5 audience hub pages
- 5 bridge articles
- 8 concept type pages
- 1 library page
- 9 paths + 20 threads + 149 atoms + 1 source + 1 API
- *Plus: ~20 future bridge articles as content grows*

---

## Page-by-Page Outlines

---

### `/` — Homepage

**Purpose:** Orient every visitor. Answer "what is this?" and "where do I start?" within 5 seconds. Route to the right entry point based on who they are.

**Outline:**

```
H1: The Physics of Improvisation
Subtitle: A knowledge graph for the art of human connection — discovered on the
improv stage, applicable everywhere.

[HERO SECTION]
Stats: 149 concepts · 20 threads · 9 learning paths · 5 guides

[SECTION 1: "Not sure where to start?"]
Two entry lanes:

  Lane A: "I don't do improv" (→ Bridge articles)
  - How to Stop Overthinking (16K/mo)
  - Psychological Safety (11K/mo)
  - Active Listening (7.5K/mo)
  - How to Be Funny (6.6K/mo)
  - Stage Fright (6.2K/mo)

  Lane B: "I do improv" (→ Audience selector)
  - I'm just starting → /learn/beginner
  - I'm stuck at a plateau → /learn/intermediate
  - I teach or want to teach → /learn/teacher
  - I perform and want to level up → /learn/performer
  - I research/write about improv → /learn/advanced

[SECTION 2: "Explore by concept"]
Visual grid of 8 concept types with counts:
  Principles (8) · Techniques (26) · Exercises (16) · Formats (8)
  Laws (6) · Definitions (26) · Antipatterns (9) · Patterns (6)
Each links to → /concepts/{type}

[SECTION 3: "The learning paths"]
Cards for all 9 paths grouped by audience:
  Beginner: Foundations, Systems, Physics of Connection
  Intermediate: Self-Coaching Toolkit
  Teacher: Teaching Improv
  Advanced: Reference Guide
  Performer: Mastering the Form, Game & Character, Art of Ensemble

[SECTION 4: "Recent threads"]
Latest 6 threads as cards → /threads/{slug}

[FOOTER]
About · Library · Graph API
```

**Internal links from this page:**
- → 5 bridge articles
- → 5 audience hubs
- → 8 concept type pages
- → 9 paths
- → 6 featured threads
- → /library

---

### `/guides/how-to-stop-overthinking` — Bridge Article

**Purpose:** Rank for "how to stop overthinking" (16K/mo). Deliver complete value. Introduce the improv framework. Funnel into the graph.

**Outline:**

```
H1: How to Stop Overthinking: The Bandwidth Problem

[CONTENT — full article as written in bridges/how-to-stop-overthinking.md]

[SIDEBAR / END SECTION: "Go Deeper"]
Related concepts (linked atoms):
  → Cognitive Bandwidth (/atoms/cognitive-bandwidth)
  → Internal Computation (/atoms/internal-computation)
  → The Obvious Choice (/atoms/obvious-choice)
  → Being Present (/atoms/be-present)

Related exercises:
  → Mirroring (/atoms/mirroring)
  → One-Word Scene (/atoms/one-word-scene)
  → Blind Offer (/atoms/blind-offer)

The full path:
  → Systems of Improv (/paths/systems-of-improv)

Related thread:
  → Quieting the Planning Mind (/threads/quieting-the-planning-mind)

Other guides:
  → Active Listening (/guides/active-listening)
  → Stage Fright (/guides/stage-fright)
  → How to Be Funny (/guides/how-to-be-funny)
```

**Same pattern for all 5 bridge articles** — each links to:
- 4-6 related atoms
- 2-4 related exercises
- 1 primary path
- 1-2 related threads
- 2-3 other bridge articles (cross-linking)

---

### `/guides/psychological-safety` — Bridge Article

```
[CONTENT — full article]

[GO DEEPER]
Atoms: safety-in-the-room, shared-reality-fragility, trust, be-positive,
       vulnerability, blocking, signal, coherence
Exercises: mirroring, gift-giving, last-word-response
Path: Physics of Connection
Thread: Physics of Every Room
Other guides: Active Listening, How to Stop Overthinking
```

### `/guides/active-listening` — Bridge Article

```
[CONTENT — full article]

[GO DEEPER]
Atoms: active-listening, offers, continuous-signaling, cognitive-bandwidth,
       internal-computation, be-present
Exercises: last-word-response, mirroring, one-word-scene
Path: Physics of Connection
Thread: Building on Offers
Other guides: Psychological Safety, How to Stop Overthinking
```

### `/guides/how-to-be-funny` — Bridge Article

```
[CONTENT — full article]

[GO DEEPER]
Atoms: obvious-choice, discovery, game-of-the-scene, be-honest,
       performing-cleverness, game-types, heightening
Exercises: one-word-scene, emotional-honesty-scene, first-line-drill
Path: Systems of Improv (beginner) OR Advanced Game & Character (performer)
Thread: The Game Beneath the Game
Other guides: Active Listening, Stage Fright
```

### `/guides/stage-fright` — Bridge Article

```
[CONTENT — full article]

[GO DEEPER]
Atoms: performance-state, fear-of-failure, be-brave, presence, warm-up,
       commitment
Exercises: mirroring, group-mind-cultivation
Path: The Art of Ensemble
Thread: The Performer's Edge
Other guides: How to Stop Overthinking, Psychological Safety
```

---

### `/learn/beginner` — Audience Hub

**Purpose:** Orient beginners. Show them their 3 paths + the bridge articles that match their concerns.

**Outline:**

```
H1: Starting Improv? Here's Your Map.
Subtitle: Three paths, from "what is this?" to "I can do a scene."

[SECTION 1: "If you're nervous"]
Common concerns addressed with bridge article links:
  - "I overthink everything" → /guides/how-to-stop-overthinking
  - "I'm not funny" → /guides/how-to-be-funny
  - "I have stage fright" → /guides/stage-fright

[SECTION 2: "The three beginner paths"]
Card for each:
  1. Foundations (/paths/beginner-foundations)
     "Start here. Listening, offers, yes-and, blocking."
     Threads: Building on Offers → Presence and Commitment

  2. Systems of Improv (/paths/systems-of-improv)
     "For analytical minds. Understand WHY before you DO."
     Threads: The System Underneath → First Rule → Presence → Quieting the Planning Mind

  3. Physics of Connection (/paths/physics-of-connection)
     "What improv reveals about every conversation."
     Threads: Conversation That Felt Like Magic → ... → Physics of Every Room

[SECTION 3: "Key concepts for beginners"]
Grid of the ~20 atoms most relevant to beginners:
  Principles: be-present, be-positive, be-honest, be-simple, be-brave
  Techniques: yes-and, active-listening, offers, obvious-choice, accepting-the-offer
  Exercises: mirroring, one-word-scene, gift-giving, blind-offer, yes-and-chain
  Definitions: relationship, character, want, base-reality

[SECTION 4: "Essential reading"]
  → What Is Improv? (atom: reality-construction or future guide)
  → The Rules of Improv (atoms: the 8 principles)
```

---

### `/learn/intermediate` — Audience Hub

```
H1: Stuck at a Plateau? Here's Your Diagnostic.
Subtitle: You can do scenes. You can't tell why some work. That changes now.

[SECTION 1: "The knowledge-ability gap"]
Brief explanation of why the 2-year mark feels like regression.
Link: → /guides/how-to-stop-overthinking (adjacent concern)

[SECTION 2: "Your path"]
  Self-Coaching Toolkit (/paths/self-coaching-toolkit)
  Threads: Diagnosing Scene Failure → Discovery → Signal Clarity → The Plateau Is a Map

[SECTION 3: "The diagnostic vocabulary"]
Grid of antipatterns + recovery atoms:
  Antipatterns: bulldozing, steering, hesitation, performing-cleverness,
                overcomplication, internal-computation, judgment
  Recovery: latency-recovery, fracture-recovery, decay-recovery
  Systems: systemic-health-indicators, systemic-collapse-modes

[SECTION 4: "Exercises to break through"]
  emotion-switch, emotional-honesty-scene, no-backspace-scene,
  fracture-repair-drill, first-line-drill
```

---

### `/learn/teacher` — Audience Hub

```
H1: You Can Do It. Now Learn to Teach It.
Subtitle: The performer-to-teacher transition — structure, feedback, and the
ability to explain WHY.

[SECTION 1: "Your path"]
  Teaching Improv (/paths/teaching-improv)
  Threads: System Underneath → Teacher's Toolkit → Building on Offers → Presence

[SECTION 2: "The teacher's toolkit"]
  Pedagogy atoms: safety-in-the-room, curriculum-design, warm-up,
                   side-coaching, giving-notes, reading-the-room

[SECTION 3: "Exercises by level"]
  Beginner exercises: mirroring, one-word-scene, gift-giving, yes-and-chain,
                       blind-offer, last-word-response
  Intermediate exercises: emotion-switch, status-transfer, emotional-honesty-scene,
                           first-line-drill
  Advanced exercises: genre-scene, group-mind-cultivation, directed-scene,
                       organic-opening-exercise

[SECTION 4: "The WHY layer"]
  Laws: irreversibility, cognitive-bandwidth, shared-reality-fragility,
           continuous-signaling, meaning-is-relational, interdependence
  "These give you the explanatory depth to answer 'why does yes-and matter?'"

[SECTION 5: "Bridge articles your students might need"]
  → How to Stop Overthinking (for analytical students)
  → Stage Fright (for nervous students)
```

---

### `/learn/performer` — Audience Hub

```
H1: From Competent to Artist.
Subtitle: Three paths for performers who've mastered the basics and want to
push toward mastery.

[SECTION 1: "The three mastery paths"]
  1. Mastering the Form (/paths/mastering-the-form)
     "Beyond the Harold. Every major format + show-level craft."

  2. Advanced Game & Character (/paths/advanced-game-and-character)
     "Game evolution, pattern breaks, character from body and status."

  3. The Art of Ensemble (/paths/the-art-of-ensemble)
     "Group mind, backline, performance state, finding your voice."

[SECTION 2: "Formats"]
  harold, montage, armando, la-ronde, narrative-longform, organic-longform,
  two-person-longform, genre-format

[SECTION 3: "Advanced game"]
  game-types, game-evolution, pattern-break, analogous-scene, run

[SECTION 4: "Character mastery"]
  physicality, status-dynamics, character-through-game, playing-against-type,
  emotional-range

[SECTION 5: "Show craft"]
  show-dynamic, heat-and-weight, sweep-edit, backline-craft, organic-opening

[SECTION 6: "The performer's edge"]
  performance-state, audience-relationship, failing-forward, finding-your-voice
```

---

### `/learn/advanced` — Audience Hub

```
H1: The Improv Reference Guide
Subtitle: Cross-referenced, multi-tradition analysis. For writers, researchers,
and serious practitioners.

[SECTION 1: "By tradition"]
Links to atoms grouped by which tradition they're most associated with:
  Johnstone: status, offers, blocking, reincorporation, narrative-longform
  Spolin: presence, mirroring, space-work, environment, physicality
  Close/Halpern: harold, group-mind, ensemble, connections, beats
  UCB: game-of-the-scene, heightening, if-this-then-what, mapping, straight-man
  Annoyance/TJ&Dave: commitment, organic-longform, two-person-longform,
                       emotional-truth

[SECTION 2: "By concept type"]
  → /concepts/laws (the physics)
  → /concepts/principles (the behavioral guidelines)
  → /concepts/techniques (the specific moves)
  → /concepts/exercises (the training vehicles)
  → /concepts/formats (the performance structures)
  → /concepts/antipatterns (the failure modes)

[SECTION 3: "The source library"]
  → /library (all reference atoms + books + key resources)

[SECTION 4: "Where traditions disagree"]
  Thread: Traditions in Tension (/threads/traditions-in-tension)
  Key disagreement atoms: yes-and, game-of-the-scene, status, presence, editing
```

---

### `/concepts/principles` — Concept Type Hub (example; same pattern for all 8 types)

**Purpose:** Browse all atoms of a single type. Each type hub is a potential search landing page.

```
H1: The 8 Principles of Improv
Subtitle: The behavioral guidelines that prevent shared reality from collapsing.

[INTRO]
Brief paragraph explaining what principles are in the graph: "Not moral rules.
Structural commands derived from the physics of real-time human interaction."

[GRID OF ATOMS]
For each of the 8 principle atoms:
  - Title (linked to /atoms/{id})
  - One-line summary (first sentence of the atom body)
  - Key links (2-3 most important connections)

  be-positive · be-present · be-thankful · be-honest
  be-simple · be-supportive · be-brave · be-changeable

[RELATED]
  Path: Beginner Foundations (these principles are the core curriculum)
  Thread: Physics of Every Room (principles in action)
  Bridge: Psychological Safety (principles applied to work)
```

**Same pattern for:**
- `/concepts/techniques` (26 atoms) — "The specific moves"
- `/concepts/exercises` (16 atoms) — "The training vehicles"
- `/concepts/formats` (8 atoms) — "The performance structures"
- `/concepts/laws` (6 atoms) — "The physics underneath"
- `/concepts/definitions` (26 atoms) — "The vocabulary"
- `/concepts/antipatterns` (9 atoms) — "The failure modes"
- `/concepts/patterns` (6 atoms) — "The emergent dynamics"

---

### `/library` — Reading List Hub

**Purpose:** All reference atoms + recommended reading. Captures "best improv books" (50/mo) + "improv books" (40/mo).

```
H1: The Improv Library
Subtitle: Every source cited in the knowledge graph, with what to read first.

[SECTION 1: "Start here" — The essential 5]
  1. Impro — Keith Johnstone (1979) → /atoms/ref-impro-johnstone
  2. Truth in Comedy — Halpern/Close/Johnson (1994) → /atoms/ref-truth-in-comedy
  3. UCB Comedy Improvisation Manual (2013) → /atoms/ref-ucb-manual
  4. Improvise — Mick Napier (2004) → /atoms/ref-napier-improvise
  5. Improvisation for the Theater — Viola Spolin (1963) → /atoms/ref-spolin-improvisation-for-theater

[SECTION 2: "Go deeper"]
  6. Impro for Storytellers — Johnstone → /atoms/ref-impro-storytellers-johnstone
  7. Speed of Life — TJ & Dave → /atoms/ref-tj-dave-speed-of-life
  8. Improv Wisdom — Patricia Ryan Madson → /atoms/ref-madson-improv-wisdom
  9. Group Genius — Keith Sawyer → /atoms/ref-sawyer-group-genius
  10. Bossypants — Tina Fey → /atoms/ref-fey-bossypants

[SECTION 3: "The teachers"]
  Will Hines Substack → /atoms/ref-hines-substack
  Jimmy Carrane Improv Nerd → /atoms/ref-carrane-improv-nerd
  Hines Greatest Improviser → /atoms/ref-hines-greatest-improviser

[SECTION 4: "The science"]
  Attention and Effort — Kahneman → /atoms/ref-attention-and-effort-kahneman
  The Viewpoints Book — Bogart & Landau → /atoms/ref-viewpoints-bogart-landau
  Meisner on Acting → /atoms/ref-meisner-on-acting

[SECTION 5: "How to use the library"]
  "Each reference page shows every atom in the graph that cites it.
   Follow the links to see how each source's ideas are distributed
   across the knowledge graph."
```

---

### `/atoms/{slug}` — Atom Detail (ENHANCED)

**Current:** Title, content, connections, provenance. Back button only.
**Enhanced outline:**

```
[BREADCRUMB]
Home > Concepts > {Type} > {Title}

[HEADER]
Badge: ATOM · {TYPE}
H1: {Title}
Tags (pills, linked to concept type pages)
Status: seed/draft/validated

[MAIN CONTENT]
Full HTML of atom markdown

[SECTION: "Connections"]
Grouped by relation type:
  Requires: [linked atoms]
  Enables: [linked atoms]
  Extends: [linked atoms]
  Contrasts: [linked atoms]
  Illustrates: [linked atoms]

[SECTION: "Appears in"]    ← NEW
  Threads: [threads that compose this atom, linked]
  Paths: [paths that contain threads containing this atom, linked]
  Guides: [bridge articles that reference this atom, linked]

[SECTION: "Provenance"]
  Sources: [linked sources]

[SECTION: "Related guides"]  ← NEW
  If this atom is an entry_atom for any bridge article, show the link
  e.g., cognitive-bandwidth → "Featured in: How to Stop Overthinking"

[NAVIGATION]               ← NEW
  ← Previous atom in thread (if viewing from a thread context)
  → Next atom in thread
  ↑ Back to thread / Back to concept type / Back to path
```

---

### `/threads/{slug}` — Thread Detail (ENHANCED)

```
[BREADCRUMB]
Home > {Path title} > {Thread title}

[HEADER]
Badge: THREAD
H1: {Title}
Tags, Status

[MAIN CONTENT]
Full thread markdown

[SECTION: "Concepts in this thread"]
Ordered list of component atoms:
  1. {atom title} — one-line summary (linked)
  2. {atom title} — one-line summary (linked)
  ...

[SECTION: "Part of"]       ← NEW
  Path: {path title} (linked)
  Position: "Thread 2 of 4 in {path title}"

[NAVIGATION]               ← NEW
  ← Previous thread in path
  → Next thread in path
  ↑ Back to path
```

---

### `/paths/{slug}` — Path Detail (ENHANCED)

```
[BREADCRUMB]
Home > Learn > {Audience} > {Path title}

[HEADER]
Badge: PATH
H1: {Title}
Description
Audience tags (linked to /learn/{audience})

[MAIN CONTENT]
Path intro markdown

[SECTION: "The journey"]
Thread sequence with progress indicator:
  ○ Thread 1: {title} — atom count — brief description
  ○ Thread 2: {title} — atom count — brief description
  ...
Each expandable to show component atoms

[SECTION: "Related guides"]  ← NEW
  Bridge articles relevant to this path's audience

[SECTION: "What to explore next"]  ← NEW
  Other paths for the same audience level
  Next-level paths (beginner → intermediate → performer)

[NAVIGATION]
  ← Back to /learn/{audience}
```

---

## Internal Linking Strategy

### Every page links to:
1. **Up** — its parent in the hierarchy (atom→thread→path→audience hub→home)
2. **Sideways** — related content at the same level (atom→related atoms; path→related paths)
3. **Down** — content it contains (path→threads→atoms)
4. **Across** — bridge articles when relevant

### Bridge articles link to:
- 4-6 atoms (the concepts explained in the article)
- 2-4 exercises (practical takeaways)
- 1 primary path (the full learning journey)
- 1-2 threads (the most relevant narrative)
- 2-3 other bridge articles (cross-pollination)

### Concept type hubs link to:
- Every atom of that type
- Related paths that teach those concepts
- Related bridge articles that explain those concepts to general audiences

### Audience hubs link to:
- All paths for that audience
- Key atoms for that level
- Bridge articles that address that audience's concerns

### The graph API serves:
- Potential future interactive graph visualization
- Third-party tools that want to consume the knowledge graph

---

## Crawl Depth Analysis

**Maximum clicks from homepage to any atom: 3**
```
Home → Path → Thread → Atom           (3 clicks)
Home → Concept Type → Atom            (2 clicks)
Home → Bridge Article → Atom          (2 clicks)
Home → Audience Hub → Path → Thread   (3 clicks)
```

**Maximum clicks from any bridge article to deepest atom: 2**
```
Bridge → Atom → Connected Atom        (2 clicks)
Bridge → Thread → Atom                (2 clicks)
Bridge → Path → Thread                (2 clicks)
```

**Every atom is reachable from homepage in ≤ 3 clicks.**
**Every atom is reachable from at least 1 bridge article in ≤ 2 clicks.**

---

## Implementation Priority

### Phase 1: Front Doors (highest SEO impact)
1. Add `bridges` content type to schema + content loader
2. Create `/guides/[slug]` pages rendering bridge articles
3. Add "Go Deeper" sections with atom/thread/path links to each bridge

### Phase 2: Hub Pages (navigation + discoverability)
4. Create `/learn/[audience]` hub pages (5 pages)
5. Create `/concepts/[type]` hub pages (8 pages)
6. Create `/library` page

### Phase 3: Enhanced Navigation (internal linking)
7. Add breadcrumbs to all pages
8. Add "Appears in" section to atom pages (reverse-lookup threads/paths/guides)
9. Add prev/next navigation to threads and atoms within thread context
10. Rewrite homepage with the two-lane entry + concept grid

### Phase 4: Cross-Linking (thread consumption)
11. Add "Related guides" to path pages
12. Add "What to explore next" to path pages (progression across audiences)
13. Add cross-links between bridge articles
14. Add "Featured in" badges to atoms referenced by bridge articles
