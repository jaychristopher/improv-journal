/**
 * The What, as a line of the classic.
 *
 * Reported on 2026-10-08: "why say 'two neighbours' then 'two people' - we
 * already know its two people", on a draw whose Who was "Two neighbours who
 * only ever meet on recycling day" and whose What was "Two people setting a
 * table for more guests than there are chairs". And before it: "every who
 * should be people and never any descriptor of people in the what".
 *
 * The rule that got this wrong was mine and was too weak. It allowed a task
 * to name its cast generically — "someone", "two people" — on the reasoning
 * that a generic cast collides with nothing. It collides with the Who, which
 * has already said who is there, and sometimes it contradicts the count:
 * "Two people taking a group photo of people who will not stand still" puts
 * two players and a crowd on a card whose Who named a pair.
 *
 * So a What names no one. It may point back at the pair the Who established
 * — "the other", "one of them", "neither of them" — because that refers to
 * the cast rather than adding to it, and several of these tasks need the
 * asymmetry to work at all. It introduces nobody new and counts nobody.
 *
 * This is a second phrasing rather than a rewrite of the prompt. A task is
 * two things on this site: a whole prompt drawn on its own, where "Two people
 * folding a fitted sheet" reads correctly and is listed that way in the
 * guide and in improv-games-for-kids, and one line of a classic, where it
 * must compose with a Who. Rewriting the first to fix the second would have
 * split the guide's drama-class list, which mixes these with prompts that are
 * not combinable at all and keep their people on purpose.
 *
 * Only tasks need this. A Who should name people — that is its whole job —
 * and a Where is already a bare place.
 */

/** Keyed by the task's own text, so a reworded prompt reads as a missing
 *  entry rather than quietly keeping a line that no longer matches it. */
export const PROMPT_TASK_LINES: Record<string, string> = {
  "Two people assembling something with no instructions":
    "Assembling something with no instructions",
  "A person teaching another person something physical": "Teaching the other something physical",
  "Two people looking at the same object and seeing different things":
    "Looking at the same object and seeing different things",
  "Two people who have to whisper": "Having to whisper",
  "Two people trying to move something heavy": "Moving something heavy",
  "Someone returning something they broke": "Returning something one of them broke",
  "Two people who have to be quiet for different reasons":
    "Having to be quiet, for different reasons",
  "Someone explaining a rule they do not understand themselves":
    "Explaining a rule without understanding it",
  "Two people sharing the last of something": "Sharing the last of something",
  "A person waiting for someone who is very late": "Waiting for a lift that is very late",
  "Two people assembling a tent": "Assembling a tent",
  "A person trying to leave politely": "Trying to leave politely",
  "Two people looking for the same missing thing": "Looking for the same missing thing",
  "Someone learning a skill from a person with no patience": "Being taught a skill, impatiently",
  "Two people carrying something fragile": "Carrying something fragile",
  "Someone practising something in private who is discovered":
    "Practising something in private, and being discovered",
  "Two people who disagree about which way to go": "Disagreeing about which way to go",
  "A person asking for help they do not want to need": "Asking for help, and hating needing it",
  "Two people fixing something neither of them understands":
    "Fixing something neither of them understands",
  "Someone thanking a person who does not remember doing it":
    "Thanking the other for something they do not remember doing",
  "Two people waiting for a decision made elsewhere": "Waiting for a decision made elsewhere",
  "A person explaining their work to somebody outside it":
    "Explaining the work to the other, who is outside it",
  "Two people wrapping a present that is an awkward shape":
    "Wrapping a present that is an awkward shape",
  "Someone teaching a card game they half remember": "Teaching a card game, half remembered",
  "Two people hanging a picture and disagreeing about straight":
    "Hanging a picture and disagreeing about straight",
  "Two people folding a fitted sheet": "Folding a fitted sheet",
  "Two people packing one bag for two": "Packing one bag for both of them",
  "Someone untangling a set of lights while the other holds the ladder":
    "Untangling a set of lights while the other holds the ladder",
  "Two people trying to remember a song": "Trying to remember a song",
  "Two people setting a table for more guests than there are chairs":
    "Setting a table for more places than there are chairs",
  "Someone learning to whistle from someone who can": "Learning to whistle from the one who can",
  "Two people trying to get a cat into a basket": "Getting a cat into a basket",
  "Two people writing a card together": "Writing a card together",
  "Someone being taught to ride a bike as an adult": "Being taught to ride a bike, far too late",
  "Two people putting up a shelf with one screw too few":
    "Putting up a shelf with one screw too few",
  "Two people taking a group photo of people who will not stand still":
    "Getting one photo taken before the light goes",
  "Someone being shown how to use the coffee machine": "Being shown how to use the coffee machine",
  "Someone teaching a handshake": "Teaching a handshake",
  "Two people trying to get a sofa through a door": "Getting a sofa through a door",
  "Two people counting something that keeps moving": "Counting something that keeps moving",
  "Two people sharing one umbrella": "Sharing one umbrella",
  "Two people trying to open a jar": "Trying to open a jar",
  "Someone learning to tie a tie before a photograph": "Learning to tie a tie before a photograph",
  "Two people decorating a cake against the clock": "Decorating a cake against the clock",
  "Someone giving directions to a place they have never been":
    "Giving directions to a place never visited",
  "Someone teaching a dance step they learned wrong": "Teaching a dance step, learned wrong",
  "Two people checking every pocket for the key": "Checking every pocket for the key",
  "Someone reading out the rules of a game as it is being played":
    "Reading out the rules of a game as it is played",
  "Two people trying to leave one message on an answerphone together":
    "Leaving one message on an answerphone together",
  "Someone being taught to swim by someone impatient": "Being taught to swim, impatiently",
  "Two people making a bed with the sheet the wrong way round":
    "Making a bed with the sheet the wrong way round",
  "Someone signing for a parcel that is not for them": "Signing for a parcel that is not theirs",
  "Two people looking at the same map and pointing in different directions":
    "Looking at the same map and pointing in different directions",
  "Someone painting a wall while the other says they have missed a bit":
    "Painting a wall while the other points out the missed bit",
  "Someone loading a dishwasher, watched by someone who does it differently":
    "Loading a dishwasher, watched by the one who does it differently",
  "Two people writing a sign for a lost pet": "Writing a sign for a lost pet",
  "Someone practising a speech to a person who keeps correcting it":
    "Practising a speech while the other keeps correcting it",
  "Two people playing a board game with pieces missing": "Playing a board game with pieces missing",
  "Someone delivering a parcel that does not fit through anything":
    "Delivering a parcel that does not fit through anything",
};
