# Improv prompts and the generator: twenty-four people, their jobs, and where the page fails them

Read 2026-09-30, against the production build after the competitor work landed
(docs/improv-prompts-competitors.md). Each person below was walked through the
guide and the generator in a browser the way they would use it — a 390px
phone, a 320px phone at 200% text, a 1440px laptop, a printer, a screen
reader's view of the tree, the network switched off — and the numbers in each
critique come from that walk, not from imagination. Scratch scripts:
`personas.mjs`, `scan-bank.mjs`, not kept.

## What was measured

| Reading                                                          | Result                                                                                                      |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Taps from landing to a first prompt, phone, either page          | 2 (a room, then a kind); no default for either                                                              |
| First phone screen of the guide                                  | the hero only: "Give me a prompt" and four room buttons; the H1 is at 976px, no prompt visible              |
| First phone screen of the tool page                              | title, description, the hero with its four buttons                                                          |
| Room descriptions on the phone hero                              | hidden below `sm`; four labels with no line under them                                                      |
| Printing the guide                                               | about 30 letter pages: 487 slips and 3,400 words of prose around them; no way to print a subset             |
| Tab stops from the top of the tool page to the first room button | 11                                                                                                          |
| Focus after choosing a kind (the button disappears)              | lost to `<body>`                                                                                            |
| Live region announcing a new prompt                              | none; "Another one" keeps focus and the new text is silent                                                  |
| Classic line buttons' accessible names                           | "Who A translator and…" — nothing says the line redraws except a `title`                                    |
| Classic card at 320px                                            | fits; "Another one" on the first screen                                                                     |
| Classic card at 200% text on a 320px phone                       | long words clip at the card's right edge; 0 of 3 lines on the first screen                                  |
| Offline after one online visit                                   | works: reload and draw with the network off; nothing on the page says so until the last question            |
| Show host, laptop, audience question                             | 60px type; the how-to, coaching and concept lines stay on screen in small type                              |
| Bank vocabulary                                                  | 44 of 487 prompts use words a US reader may not (lift, busker, bins, postman, lorry, ramblers, headteacher) |
| Guide spelling                                                   | 7 British spellings, 0 American; the audience is three quarters American                                    |
| Guide sentences                                                  | 147 sentences, mean 23.5 words, 15 over 35 words                                                            |
| Prompts written for one person                                   | 0 of 487                                                                                                    |
| School room pools per kind                                       | relationships 47, first lines 74, locations 69, situations 64, audience 47, tasks 88                        |

## The people

Each entry: who they are; the job in the form _when…, I want…, so that…_; what
they meet; the verdict. Severity is what it costs them, not how loud it is:
**blocks** (they leave or fail), **slows** (they get there with effort),
**unmet** (the page has nothing for it), **fine**.

### 1. The secondary drama teacher, thirty pupils, fifty minutes

_When I have a class in ten minutes, I want ten safe prompts I can hand out
in pairs, so that everybody is playing at once and nobody is exposed._

Meets: the school room, which is the right idea and the site's real edge. Two
taps to the first prompt, then "Another one" ten times, then the session list
under the buttons to read back. To hand them out on paper she prints the
guide and gets thirty pages, most of them prose and 347 appendix slips she did
not ask for. **Slows.** The unmet job is _print this room's pool_, or _deal
ten at once_ — the list under the buttons is close, but it is one tap per
prompt and it cannot be printed on its own.

### 2. The primary teacher, ages seven to ten

_When I want a drama game for small children, I want prompts with one rule
and a physical task, so that a seven-year-old can start._

Meets: "A school drama room" says under-eighteens; nothing narrows to the
youngest. The task pool has what she wants (a tent, a jar, a cat in a basket)
but the room mixes in first lines like "You said you'd stopped" that a seven-
year-old cannot play. **Slows.** The kids guide's new section points her at
the room; the room does not know her age.

### 3. The corporate facilitator

_When I run a workshop for a team that arrived defended, I want prompts that
give them a task to be honest inside and never make anyone look foolish in
front of their manager, so that the session lands._

Meets: the team room, and its rule (adult knowledge allowed, nothing that
lands on a life). He wants to project it: the laptop layout gives him 60px
type. The coaching line and "The idea behind it: Suggestion —" sit on the
projector too, in small type, which reads as a cue card the room was not meant
to see. **Fine, with a wrinkle.** He would also like to know the room's
rules before he chooses it; on his phone the four buttons carry no
description.

### 4. The adult beginners' improv teacher

_When I plan a two-hour class, I want a sequence — a warm-up start, then
relationships, then something already wrong — so that the session builds._

Meets: everything he needs, one kind at a time, with "A different kind" to
move on. The clock helps him hold rounds. **Fine.** The session list gives
him the record for his notes.

### 5. The coach of a performing team

_When we rehearse, I want variety with no repeats and no premises, so that
the team practises starting rather than reciting._

Meets: exactly this; the never-repeat store is the feature built for her.
**Fine.** She would take a way to reset one kind's pool without seeing it
through to the end; today reset appears only when the pool is spent.

### 6. The short-form show host at a laptop

_When I host, I want the next audience question with one key and nothing
else on the screen the audience can read, so that the show keeps its pace and
the suggestion visibly comes from the room._

Meets: Space draws the next, the type is display size, and the audience
question kind is the one thing no competitor has. But the how-to line, the
coaching line and the theory link stay on the projected screen, and the
count and clock sit above the question in caps. **Slows.** What he wants is
the show room to show the question and nothing else.

### 7. The long-form player practising initiations with a partner

_When we have twenty minutes, I want first lines fast, so that we drill the
first three seconds._

Meets: the first-line kind, 79 deep, with first-line drill one link away.
**Fine.**

### 8. The solo learner between classes

_When I am alone in my room, I want something I can do by myself with a
prompt, so that I keep practising between Tuesdays._

Meets: nothing. Every prompt in the bank assumes a partner; the "works for
two" label is the smallest cast the generator knows. The how-to-get-better
guide has a section on practising alone, and the generator cannot point at
it. **Unmet.** "Solo improv exercises" is 50 searches a month and the site
answers it with prose only.

### 9. Two friends at home

_When it is just the two of us, I want prompts that work for two and a way to
run a session, so that it is a game and not homework._

Meets: the "works for two" label on ten tasks with a link to the pair guide,
and the classic card. **Fine.**

### 10. The parent on a rainy afternoon

_When my kids are bored, I want something safe I can read off my phone in one
tap, so that we play now._

Meets: two taps, then a prompt; the school room is the closest thing to
"kids" and its label does not say so. On the phone the room buttons carry no
descriptions, so "A school drama room" is a guess. **Slows.** The kids guide
now says which room to use; a parent does not arrive through the kids guide.

### 11. The youth theatre director, thirteen to seventeen

_When I direct teenagers, I want prompts that never expose one of them, so
that the shy ones stay in the room._

Meets: the school filters, which are the article's own three rules applied
mechanically. **Fine.** Same wrinkle as the parent: which room, and why,
is not said on the phone card.

### 12. The ESL or drama-and-language teacher

_When my students are learning English through drama, I want prompts in
plain words, so that the language is not the obstacle._

Meets: eight-word prompts, which is right, and forty-four of them built on
words her students will not know — lift, bins, lorry, busker, ramblers,
caretaker, headteacher, lodger. The guide's sentences average 23 words and
fifteen run past 35. **Slows.** There is no plain-English switch and should
not be; the bank could avoid the words that only work on one island.

### 13. The American reader, who is most of the audience

_When I land from Google, I want the page to read like it was written for
me, so that I trust it._

Meets: "organised", "practise", "theatre", "Year 5", "a fiver", "a jumper",
"car boot sale". Three quarters of the demand the guide targets is American,
and the site chose to keep one voice. **Slows, quietly.** Not a spelling
change — a decision about the forty-four prompts whose meaning, not spelling,
is British.

### 14. The screen-reader user

_When I use the generator without sight, I want to hear the prompt when it
arrives and know what each button does, so that I can run a scene like
anyone else._

Meets: a labelled dialog, a focus trap, Escape to close, and then three
faults. Choosing a kind removes the button under focus and focus falls to
the page body. Pressing "Another one" keeps focus on the button and the new
prompt above it is never announced, because nothing on the card is a live
region. The classic card's line buttons are named "Who" plus the prompt, and
nothing tells her that pressing one redraws it. **Blocks**, for the classic;
**slows** for the rest. Every fix is a few attributes.

### 15. The keyboard-only user

_When I cannot use a mouse, I want to reach the tool and run it from the
keyboard, so that I am not slower than everyone else._

Meets: a skip link, a visible focus ring, eleven Tab stops to the first
room button on the tool page, then Enter, Enter, and the keys. **Fine.** The
focus loss after choosing a kind (persona 14) costs her one Tab.

### 16. The low-vision user at 200% text

_When I enlarge the text, I want the card to reflow, so that I can read a
prompt without scrolling sideways._

Meets: the single prompt reflows well. The classic card does not: the label
column and the display type leave the words clipped at the card's right edge
and no line on the first screen. **Blocks**, for the classic at that size.
`overflow-wrap: anywhere` and a label that moves above the text below 360px
would settle it.

### 17. The teacher in a hall with no signal

_When the hall has no reception, I want the generator to open anyway, so
that the lesson does not depend on the building._

Meets: it works — after one online visit, the page reloads and draws with
the network off — and nothing tells her so until the last question on the
tool page, and nothing offers the home-screen install. **Slows.** One sentence
where the tool is would turn a hidden feature into a used one.

### 18. The podcaster or video maker

_When I record, I want five prompts I can read on air and paste into my
notes, so that prep takes a minute._

Meets: five taps of "Another one", then the session list, which she can
select and copy as a block. **Fine.** She would take a copy-all, and the
rule against controls says no; the block selection is the answer.

### 19. The game master using improv for NPC scenes

_When I prep a session, I want a who, a where, a what and a complication
together, so that a scene has a shape._

Meets: the classic gives three; the complication is a separate kind. He
cannot add "something already wrong" to a classic card without leaving it.
**Slows.** A fourth line would be a real feature and a real cost; the
"Halfway through" situations were written for exactly his round.

### 20. The stand-up looking for premises

_When I want a bit, I want a funny scenario, so that I can write to it._

Meets: a page that argues, correctly, that premises make bad scenes, and a
generator with none in it. **Not served, on purpose.** The tool page's
"Why are there no funny or absurd ones?" is the right answer; he will leave,
and should.

### 21. The visitor from Google on a phone, first time

_When I search "improv prompts", I want to see prompts, so that I know I am
in the right place._

Meets: a dark panel that asks "Where are you using it?" with four buttons
and no prompt, no title, no list, on the whole first screen. The title and
the first prompts are 976px down. Two taps later there is a prompt. **Slows**,
and it is the most common person on the page. Every competitor shows a
prompt or a list on the first screen; this page shows a question.

### 22. The returning teacher on a shared school laptop

_When I come back next week, I want it to remember my room and not repeat
last week's prompts, so that I start where I left off._

Meets: the never-repeat store, which is the device's and so is shared with
every other teacher using that laptop, and no memory of the room — two taps
every time. **Slows.** Remembering the last room on the device is a line of
code and no control; the shared store is a decision to leave alone.

### 23. The person who wants to send one prompt to a friend

_When I find a good one, I want to send it, so that we play it tonight._

Meets: Copy, which gives the words and not a link. **Unmet**, mildly. A URL
that opens on one prompt would be a share feature and a new surface; the
words are usually enough.

### 24. The improv theatre that wants to use it in the lobby or embed it

_When I run a jam night, I want the generator on the lobby screen and a way
to put it on our site, so that suggestions come from something better than a
shouted word._

Meets: the laptop layout on a screen, which works; nothing to embed.
**Unmet, low.** Not the site's job.

## What recurs

Reading the twenty-four together, the friction is not spread evenly; six
things account for most of it, and three of them are cheap.

1. **Two taps and a question before any prompt.** Every person pays it, and
   the first-time visitor from Google pays it on a screen that shows no
   prompt and no title. The room is the site's edge and should stay, but it
   does not have to be asked every time: remember the last room on the device
   and open on the kinds with "· change" beside it, which is the header line
   the dialog already has. First visit: two taps. Every visit after: one.
2. **The phone hero hides what the room means.** The compact card drops the
   one-line descriptions below `sm`, so a parent, a director or a facilitator
   picks a room from four labels. The descriptions are eleven words each and
   they are the whole reason the rooms exist.
3. **The card is silent for a screen reader.** No live region, focus lost
   when a kind is chosen, line buttons that do not say they redraw. Three
   attributes and one focus call.
4. **The classic card clips at large text.** One CSS property and one
   breakpoint.
5. **The show room shows the audience the notes.** The how-to, coaching and
   theory lines are written for the person holding the phone, not the room
   watching the projector. In the show room, on a wide screen, they can be the
   small type at the foot rather than the lines under the question.
6. **Print is all or nothing.** Thirty pages for a teacher who wants twenty
   slips. The appendix and the school lists are the two things worth printing
   alone.

And three things the bank itself owes people: nothing for one person, forty-
four prompts a US or ESL reader has to translate, and a room for children
that does not know their age.

## The weighing

Impact is how much better the page gets for the people it serves; reach is
how many of the twenty-four, weighted by how common they are; complexity is
interface cost first and engineering second, on the rule the competitor work
was built under — no new top-level control. Score is impact × reach ÷
complexity, the backlog's own shape.

| #   | Change                                                                                                                   | Personas            | Impact | Reach | Complexity | Score | Adds a control?                           |
| --- | ------------------------------------------------------------------------------------------------------------------------ | ------------------- | ------ | ----- | ---------- | ----- | ----------------------------------------- |
| A   | Remember the last room on the device; open on the kinds with "· change"                                                  | 1, 4, 5, 10, 21, 22 | 4      | 5     | 1          | 20    | no — the header's existing change link    |
| B   | Announce the new prompt (`aria-live`), keep focus after a kind is chosen, name the line buttons as "change the who line" | 14, 15              | 5      | 2     | 1          | 10    | no                                        |
| C   | Show the room descriptions on the phone hero (four short lines)                                                          | 3, 10, 11, 21       | 3      | 4     | 1          | 12    | no                                        |
| D   | Let the classic card's words wrap and its labels stack below 360px                                                       | 16                  | 5      | 1     | 1          | 5     | no                                        |
| E   | In the show room on a wide screen, move the how-to, coaching and theory lines to the foot in small type                  | 3, 6                | 3      | 2     | 1          | 6     | no                                        |
| F   | Say "works offline once you have opened it; add it to your home screen" on the hero, one line                            | 1, 17               | 3      | 2     | 1          | 6     | no                                        |
| G   | Rewrite the 44 island-specific prompts in words both sides of the Atlantic use                                           | 12, 13              | 3      | 4     | 2          | 6     | no — bank only                            |
| H   | Print only what was asked: the school lists and the appendix each printable alone                                        | 1, 2                | 4      | 2     | 3          | 2.7   | a print link per section, or a print page |
| I   | A pool for one person — solo prompts as a kind, or a "practise alone" line on the card                                   | 8                   | 4      | 1     | 3          | 1.3   | a kind card, or a bank flag and a line    |
| J   | An age line in the school room (under eleven, eleven to fourteen, fifteen up)                                            | 2, 11               | 3      | 2     | 3          | 2     | yes — a choice inside the room            |
| K   | A fourth line on the classic, "and something already wrong"                                                              | 19                  | 3      | 1     | 3          | 1     | yes — or a tap that adds it               |
| L   | A link that opens on one prompt                                                                                          | 23                  | 2      | 1     | 3          | 0.7   | a share surface                           |
| M   | Reset one kind's pool before it is spent                                                                                 | 5                   | 2      | 1     | 2          | 1     | yes                                       |

## What to do

**A to F landed on 2026-09-30**, the same day, in one pass and no new control:
the device remembers the last kind, the card takes focus and speaks, the phone
hero shows what a room is, the classic card wraps and stacks, the show room
keeps the notes off the projected part of the screen, and the hero says it
works with no signal. prompt-generator-personas.test.tsx holds all six.

**Now, in one pass and one commit** — A, B, C, D, E, F. Six changes, none
adds a control, all under a day, and between them they answer the most common
person on the page, the person the page currently blocks, and the two people
the site says it is for. A is the biggest single gain the page has left: the
second visit becomes one tap.

**Next, as bank work** — G. Forty-four rows, the owner's voice, half a
morning. The words should work in Ohio and in Leeds; most of them can with a
noun swapped.

**Decide** — H, I, J. Each is a real need and each costs either a control or
a page. H is the one a teacher asks for out loud; the cheapest honest form is
a "print this list" link at the head of the school lists and the appendix,
which is a control, and a small one. I is the one search asks for. J belongs
to the kids guide first, where the ages are already argued.

**Leave** — K, L, M, and persona 20. K and L are features other tools sell
and the rule against controls was made for exactly them; M has a workaround
(see the pool through); 20 is served by a refusal that is the page's point.
