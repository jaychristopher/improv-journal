/**
 * The improv games hub's by-audience paragraphs and its FAQ answers.
 *
 * This is the page's prose, not the page's markup: /improv-games renders each
 * value through <Prose>, in the order below, so the route file keeps the
 * sections and the sentences live in one place. They were moved here on
 * 2026-09-22 under the ceiling in hub-prose-links.test.ts, which counts
 * reader-facing prose held in route files and may only fall; that file reads
 * this module too, so a sentence moved out of the route is still checked to
 * render as itself.
 *
 * Every value is markdown, because the site's autolinker runs over it at
 * render time: a concept it recognises picks up its own link, and the
 * hand-written links here are the ones it would not make.
 */
export const GAMES_HUB_COPY = {
  // Which Games for Which Group: one paragraph per kind of room.
  whoIsInTheRoom:
    "The list above is sorted by what each game trains, which is the right way round once you know what you are fixing. If you are standing in front of a room and do not, the more useful question is who is in it.",
  beginners:
    "**Complete beginners.** Start with something where nobody can be visibly bad at it, which rules out most scene work. [One-word story](/practice/exercises/one-word-story) is the usual answer: a single word each, no way to steer it, and the failure mode is a funny story rather than an exposed person.",
  children:
    "**Children and school groups.** Physical, loud, and short. Attention is the constraint rather than confidence — children have plenty of the second and very little of the first — so games with a clear rule and constant movement work far better than anything requiring a scene to be sustained. Keep rounds under five minutes and expect to run three games in the time an adult group spends on one.",
  workshop:
    "**A workshop or class.** The only setting where you can build across a session: a warm-up that costs nothing, an exercise that isolates one skill, then a performance game that needs it. That progression is what the level and focus filters above are for.",
  workTeam:
    "**A work team.** Different problem entirely, and the games are not the hard part — the power gap is. Anything that risks somebody looking foolish in front of the person who writes their appraisal is a bad idea however good the game is. Whole-group formats where everybody acts at once cost far less than anything with turns, and [5-minute team building](/5-minute-team-building) is built for exactly that constraint.",
  remote:
    "**Remote and video calls.** Most improv games assume a shared physical space and quietly break without one — anything relying on eye contact, simultaneous speech, or knowing whose turn it is will not survive the latency. What works is verbal, strictly sequential, and named-turn: [virtual team building activities](/virtual-team-building-activities) covers why the grid changes the rules.",

  // Questions People Ask About Improv Games, in the order they are asked.
  faqWhatTheyAre:
    "Structured activities with an explicit rule, played without a script, where the rule is chosen to make a particular skill unavoidable. That last part is what separates a game from a party activity: passing a clap round a circle is not fun because clapping is fun, it is there because you cannot do it without watching one specific person.",
  faqThreeKinds:
    "They divide three ways — warm-ups that prepare a group, exercises that isolate a skill, and short-form games built to be watched. Most lists mix all three together, which is why so many sessions run a performance game on a cold room and conclude the room is no good.",
  faqBestWarmUps:
    "The ones with no ideas in them. [Pass the Clap](/practice/exercises/pass-the-clap), [Zip Zap Zop](/practice/exercises/zip-zap-zop) and [Sound Ball](/practice/exercises/sound-ball) all work because nobody has to invent anything to take part, so the nervous half of the room is in before it has had time to decide it cannot do this.",
  faqWarmUpWithAnIdea:
    "A warm-up that requires a good idea is not a warm-up. It is the first exercise, and running it first is the most common way to lose a group in the opening ten minutes.",
  faqPairGames:
    "Plenty of them, and the two-person versions are often the better practice, because there is nowhere to hide and you get several times the repetitions. [Mirroring](/practice/exercises/mirroring), [Last Word Response](/practice/exercises/last-word-response), [One-Word Story](/practice/exercises/one-word-story) and [Gift Giving](/practice/exercises/gift-giving) all run with a pair.",
  faqPairLimits:
    "What a pair cannot do is anything requiring a back line — tag-outs, group games, most short-form formats. Those need five or more, and attempting them with two produces a worse version of a scene you could have simply played.",
  faqVideoConstraint:
    "Anything that does not depend on simultaneous speech or on knowing whose turn it is from the room. Video kills both: overlapping audio is unintelligible and there is no shared spatial sense to read a turn from.",
  faqVideoSurvivors:
    "So circle games that pass by name survive, and [One-Word Story](/practice/exercises/one-word-story) works better on video than in person because the order is fixed and the gaps stop mattering. Anything physical, anything requiring a group to move as one, and anything where players jump in unprompted will not survive the lag.",
  faqChildrenAge:
    "Around five for circle games with one rule, and roughly nine before scenes are worth attempting — not because younger children cannot act, but because a scene has no rule to fall back on, so a child who does not know what to do has nowhere to stand. [Improv games for kids](/improv-games-for-kids) sets out which games suit which age and what changes with teenagers.",
  faqOnlyTwoOfYou:
    "Most of the list above needs a circle, and the rules usually do not say so until you are halfway through them. Rotation, tagging out and hiding briefly in a round all require bodies. [2 person improv games](/2-person-improv-games) covers what survives the shrink, and why a pair gets more repetitions in an hour than a class of twelve does in a term.",
  faqOpeningGame:
    "One that is impossible to be bad at and needs no words — a clap passed round a circle rather than anything requiring an idea. The opening game is about state, not content, and only the last game before the work should point at what you are teaching. [Improv warm-up games](/improv-warm-up-games) sets out the three-stage order and how long to spend in each.",
} as const;
