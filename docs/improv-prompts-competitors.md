# Improv prompts and the generator: every competitor, and every way to beat them

Read 2026-09-30. The aim is stated by the owner: the best improv prompts page
and generator in the world, carrying every feature the field has without adding
complexity to the interface. This file is the running list of competitors, the
evaluation of each, and the improvement list. Add to it when a new tool or list
appears; date every addition.

## 1. How the field was read

- **Discovery.** The US results pages for `improv prompts` and
  `improv prompt generator` (Ahrefs `serp-overview`, 2026-09-30), and four web
  searches: prompt generator, scene suggestion generator, scenario generator
  app, best prompts lists. A 2021 review of generators (thephoenixremix) named
  two more.
- **Evaluation.** Every page was opened in a mobile browser (390px, JavaScript
  on), its controls counted, its main button pressed once, a screenshot taken.
  Pages that refused a headless browser were fetched server-side; the two app
  stores were read through Chrome. Scratch scripts: `competitors.mjs`,
  `competitors2.mjs`, not kept.
- **Not read.** Two Reddit threads ("Improv Suggestion Generator", position 1
  for the generator query, and "I have collected a truly insane number of improv
  prompts", position 4 for the prompts query) — Reddit refuses every fetch this
  session can make. Loulou's generator (tim.cgmatane.qc.ca) is down;
  englishprompts.com/improv now redirects to a parked domain; the Improv Tools
  iOS listing returns 404. Listed below as unread or dead rather than dropped.

## 2. Our baseline

**/improv-prompts** — "Improv Prompts: 140 Scene Starters for Class or Stage".
3,909 words. Sections: what makes a prompt work; relationship prompts; first
lines; locations; situations with something already wrong; questions to ask an
audience; using prompts in a drama class (safe in a school room, running a
round with a full class, which suit which age, twenty for a school room, ten for
a corporate session, what goes wrong); why the absurd ones backfire; how to use
a prompt without being imprisoned by it; four questions people ask; practise the
starting part. The hero is the generator. 125 internal links, no images, one
email capture.

**/tools/improv-prompt-generator** — "Improv Prompt Generator: Ranked Scene
Starters for Any Room". The same generator with the argument beside it: what it
draws from, how it ranks, what the room changes, why it never repeats, four
questions. 73 kB, no ads, no account, dark mode, keyboard-visible focus.

**The generator.** Three screens and eleven choices:

| Screen | Controls                                                                                                                                                                          |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Room   | 4 cards: a class or rehearsal · a show, with an audience · a school drama room · a team or work session                                                                           |
| Kind   | 6 cards: a relationship · a first line · a location · something already wrong · a question for the audience · a shared task                                                       |
| Prompt | the prompt in display type, "N of M left", one line on how to use this kind, "the idea behind it" (a link to the concept), then **Another one** · **Copy** · **A different kind** |

Underneath: 455 prompts (94 relationships, 79 first lines, 70 locations, 68
situations, 56 audience questions, 88 tasks), each scored 1–5 on five axes
(specificity, openness, charge, playability, groundedness), weighted per room
(a school room puts 40% on playability, a show 35% on specificity), filtered per
room by three flags (lands on a real life, needs adult knowledge, has a built-in
performer role), drawn best-band-first at random, and never repeated on the same
device until the pool is exhausted. A concept page can open the generator preset
to its kind (`?category=`). Every event is tracked.

What no competitor has: the room, the ranking, the filters, the no-repeat
store, the how-to line, the link from a prompt to its theory, and a page that
argues why absurd premises make bad scenes.

## 3. The running list

DR and traffic are Ahrefs, US, 2026-09-30, where the page sat in a results page
read that day; blank means it did not.

| #   | Competitor                                                           | Kind             | URL                                                                                   | DR / traffic | Status               |
| --- | -------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------- | ------------ | -------------------- |
| 1   | Radical Agreement — Improv Prompts, Examples & Exercises             | list             | radicalagreement.com/post/improv-prompts                                              | 35 / 1,439   | evaluated            |
| 2   | Backstage — 30 Improv Prompts                                        | list             | backstage.com/magazine/article/improv-prompts-79060/                                  | 85 / 462     | evaluated            |
| 3   | r/improv — "truly insane number of improv prompts"                   | community        | reddit.com/r/improv/comments/yk1gba/                                                  | 95 / 102     | unread (blocked)     |
| 4   | New York Improv Theater — 100 scene starters                         | list             | newyorkimprovtheater.com/2024/07/30/fun-with-ai-100-improv-scene-starter-suggestions/ | 33 / 78      | evaluated (fetched)  |
| 5   | teambuilding.com — #1 Free Improv Prompts, Topics & Scene Generator  | list + generator | teambuilding.com/blog/improv-prompts                                                  | 75 / 87      | evaluated            |
| 6   | AI Academy (techpresso) — 40 Improv Prompts                          | list, gated      | academy.techpresso.co/prompts/improv-prompts                                          | —            | evaluated            |
| 7   | Theatre Haus — 30 Powerful Improv Prompts for the Drama Classroom    | list             | theatrehaus.com/2023/04/30-powerful-improv-prompts-for-the-drama-classroom/           | 40 / —       | evaluated            |
| 8   | Theatrefolk — Tons of Opening Line Prompts                           | list + PDF       | theatrefolk.com/blog/resource-tons-of-opening-line-prompts                            | —            | evaluated            |
| 9   | r/improv — "Improv Suggestion Generator"                             | community        | reddit.com/r/improv/comments/1kek047/                                                 | 95 / 109     | unread (blocked)     |
| 10  | Golden-Yiannis — Improv Prompt Generator                             | generator        | prompt-generator.webflow.io                                                           | 92 / 92      | evaluated            |
| 11  | Glasgow Improv Theatre — Improv Suggestion Generator (+ Android app) | generator        | improvglasgow.co.uk/improv-suggestion-generator/                                      | 20 / 108     | evaluated            |
| 12  | Theatre Haus — Improv Prompt Generator                               | generator        | theatrehaus.com/ipg/                                                                  | 40 / 43      | evaluated            |
| 13  | Impromuse — Improv scene suggestions generator                       | generator        | impromuse.com                                                                         | 4 / 56       | evaluated            |
| 14  | Tadgola — Prompt Generator                                           | generator        | tadgola.com/prompt-generator                                                          | 0 / 15       | evaluated            |
| 15  | Can I Get A…                                                         | generator        | can-i-get-a.com                                                                       | 10 / 18      | evaluated            |
| 16  | New York Improv Theater — Scene Suggestion Generator                 | generator        | newyorkimprovtheater.com/improv-scene-suggestion-generator/                           | 33 / —       | evaluated (fetched)  |
| 17  | Improv Bible — Improv suggestion generator                           | generator        | improvbible.com/en/suggestions                                                        | —            | evaluated            |
| 18  | Andi Smith — Improv Suggestions                                      | generator        | andismith.com/games/improv-suggestions/                                               | —            | evaluated            |
| 19  | Drama Puzzles — Improv Prompt Generator                              | generator        | dramapuzzles.com/improv-prompt-generator/                                             | —            | evaluated (fetched)  |
| 20  | The Drama Teacher — Improv Generator                                 | generator        | thedramateacher.com/improv-generator/                                                 | —            | evaluated (fetched)  |
| 21  | AI Free Forever — Improv Prompt Generator                            | AI generator     | aifreeforever.com/tools/improv-prompt-generator                                       | —            | evaluated            |
| 22  | Randomness.app — Random Improv Generator                             | generator        | randomness.app/random-improv-generator/                                               | —            | evaluated            |
| 23  | Improv Toolbox                                                       | web app          | improv-toolbox.com                                                                    | —            | evaluated            |
| 24  | Improov — Play Your Stories                                          | Android app      | play.google.com (com.improvapp.improv)                                                | —            | evaluated (store)    |
| 25  | Improv Suggestion Generator (Glasgow's app)                          | Android app      | play.google.com (improv.suggestion.generator)                                         | —            | evaluated (store)    |
| 26  | ImPrompt                                                             | iOS app          | apps.apple.com/us/app/imprompt/id1661950764 · impromptapp.com                         | —            | evaluated (site)     |
| 27  | Improv Tools                                                         | iOS app          | apps.apple.com/gb/app/improv-tools/id6477751204                                       | —            | dead link (404)      |
| 28  | Loulou's Improv Generator                                            | generator        | tim.cgmatane.qc.ca/lougen/improv-generator.html                                       | —            | down                 |
| 29  | English Prompts — Improv                                             | generator        | englishprompts.com/improv/                                                            | —            | dead (parked domain) |
| 30  | The Phoenix Remix — review of improv generators (2021)               | review           | thephoenixremix.com/2021/07/05/improv-corner-improv-generators/                       | 39 / 19      | evaluated (fetched)  |

Also on the prompts results page and not competitors: a kids' game page
(childsplayinaction), an essay on taking suggestions (sidrdesai.substack), a
Pinterest ideas page, a paid PDF (dramatrunk), a paid booklet (tes.com).

## 4. What each one does

### The lists

- **Radical Agreement** (the page that ranks first for the term). 77 prompts in
  four tiers of complexity: classic (23), classic with comedy (28), with premise
  (16), never before seen (10). Makes the same distinction we do — a
  "suggestion" like _spaghetti_ against a "prompt" that fixes a base reality —
  and names base reality by name. Links englishprompts as its generator (now
  dead). CTAs to a free workshop and a form to submit "initiations". 1 MB page,
  Wix, 15 images, share buttons and like counts on every post.
- **Backstage.** 30 prompts in three tiers — familiar real-world, unfamiliar
  real-world, supernatural — each a second-person situation ("You're breaking up
  with your romantic partner"). 213 links, 23 iframes, sign-in prompts. No
  method, no advice on running them.
- **teambuilding.com.** The biggest list: 26 funny, 20 random, 21 serious, 18
  scene ideas, 53 opening lines, 66 settings, 37 characters — 241 items — plus a
  one-button generator at the top whose output we could not capture, an FAQ,
  and a "Final thoughts". Premise-heavy ("holiday mascots on criminal trial"),
  no method, no age or room guidance. Has a web manifest.
- **AI Academy.** 40 prompts in 8 categories — beginners, two-person, group
  games, emotion and status switches, musical and genre, games and warm-ups,
  kids and classroom, one-word and object — each card with a description, a
  **pro tip** and its own **Copy** button. Only the first five are free; the
  rest are behind an email or a payment. AI-written. This is the one list whose
  format is ahead of ours: coaching on the prompt, not only on the category.
- **Theatre Haus list.** 30 premises for a drama classroom, ads, no method.
- **Theatrefolk.** 50 opening lines on the page, 50 more as a PDF for an email
  and a grade level. The method it teaches — print, cut into slips, draw from a
  bag — is the one every drama teacher actually uses.
- **NYIT list.** 100 starters in five categories (locations, activities, events,
  strange objects, odd jobs), AI-generated and says so. Blocks crawlers.

### The generators

| Generator         | What it draws                                                                                                                                                  | Controls                                                                                                                                 | Notable                                                                                          |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Improv Bible      | location, relationship, object, first line; "the classic: who · where · what" as one draw                                                                      | Draw everything · Clear · **Show mode** (big screen) · **Propose an idea** (community pool, moderated)                                   | "Free, ad-free, no account". Writes the pool with its users. The closest thing to ours in taste. |
| Andi Smith        | 11 categories: activities, characters, emotions, famous, genres, jobs, locations, objects, relationships, songs, words                                         | Reroll · **Starred** (favourites) · **draw 1–8 at once** · **reroll timer** (every N seconds) · 6 languages · category picker (settings) | 4,360 suggestions; relationships "between characters that know each other". Loud, many controls. |
| Improv Toolbox    | 23 tools: scene generator, prompt cards, audience suggestions, archetype wheel, emotion wheel, scene constraints, status randomiser, scene timer, story spine… | favourites per tool, search, EN/PL, dark mode, offline (PWA)                                                                             | A toolbox, not a generator; 54 buttons on the home screen.                                       |
| AI Free Forever   | AI text in seven formats (scene setup, character, conflict, one-liner, location, object, custom), cast size (solo, duo…), style tags ("Absurd" + "Historical") | share, dark mode, 10 languages, form fields                                                                                              | Unlimited and generic; ads; 35 controls.                                                         |
| Drama Puzzles     | five reels: character, situation, setting, style, space                                                                                                        | **Spin** · **padlock per reel** · disable a reel · help notes · fullscreen · sound                                                       | For VCE Drama, 14–18; performance checklist and reflection prompts beside it. Blocks crawlers.   |
| The Drama Teacher | scene description, theatre convention, dramatic element, performance space, time limit                                                                         | reveal one at a time for difficulty; start again                                                                                         | Built for the classroom screen. Blocks crawlers.                                                 |
| Theatre Haus IPG  | a premise, then a **twist**                                                                                                                                    | Generate Prompt · Generate Twist · New · Reset                                                                                           | "You are magicians whose tricks keep going wrong." Ads.                                          |
| NYIT generator    | WHO · WHERE · WHAT, 50 each                                                                                                                                    | Next Scene Suggestion                                                                                                                    | Sells "125,000 potential scene starters".                                                        |
| Glasgow           | word, emotion, location, job; random Wikipedia article, song, line from Moby Dick                                                                              | seven buttons                                                                                                                            | 4 kB. The Android app is the same thing (3.7★, 21 reviews, 1K+ installs).                        |
| Can I Get A       | location, relationship, word                                                                                                                                   | three buttons                                                                                                                            | 5 kB, mobile-first; the 2021 review's favourite for simplicity.                                  |
| Impromuse         | objects, locations, professions, relationships, actions, emotions, habits, abstract                                                                            | tap a category; Save; PWA                                                                                                                | 1,291 suggestions; 18 words of copy.                                                             |
| Tadgola           | a premise                                                                                                                                                      | one button                                                                                                                               | "You lost your loved one in Kumbh Mela."                                                         |
| Golden-Yiannis    | a skit premise                                                                                                                                                 | one button                                                                                                                               | "Wizard of oz is skeezy." Ranks 2nd on the generator query on a DR 92 webflow subdomain.         |
| Randomness.app    | characters, scenes, settings, situations, twists, genres                                                                                                       | Generate                                                                                                                                 | Generic random-generator site; ads.                                                              |
| Improov (app)     | themes, characters (traits, quirks, voices), scene starters with objectives, training sessions                                                                 | favourites and folders, show scoreboard and timer, offline, 7 languages, in-app purchases                                                | 1K+ installs. The most complete app; a course and a directory bolted on.                         |
| ImPrompt (app)    | improv and RPG prompts                                                                                                                                         | **lock what you like, regenerate the rest**; timers; $0.99                                                                               | Built because "existing generators lacked customisation"; still in development.                  |

What the 2021 review valued, in its own words: variety, easy mobile navigation,
diverse categories, minimal repetition, a working clear button.

## 5. Feature matrix

✓ has it · ~ partly · — no. Ours is the first column.

| Feature                                    | Ours         | Improv Bible | Andi Smith | Toolbox | AI Free Forever | Drama Puzzles  | Drama Teacher  | Theatre Haus | NYIT | Glasgow | Can I Get A | Impromuse | Improov | ImPrompt |
| ------------------------------------------ | ------------ | ------------ | ---------- | ------- | --------------- | -------------- | -------------- | ------------ | ---- | ------- | ----------- | --------- | ------- | -------- |
| Room or audience chosen first              | ✓            | —            | —          | —       | ~ (cast size)   | — (one room)   | — (one room)   | —            | —    | —       | —           | —         | —       | —        |
| Prompts ranked, not only random            | ✓            | —            | —          | —       | —               | —              | —              | —            | —    | —       | —           | —         | —       | —        |
| Never repeats until exhausted              | ✓            | —            | ~          | —       | —               | —              | —              | —            | —    | —       | —           | —         | —       | —        |
| Kid-safe filter                            | ✓            | —            | —          | —       | —               | ~ (built for)  | ~ (built for)  | —            | —    | —       | —           | —         | —       | —        |
| How to use this kind, on the card          | ✓            | —            | —          | —       | —               | ~ (help)       | —              | —            | —    | —       | —           | —         | —       | —        |
| Link from prompt to theory                 | ✓            | —            | —          | ~       | —               | —              | —              | —            | —    | —       | —           | —         | —       | —        |
| Copy                                       | ✓            | —            | —          | —       | ✓               | —              | —              | —            | —    | —       | —           | —         | —       | —        |
| Relationship · location · task in one draw | —            | ✓            | ~ (1–8)    | ✓       | ✓               | ✓              | ✓              | —            | ✓    | —       | —           | —         | ✓       | ✓        |
| Lock part of a draw, redraw the rest       | —            | —            | —          | —       | —               | ✓              | ~              | —            | —    | —       | —           | —         | —       | ✓        |
| Show mode / big screen                     | ~            | ✓            | —          | —       | —               | ✓ (fullscreen) | ✓              | —            | —    | —       | —           | —         | ~       | —        |
| Twist or complication mid-scene            | ~ (at start) | —            | —          | ✓       | —               | —              | ✓ (convention) | ✓            | —    | —       | —           | —         | —       | —        |
| Objects, jobs, emotions, genres, words     | —            | ✓ object     | ✓ all      | ✓       | ✓               | ✓ style        | ✓              | —            | —    | ✓       | ✓ word      | ✓         | ✓       | ✓        |
| Favourites / starred                       | —            | —            | ✓          | ✓       | —               | —              | —              | —            | —    | —       | —           | ✓         | ✓       | —        |
| History of what was drawn                  | ~ (count)    | —            | —          | —       | —               | —              | —              | —            | —    | —       | —           | —         | —       | —        |
| Draw several at once (a round)             | —            | —            | ✓          | —       | —               | —              | —              | —            | —    | —       | —           | —         | —       | —        |
| Timer (scene or auto-reroll)               | —            | —            | ✓ reroll   | ✓       | —               | —              | ✓ time limits  | —            | —    | —       | —           | —         | ✓ show  | ✓        |
| Printable / slips                          | —            | —            | —          | —       | —               | —              | —              | —            | —    | —       | —           | —         | —       | —        |
| Community proposals                        | —            | ✓            | —          | —       | —               | —              | —              | —            | —    | —       | —           | —         | —       | —        |
| Offline / installable                      | —            | —            | —          | ✓       | —               | —              | —              | —            | —    | —       | —           | ✓         | ✓       | ✓        |
| Dark mode                                  | ✓            | ✓ (only)     | —          | ✓       | ✓               | —              | —              | —            | —    | —       | —           | —         | —       | —        |
| No ads, no account                         | ✓            | ✓            | ✓          | ✓       | — (ads)         | ✓              | ✓              | — (ads)      | ✓    | ✓       | ✓           | ✓         | — (IAP) | — ($)    |
| Languages                                  | —            | —            | 6          | 2       | 10              | —              | —              | —            | —    | —       | —           | —         | 7       | —        |
| Controls on the main screen                | 4            | 4            | 24+        | 54      | 35              | 5+             | 5              | 4            | 1    | 7       | 3           | 8         | app     | app      |

Two readings from the matrix. Nothing in the field ranks a prompt, chooses a
room, filters for a school, or never repeats; the depth is ours alone. And the
five things the field has that we do not — the combined draw, the lock, the
show screen, favourites, a round for a whole class — are all things a teacher
or a host does in the moment, and each can be carried by a card, a line or a
key the interface already has.

## 6. The improvement list

**All seventeen landed on 2026-09-30** (commit 2593d54f): the classic card and
the line redraw, the show-size type, the keys, the session list, the clock,
the cast and coaching lines, 32 bank rows and 61 combinability marks, the
kids section, the print stylesheet, the numbers in the hero, the method
section, the copy-friendly lists, and the install. Item 16 rode on item 13.
The list stays as the record of why each was chosen.

Every way ours can carry what the field has and stay simpler than any of it.
The rule for each item: no new top-level control. A new kind is a card in a
list that already has six; a passive label is not a control; a key is not a
control; print CSS is not a control; a bank entry is not a control. Items are
ranked within each group; the first in each is the one to do.

### A. Inside the existing screens, no new control

1. **The classic draw as a seventh kind.** "Who, where, what" as one card in
   the kind list, drawing a relationship, a location and a shared task together
   as three lines on one prompt card. Every competitor with any depth offers
   this (Improv Bible's "Draw everything", NYIT's 50×50×50, Drama Puzzles' five
   reels, Improov's scene starters) and it is the one thing readers arriving
   from "improv scene generator" expect. Our pools make 94 × 70 × 88 = 578,880
   combinations from prompts that are individually ranked, which no competitor
   can say. The how-to line writes itself: play all three as true; the first
   line is yours.
2. **Tap a line to redraw only that line.** On the classic card each of the
   three lines is its own draw; tapping one replaces it and keeps the other two.
   That is ImPrompt's lock-and-regenerate and Drama Puzzles' padlocks without a
   padlock, and the how-to line says so in six words. Nowhere else.
3. **Show mode without a switch.** When the dialog is wider than 1024px or in
   landscape, render the prompt at display size with the how-to line beneath
   and nothing else above the fold — a projector or a laptop on a chair gets
   Improv Bible's show mode and The Drama Teacher's classroom screen by being
   one. On a phone nothing changes.
4. **Keys.** Space or Enter for another one, C for copy, Esc to close, K for a
   different kind. Nothing on screen; a line in the tool page's questions. A
   host running a show from a laptop never touches the trackpad.
5. **What you have drawn, below the fold.** A quiet numbered list of this
   session's prompts under the buttons on the prompt screen, most recent first,
   select-all-and-copy friendly. It is Andi Smith's starred list and Impromuse's
   Save without a star: the ones worth keeping are already on the page, and a
   teacher who dealt eight prompts to eight pairs can read them back. The seen
   store already holds the ids; this shows them.
6. **A quiet counter, not a timer.** Time since this prompt was drawn, in small
   type on the card, no control. The Drama Teacher's time limits and Andi
   Smith's reroll timer exist because a class runs rounds; the guide already
   says how long a round should be. A counter gives the teacher the number
   without asking them to set anything.
7. **A cast line on the card.** A passive label — "works for two", "needs a
   group" — from a bank flag, shown when set. AI Free Forever asks for solo or
   duo up front; ours can tell you after, at no cost in choices, and it links
   the 2-person guide for the pairs.
8. **A coaching line on the strongest prompts.** AI Academy's one real
   advantage is a pro tip per prompt. A second optional line in the bank —
   what to fight about, what to play straight — on the top band of each pool
   only, shown under the prompt when present. Content, not interface; the
   rubric already says which prompts earn it.

### B. The bank, no change to the tool

9. **Objects and jobs inside the kinds that exist.** The field's most common
   categories we lack are an object and a profession. Both fit as prompts under
   existing kinds rather than as new cards: a location that names the object in
   it ("a hospital waiting room with one working vending machine"), a shared
   task that names the job ("two locksmiths, one lock"). Extend the bank; keep
   six kinds.
10. **A complication that arrives, as situations.** Theatre Haus's "twist" and
    The Drama Teacher's conventions are mid-scene changes. Ours has "something
    already wrong" at the top of the scene; a handful of situations written as
    what changes halfway ("the third person turns out to have been listening")
    gives a class the twist round without a twist button. Bank only.
11. **The classic combined draw's own pool.** When the seventh kind exists,
    audit which relationships, locations and tasks read well together and score
    them for the combined draw; a few of each will not (a first line cannot be
    combined). The rubric has an axis for it: playability.
12. **Prompts for kids on the kids guide, not here.** "improv prompts for kids"
    (50 a month) belongs to /improv-games-for-kids by parent topic, as the memory
    note records; a school-room set is already the generator's school room. A
    section on that guide pointing at the school room, with ten of its prompts
    listed, closes the gap without a page.

### C. The page, not the tool

13. **Print the lists as slips.** A print stylesheet on /improv-prompts that
    turns every prompt list into cut-lines — one prompt per slip, the heading on
    each — and one sentence in the classroom section saying so. Theatrefolk
    gates fifty lines behind an email for exactly this; ours prints 140 for
    nothing, and the printed page carries the site's name.
14. **Say the numbers competitors sell.** "455 ranked prompts, never the same
    one twice, free, no ads, no account" near the top of both pages in plain
    words. Improv Bible says "free, ad-free, no account" in its description and
    NYIT sells "125,000 scene starters"; ours has better numbers and does not
    say them where a reader decides.
15. **A method the lists lack, named.** The page already teaches how to run a
    round; give the classic who-where-what method its own short section so the
    page answers "improv scene generator" readers in prose as well as with the
    card, and so the seventh kind has a place to link its theory.
16. **Copy per prompt in the article lists.** AI Academy puts a copy button on
    every prompt. Ours can do it with no button: a one-line-per-prompt list
    layout that selects cleanly, and the print stylesheet above. Not a control.
17. **Installable.** A web manifest and a service worker that caches the two
    pages and the bank, so the generator opens from a phone's home screen with
    no signal in a hall. Improov, Improv Toolbox and Impromuse are installable;
    the site is not, and the tool is the one page on it that gets used standing
    up. No interface.

### D. What the field does that we should not copy

- **Absurd premises** ("magicians whose tricks keep going wrong", "you lost
  your loved one in Kumbh Mela", "Wizard of oz is skeezy"). The page's whole
  argument, and the reason its prompts are ranked, is that these make bad
  scenes. Every one-button competitor is a premise machine.
- **AI-written prompts.** Two of the ranking pages say they used AI and one
  generator is nothing else. Ours are written and scored by hand; say so once.
- **Category grids.** Eleven categories and a settings cog (Andi Smith),
  twenty-three tools (Improv Toolbox), thirty-five controls (AI Free Forever).
  The kinds we have are the ones a scene can be started from; a word, a song
  and a line from Moby Dick are suggestions, not prompts, and the page says why.
- **Timers with settings, favourites with stars, proposals with forms.** Each
  is a control that has to be understood before it helps. Items 5, 6 and the
  email capture already on the page carry the need.
- **Gating, ads, in-app purchases.** The two lists with the best formats gate
  or sell; the site's position is stronger unpaid.
- **Languages.** Not this year; the site is English and the corpus is one voice.

### E. Order of work

Do 1 and 2 together (they are one card), then 3 and 4 (a stylesheet and a key
handler), then 5 and 13 (both make a class round work), then 9 and 8 (bank
sessions, which the owner writes), then 17. Items 14 and 15 are copy and can
ride with any of them. Guards to extend when each lands: the prompt generator
component test for the classic card and the keys, the prose-overlap guard for
any copy that restates the guide, and a print-stylesheet check in the built
HTML.

Measured after each: `prompt_generated` by kind in PostHog, and the tool page's
row in Search Console once the rank tracker holds `improv prompt generator`.
