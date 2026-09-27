# What belongs on the homepage

**Date:** 2026-09-27
**Status:** ruled and built; `src/lib/__tests__/homepage-principles.test.ts` holds the shape.
**Companion:** `docs/backlog/context-mistakes.md` (the 2026-09-27 entry), `docs/ux-audit-matrix.md` (section 1).

The question was what a homepage should carry and what belongs to navigation
instead, where the published schools disagree, and which of them this site
should follow. The rule of the entry-point epic applies: measure the page
before designing for it. So this starts with the page as it was that morning.

## 1. The homepage as measured, 2026-09-27

Playwright in Chrome against the production build, light theme.

| | Desktop 1280×800 | Phone 390×780 |
|---|---|---|
| Document height | 4,096 px, 5.1 screens | 6,534 px, 8.4 screens |
| Hero height | 589 px, 0.74 of the viewport (nav above it) | 780 px, 1.00 of the viewport |
| First thing under the hero | opening argument, at screen 0.89 | opening argument, at screen 1.08 |
| Symptom finder starts | screen 1.52 | screen 2.07 |
| Topic directory ("Where this applies") starts | screen 2.21 | screen 3.21 |
| Tallest block | "Where to start next", 860 px, 28 boxed links | the same, 1,656 px, 2.1 screens |
| Body links / body buttons | 74 / 10 | 74 / 10 |
| Hero links / hero buttons | 0 / 2 | 0 / 2 |

The hero's two buttons opened a modal ("What are you here for?") that asked a
second question ("Where does it matter most?" / "Where are you with it?")
before offering a link. Every answer the modal could give was already on the
page: the applied door's four answers were the guide clusters, rendered again
at screen 2.2; the craft door's four answers were the audience hubs, reachable
from the hub row at the foot of the page.

Search Console, 2026-02-01 to 2026-09-27: no row for the homepage URL, under
an exact and a suffix filter. The pages Google shows are guides, library
entries and concept pages. Whoever reaches the homepage reaches it from inside
the site or by typing the name, which is the reader Spool describes: someone
who has already seen a content page and wants to know what else is here.

Not measured: how often the doors were opened. The PostHog events
(`home_door_opened`, `home_door_answered`, `home_door_followed`) exist and were
not read before the doors went. The next homepage change should read its
events first.

## 2. The schools, and where they conflict

### 2.1 What a homepage is for

**Nielsen (2001), 113 guidelines.** Say what the site does in a tagline
(guideline 2); emphasise the highest-priority tasks so users have a clear
starting point, keep the core tasks to one to four, and keep the area around
them clear — "if you emphasize everything, nothing gets focus" (guideline 4);
reveal the content through examples linked directly to their pages rather than
to category pages (29, 30); begin links with the information-carrying word and
never "click here" (34, 35); put a search box, not a link to search, on the
page (47–49); keep critical elements above the fold with visual cues that more
exists (66); no splash screens, no popups (85, 86).

**Krug (2000, revisited 2014).** The homepage answers four questions at a
glance: what is this, what can I do here, what do they have here, why should I
be here and not somewhere else. "As much space as you need, but no more than
necessary"; no mission statements.

**NN/g (Wang, 2024), five principles.** Reach the homepage from everywhere;
say who you are and what you do; reveal content through examples; prompt
actions with specific, high-scent labels; keep it simple, with minimal motion.
It warns against full-bleed heroes that create false floors, and asks for the
most critical content above the fold with a clear sign that more follows.

**Spool (2011, *The Secret Lives of Links*).** Design from the content pages
outward, not from the homepage inward: readers arrive on the page that matched
their need, and the homepage is where they go afterwards. Links are the
navigation; readers hunt for trigger words and follow scent; a search box is
"bring your own link", used when the links failed. Walgreens: five links took
59% of clicks and 3.8% of the space — size targets by demand, not by the
business's priorities.

**McGovern, Top Tasks.** A handful of tasks carries as much demand as the long
tail put together; design the page for those and remove the rest.

*The conflict.* Nielsen and Krug treat the homepage as the front door and give
it jobs; Spool treats it as the least important page and gives it one job, a
good table of contents. *The resolution here.* The measurement settles it:
nobody arrives at this homepage from search, so Spool's reader is the only
reader. But that reader still asks Krug's four questions on arrival, so the
front-door jobs survive in the smallest form Nielsen allows — a tagline, one
starting point, the site's structure as links with scent.

### 2.2 Audience-based navigation

**NN/g (Sherwin, 2015).** Five reasons to avoid it as the primary route:
readers do not reliably know which group they belong to, or belong to several;
they cannot tell whether a section is *about* a group or *for* it; choosing
before seeing anything is a cost in a task-focused mind; readers wonder what
the other groups get; the sections overlap and duplicate. Prefer topics and
tasks; offer audience routes as secondary or tertiary navigation, labelled
plainly with "for".

**This site's own finding (April audit; `home-doors.ts`).** Two readers want
opposite things from the same material, and the symptom finder's first-person
questions are the wrong question for one of them.

*The conflict.* The site's finding is real, and the fix it chose — ask the
audience question first — is exactly the pattern the research says to avoid as
a first step. *The resolution.* Both are honoured by rank, not by choosing one:
the primary structure is by topic (the clusters) and by task (the symptom
finder); the two audiences are two plain lines in the hero, links, labelled
"For better conversations" and "For improvisers", that a reader who is
neither, or both, scrolls past at no cost.

### 2.3 Modals and wizards for routing

**NN/g (Fessenden, 2017).** A modal interrupts on purpose; use it to prevent an
irreversible action, to ask for information the current process cannot
continue without, or to break a complex task into steps. Not for navigation,
and not for content unrelated to the reader's goal.

**NN/g (Budiu, 2017).** Wizards suit unfamiliar, infrequent processes and
readers who do not know enough to choose; they "can quickly become annoying and
overly controlling if they have to be used over and over".

**The case for the doors.** A guided route helps the reader who does not know
the site's vocabulary — the same argument that justifies the symptom finder.

*The conflict.* Guidance versus interruption. *The resolution.* Guidance is
kept where it is guidance: the symptom finder asks in the reader's words and
reveals its answer in place, with every route in the html. The homepage is
revisited on every session by the returning reader (persona G, the audit's
most likely homepage visitor), which is the case Budiu names; and a dialog
between the tagline and every link is a modal used for navigation, which
Fessenden rules out. The doors' content moved onto the page.

### 2.4 The fold

**"The fold is dead."** Readers scroll; long pages are normal; designing to a
fold is designing to a fiction.

**NN/g (2018, *Scrolling and Attention*).** Readers spend 57% of their viewing
time above the fold and 74% in the first two screenfuls; the drop after the
fold is as sharp in 2018 as in 2010. **NN/g (Flaherty, 2016, *The Illusion of
Completeness*).** A hero that fills the viewport with a clean edge reads as the
whole page; in the Maple study six of eight participants never scrolled past
a full-screen video. The fix is content that peeks above the fold, not an
instruction to scroll.

*The conflict.* Both are true: readers scroll, and attention still falls off
a cliff at the first edge that looks like an end. *The resolution.* The hero
is a panel of its own height, so the opening argument peeks under it on a
phone, and the footnote that used to say "Scroll for what keeps breaking"
goes, because a visible slice of the next section does its job better.

### 2.5 How many links

**Fewer choices.** Hick's law, the paradox of choice, the marketer's single
call to action.

**More links, better scent.** Spool: the count is not the problem, weak scent
is; Walgreens shows the demand sitting in five links. Nielsen 34 and 35:
scannable links that lead with the information-carrying word. Baymard: static
sections a reader scrolls perform as well as any carousel and are simpler.

*The conflict.* Both describe a real cost, decision cost against search cost.
*The resolution.* Hick's law is about equally-likely alternatives that must
be compared; a directory with scent is scanned, not compared, so the count of
links is not the constraint. The constraint is the count of *questions*: the
page asked three — which reader are you, start here, what is breaking — in
three different forms. One starting point, and the rest as links.

### 2.6 Show content, or navigate

**Nielsen 29–30 and NN/g 2024.** Reveal the content through examples that link
straight to the page. **The table-of-contents view.** A homepage is an index;
prose on it is in the way.

*The resolution.* Both, in their places: the symptom finder is content in the
reader's trigger words ("I freeze and overthink") with direct links; the two
prose sections (the craft, the vocabulary underneath) are examples with links;
the directory and the hub row are the index.

### 2.7 Search

**Nielsen 47–49.** An input box on the homepage, wide enough to read a query,
at the top of the main body. **NN/g (*The Magnifying-Glass Icon*).** An icon
alone is less noticeable and is not recommended on desktop; a field with a
button is. **Spool.** Readers prefer links when the links are good; search is
what they do when the links failed.

*The resolution.* The nav's icon stays. The homepage gains a field with a
button, in the shortcuts row at the foot rather than at the top of the body:
this is a link-dominant site — a small corpus with strong scent — and the
reader who wants a box is the one who already knows what they want, which is
what that row is for. Nielsen 47 satisfied; 49 overruled by Spool, with the
reason written down.

### 2.8 Obvious over clever

**Wroblewski, *Obvious Always Wins*.** Visible navigation beats hidden
navigation; the products that moved from a hamburger to a visible bar saw
engagement rise. **Krug.** Make choices mindless: a thing that looks like a
link should be a link. **Norman.** Signifiers should tell the truth about what
an element does.

*The resolution.* The hero's two cards looked like links and were buttons that
opened a question. They are links now.

## 3. The rules this page is held to

1. The hero says what the site is and does, in the reader's language, and
   holds one starting point — the beginner programme, or the reader's own
   journey once there is one. *(Nielsen 2, 4; Krug; NN/g 2024)*
2. The hero is a panel of its own height, not the viewport, so the first
   screen never ends on a clean edge: on a desktop the opening argument
   peeks under the panel; on a phone the fold cuts through the start card.
   *(Flaherty 2016; NN/g 2018; Tognazzini's criterion, that a screen which
   breaks across an element does not look complete)*
3. Audience routes are secondary: two lines, links, labelled with "for". The
   primary structure is by topic and by task. *(Sherwin 2015)*
4. Nothing on the homepage asks a question before it links. No modal, no
   wizard, no button where a link would do. *(Fessenden 2017; Budiu 2017;
   Wroblewski)*
5. Every route the page offers is in the server html, once each as a
   section: the clusters, the levels, the hubs. *(Spool; Sherwin reason 5)*
6. The page runs in the order attention does: start, problem, topic, level,
   then the craft, the vocabulary, the tail of guides, the shortcuts and a
   search field. *(NN/g 2018; McGovern)*
7. Links lead with the information-carrying word and go to the page they
   name. *(Nielsen 29, 30, 34, 35)*
8. A search field with a button, on the page, not only an icon. *(Nielsen
   47; NN/g magnifying-glass)*
9. The returning reader's continue card takes the starting point's slot,
   never a second slot. *(unchanged from 2026-09-22; homepage-journey-slot)*

## 4. What failed, and what changed

| Rule | The page on 2026-09-27, morning | Built |
|---|---|---|
| 1 | Tagline good. Three starting points: two doors, a start card, the finder. | The start card is the hero's second column; the finder follows the opening argument. |
| 2 | Hero exactly one viewport on a phone, nothing peeking; a footnote asked the reader to scroll. | Panel of content height; the footnote is gone. Desktop: the opening argument starts at 0.83 of the viewport. Phone: the panel ends 73 px past the fold, which cuts through the start card under its button; the argument starts at 1.09 screens. The day-1 preview and the programme's meta line are hidden below 640px to get there. |
| 3 | Audience question first, as the hero's only action. | Two lines under the tagline, links to `/guides` and `/learn/beginner`. |
| 4 | Two buttons, a dialog, a second question, then links; the dialog trapped focus and locked scroll. | Links. The hero is a server component; the `HomeHero` client code, its dialog and its three events are removed. |
| 5 | The craft door's four levels existed only inside the dialog. | A "Start by level" section: each level with its recommended path and its hub. The clusters grid stays where it was. |
| 6 | Topic directory at screen 3.2 on a phone; the tallest block was the tail of 28 boxed guides. | Order as in rule 6; the tail is a list of names. |
| 7 | "Start by Level" in the hub row pointed at one level. | The level list names all four; the row loses the duplicate. |
| 8 | Icon in the nav only. | A field and a button in the shortcuts row, posting to `/search`. |
| 9 | Held. | Held; the slot moved with the card. |

Left as it was, on purpose: the symptom finder (the task-based router the
research prefers), its five recommendations of the same beginner programme
(the finder's design, not the homepage's), the craft and vocabulary sections
(examples with links), and the teams line under the finder (EC-4.1, held by
`ux-audit-status.test.ts`).

### 4.1 The page as measured after the change, 2026-09-27

| | Desktop 1280×800 | Phone 390×780 |
|---|---|---|
| Document height | 3,883 px, 4.9 screens | 6,133 px, 7.9 screens |
| First thing under the hero | opening argument, at screen 0.83 | opening argument, at screen 1.09 |
| Symptom finder starts | screen 1.11 | screen 1.54 |
| Topic directory starts | screen 1.80 | screen 2.67 |
| Level list starts | screen 2.23 | screen 3.36 |
| Tallest block | the symptom finder, 423 px | the tail of guides, 870 px, down from 1,656 |
| Body links / body buttons | 79 / 11 | 79 / 11 |
| Hero links / hero buttons | 4 / 0 | 4 / 0 |

The first screen on both holds the name, the tagline, both audience links,
the programme's title, its rationale and its start button. The topic
directory moved from screen 2.2 to 1.8 on a desktop and from 3.2 to 2.7 on
a phone; the level list, which did not exist on the page, sits at 2.2 and
3.4. The returning reader's continue card takes the slot on both.

## 4.2 Round two, 2026-09-27, afternoon

Two changes from a second reading of the built page, before the PostHog
record could be read (section 6).

- **The phone's first screen holds the whole starting point.** The two
  audience lines sat between the tagline and the start card and pushed
  the card's button to the last row of a 390×780 screen. The card now
  follows the tagline and the lines follow the card, so the first screen
  holds the name, the tagline, the programme's title, its rationale, its
  button and both audience links, and the fold falls after the lines. On a
  wide screen nothing moves: the grid keeps the name, the tagline and the
  lines in the first column with the slot beside them.
- **The improvisers' line lands on the level list.** It pointed at the
  beginner hub, which is the right page for one of the four readers the
  line is for and the wrong-level landing the April audit's rows D, E and
  F describe. It is an in-page link to the level list now, which is the
  answer for all four; the built guard checks the target section exists
  below the hero. The level rows read "Everything at this level — hub"
  rather than with a second colon.

Measured after: the phone's opening argument starts at screen 1.12 (was
1.09, the lines having moved under the card); the desktop is unchanged at
0.83. Live on production, the deploy of the morning's change measured
identically to the local build on every row of the table in 4.1.

## 5. How to verify

- **Shape:** `homepage-principles.test.ts` (source and built), `home-hero-component.test.tsx`, `homepage-journey-slot.test.ts`, `body-click-depth.test.ts`.
- **Reach:** the hero's start button and the level list are tracked blocks (`home-hero`, `home-levels`); read their clicks in PostHog against `home_door_*` for the fortnight before 2026-09-27.
- **Attention:** re-run the measurement in section 1 after any change to the hero; the phone hero must end short of the viewport with the opening argument visible under it.

## Sources

- Jakob Nielsen, [113 Design Guidelines for Homepage Usability](https://www.nngroup.com/articles/113-design-guidelines-homepage-usability/), NN/g, 2001.
- Huei-Hsin Wang, [Homepage Design: 5 Fundamental Principles](https://www.nngroup.com/articles/homepage-design-principles/), NN/g, 2024.
- Katie Sherwin, [Audience-Based Navigation: 5 Reasons to Avoid It](https://www.nngroup.com/articles/audience-based-navigation/), NN/g, 2015.
- Therese Fessenden, [Modal & Nonmodal Dialogs: When (& When Not) to Use Them](https://www.nngroup.com/articles/modal-nonmodal-dialog/), NN/g, 2017.
- Raluca Budiu, [Wizards: Definition and Design Recommendations](https://www.nngroup.com/articles/wizards/), NN/g, 2017.
- Kim Flaherty, [The Illusion of Completeness](https://www.nngroup.com/articles/illusion-of-completeness/), NN/g, 2016.
- NN/g, [Scrolling and Attention](https://www.nngroup.com/articles/scrolling-and-attention/), 2018.
- NN/g, [The Magnifying-Glass Icon in Search Design: Pros and Cons](https://www.nngroup.com/articles/magnifying-glass-icon/).
- Jared Spool, *The Secret Lives of Links* — [notes by Jeremy Keith](https://adactio.com/journal/4539), 2011.
- Steve Krug, *Don't Make Me Think, Revisited* (2014), chapter on the homepage — [notes](https://www.willpatrick.co.uk/notes/dont-make-me-think-steve-krug/).
- Gerry McGovern, [What Really Matters: Focusing on Top Tasks](https://alistapart.com/article/what-really-matters-focusing-on-top-tasks/), A List Apart.
- Luke Wroblewski, [Obvious Always Wins](https://www.lukew.com/ff/entry.asp?1945).
- Baymard Institute, [10 UX Requirements for Homepage Carousels](https://baymard.com/blog/homepage-carousel).

## 6. The PostHog record, pending

The site captures to PostHog through the project's public key, which can
write events and not read them; no personal key is on this machine, so the
record could not be read on 2026-09-27. A reader is prepared in the session
scratchpad (`posthog-read.mjs`): it takes `POSTHOG_PERSONAL_API_KEY` from
`.env.local` (gitignored; the value never enters a conversation), finds the
project by its public key, and runs the HogQL below. What each reading
would change:

| Reading | Query | If it says | Then |
|---|---|---|---|
| Homepage sessions that opened a door, 09-22 to 09-27 | `home_door_opened` sessions ÷ homepage `$pageview` sessions | under one in ten | the doors were passed over; the audience lines are the right weight |
| | | over one in three | the audience question had pull; give the two lines the card's treatment |
| Door answers followed | `home_door_followed` by `answer` and `which` | one answer took most of the clicks | put that destination in the hero's own words |
| Finder use per homepage view | `symptom_selected` ÷ homepage views | under one in twenty | the finder is skipped; move the topic directory above it |
| Finder routes | `symptom_route_clicked` by `target_type` | the guide beats the programme | lead each panel with the guide and demote the programme link |
| Scroll depth on `/` | `$prev_pageview_max_scroll_percentage` on leave events | median under a half | the level list and the tail are unseen; shorten or lift |
| Clicks by block on `/` | `link_clicked` by `block` | the footer out-clicks every body block | the body's directory is not doing its job; revisit the order |
| Continue card | `learning_recommendation_shown` ÷ `clicked`, surface `continue_journey` | shown often, clicked rarely | the card's copy, not its place |
| The new blocks | `link_clicked` for `home-hero`, `home-levels`, `home-applies`, `home-hubs` since deploy | | the baseline for the next round |

Search Console cannot stand in for any of this: it sees searchers, and the
homepage has none.
