/**
 * The words behind the "One word" kind: what a Harold or an Armando opens on.
 *
 * Not scene starters, and not counted with them. The guide argues that a bare
 * noun is the weakest start for a two-person scene, and it is; a longform
 * opening is the one place a single word is the right ask, because the scenes
 * come from three minutes of association and not from the word. So these are
 * chosen for texture — a common noun with a smell, a weight or a history over
 * an abstraction or a joke — and drafted for the owner's teacher to cut
 * (docs/one-word-suggestions.md, PG-2.1).
 *
 * One row per word:
 *
 *   [text, specific, open, charge, doable, grounded, flags?, coach?]
 *
 * The five numbers are the bank's rubric, read literally for a word:
 * `specific` is texture — a material or object you can smell or hold is 5
 * (rust, varnish, kettle), a place 4, paper and institutions 3 (deposit,
 * verdict), nothing below 3 admitted; `open` is how many scenes the
 * association yields, 5 by default and 4 where one scene is obvious (trophy,
 * audition); `charge` is what the word implies is at stake (inheritance,
 * custody, verdict 5; mortgage 4; deposit 3; rust 2; wool 1 — mostly low, and
 * that is honest); `doable` is whether a group can start associating in three
 * seconds (concrete 5, institutional 4, two-meaning 3); `grounded` is 5 for
 * almost all, since nothing fantastical is admitted. The room weights then do
 * the work: a school room surfaces rust and tent before settlement, a show
 * surfaces inheritance and deposit.
 *
 * Flags are the bank's: `p` where the word lands on a life (the guard's
 * regex makes inheritance, custody, hospital and funeral mechanical; wake,
 * chapel and blister by judgement), `a` where a fourteen-year-old cannot
 * play it (mortgage, lease, invoice, pension). Never `l`, `x`, `g` or `d`. So
 * a teacher whose cog says school does not get "inheritance", which is the
 * guide's own rule applied consistently. Words that split the Atlantic
 * (licence, tinfoil, petrol, draught, queue), words that are atom titles the
 * autolinker would catch in the guide's run (opening, editing, status,
 * trust), and words too grim for a hall (ashes, grave, prison) are left out.
 */

export type WordRow = [
  text: string,
  specific: number,
  open: number,
  charge: number,
  doable: number,
  grounded: number,
  flags?: string,
  coach?: string,
];

// prettier-ignore
export const WORD_ROWS: WordRow[] = [
  // Things with a smell or a weight.
  ["rust", 5, 5, 2, 5, 5, "", "Something has been left too long. Play who left it."],
  ["varnish", 5, 4, 2, 5, 5],
  ["vinegar", 5, 4, 2, 5, 5],
  ["chalk", 5, 5, 2, 5, 5],
  ["sawdust", 5, 4, 2, 5, 5],
  ["mildew", 5, 4, 2, 5, 5],
  ["diesel", 5, 4, 2, 5, 5],
  ["tar", 5, 4, 2, 5, 5],
  ["wax", 5, 5, 2, 5, 5],
  ["leather", 5, 5, 2, 5, 5],
  ["wool", 5, 4, 1, 5, 5],
  ["ink", 5, 5, 2, 5, 5],
  ["linen", 5, 4, 2, 5, 5],
  ["rope", 5, 5, 3, 5, 5],
  ["gravel", 5, 4, 2, 5, 5],
  ["plaster", 5, 4, 2, 5, 5],
  ["cardboard", 5, 5, 2, 5, 5],
  ["foil", 5, 4, 2, 5, 5],
  // Places.
  ["cellar", 4, 5, 3, 5, 5],
  ["attic", 4, 5, 3, 5, 5],
  ["garage", 4, 5, 2, 5, 5],
  ["basement", 4, 5, 3, 5, 5],
  ["porch", 4, 5, 2, 5, 5],
  ["hallway", 4, 5, 2, 5, 5],
  ["pantry", 4, 4, 2, 5, 5],
  ["greenhouse", 4, 4, 2, 5, 5],
  ["kennel", 4, 4, 3, 5, 5],
  ["chapel", 4, 4, 3, 5, 5, "p"],
  ["locker", 4, 5, 3, 5, 5],
  ["warehouse", 4, 4, 2, 5, 5],
  ["lobby", 4, 5, 2, 5, 5],
  ["pier", 4, 4, 2, 5, 5],
  ["quarry", 4, 4, 3, 5, 5],
  ["orchard", 4, 4, 2, 5, 5],
  ["reservoir", 4, 4, 3, 5, 5],
  ["stairwell", 4, 4, 3, 5, 5],
  // Paper and institutions.
  ["inheritance", 3, 5, 5, 4, 5, "p", "Play the people who did not get it."],
  ["deposit", 3, 5, 3, 4, 5, "", "A bank, a bottle or a river: take the one the room did not."],
  ["invoice", 3, 4, 3, 4, 5, "a"],
  ["receipt", 3, 5, 3, 4, 5],
  ["lease", 3, 4, 4, 4, 5, "a"],
  ["passport", 3, 5, 3, 4, 5],
  ["warranty", 3, 4, 3, 4, 5],
  ["permit", 3, 5, 3, 4, 5],
  ["ledger", 3, 4, 3, 4, 5],
  ["pension", 3, 4, 4, 4, 5, "a"],
  ["mortgage", 3, 4, 4, 4, 5, "a"],
  ["custody", 3, 4, 5, 4, 5, "p"],
  ["verdict", 3, 5, 5, 4, 5, "", "The room goes quiet. Play the minute before."],
  ["apprenticeship", 3, 4, 3, 4, 5],
  ["audition", 3, 4, 4, 4, 5],
  ["inventory", 3, 4, 2, 4, 5],
  ["refund", 3, 4, 3, 4, 5],
  ["souvenir", 3, 5, 2, 4, 5],
  ["heirloom", 3, 4, 4, 4, 5],
  // Objects with a history.
  ["compass", 5, 4, 2, 5, 5],
  ["thermos", 5, 4, 2, 5, 5],
  ["harmonica", 5, 4, 2, 5, 5],
  ["typewriter", 5, 4, 2, 5, 5],
  ["lantern", 5, 4, 2, 5, 5],
  ["suitcase", 5, 5, 3, 5, 5, "", "Arriving or leaving; decide which, then play the other."],
  ["doorbell", 5, 5, 3, 5, 5, "", "Play the wait after ringing it."],
  ["thermostat", 5, 4, 3, 5, 5, "", "The war is not about the temperature."],
  ["padlock", 5, 5, 3, 5, 5],
  ["ladder", 5, 5, 3, 5, 5],
  ["kettle", 5, 5, 2, 5, 5],
  ["mattress", 5, 4, 3, 5, 5],
  ["radiator", 5, 4, 3, 5, 5],
  ["wheelbarrow", 5, 4, 2, 5, 5],
  ["toolbox", 5, 4, 2, 5, 5],
  ["trophy", 5, 4, 3, 5, 5],
  ["splinter", 5, 4, 2, 5, 5],
  ["envelope", 5, 5, 3, 5, 5],
  ["postcard", 5, 5, 2, 5, 5],
  ["hourglass", 5, 4, 3, 5, 5],
  ["lampshade", 5, 4, 2, 5, 5],
  ["scaffolding", 5, 4, 2, 5, 5],
  // Two meanings.
  ["draft", 3, 5, 3, 3, 5, "", "Two meanings at least; visit both before a scene starts."],
  ["settlement", 3, 5, 4, 3, 5],
  ["tender", 3, 5, 3, 3, 5],
  ["bolt", 3, 5, 2, 3, 5],
  ["dock", 3, 5, 3, 3, 5],
  ["jam", 3, 5, 2, 3, 5],
  ["stall", 3, 5, 2, 3, 5],
  ["toll", 3, 5, 3, 3, 5],
  ["vault", 3, 5, 3, 3, 5],
  ["wake", 3, 5, 4, 3, 5, "p"],
  // Weather and food.
  ["frost", 5, 5, 2, 5, 5],
  ["thaw", 4, 5, 3, 4, 5],
  ["drought", 4, 4, 3, 4, 5],
  ["harvest", 4, 5, 2, 5, 5],
  ["curfew", 4, 5, 4, 4, 5, "", "Who set it, who broke it, and what they were doing instead."],
  ["marmalade", 5, 4, 2, 5, 5],
  ["gravy", 5, 4, 2, 5, 5],
  ["leftovers", 5, 5, 2, 5, 5, "", "The day after. Play what was not said at the party."],
  ["rhubarb", 5, 4, 2, 5, 5],
  ["hiccup", 4, 4, 2, 5, 5],
  ["whisper", 4, 5, 3, 5, 5],
  ["blister", 5, 4, 2, 5, 5, "p"],
  ["detour", 4, 5, 2, 5, 5],
];
