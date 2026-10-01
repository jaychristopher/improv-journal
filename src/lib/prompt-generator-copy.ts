/**
 * The prompt generator page's answers about the classic card, the keys and
 * installing, held here for the reason games-hub-copy.ts gives: the route
 * file's prose sits under a ceiling that may only fall
 * (hub-prose-links.test.ts), and that file lists this module so every value
 * is still checked to render as itself. Every value is markdown; the
 * autolinker runs over it at render time.
 */
export const PROMPT_GENERATOR_COPY = {
  classic:
    "The first card in the kind step draws a relationship, a location and a shared task together, each from its own ranked pool, so the three lines are the strongest the bank has — for the room the cog names, or for all four at once — rather than three random words. Tap any line to change just that one and keep the other two; that is the lock-and-regenerate other generators do with padlocks, done on the line itself. The theory under it is [base reality](/practice/vocabulary/base-reality): a scene needs all three before anything else can happen, and the [improv prompts](/improv-prompts) guide has the method in full.",
  word: "A longform opening — a Harold, an Armando, an organic opening — takes a single word from the crowd, and the first scenes come from the group's association rather than from the word. The list is curated for texture, a noun with a smell, a weight or a history, and it sits outside the count of scene starters, because the [improv prompts](/improv-prompts) guide argues, rightly, that a bare noun is the weakest start for a two-person scene; the guide's section on the one-word opening lists every word and makes the case. The cog's hand deals eight at once for eight groups, and a school room keeps out the words that land on a life.",
  keys: "Space or Enter draws another one, C copies it, K goes back to the kinds and Escape closes. They work from anywhere on the card except a button that already has focus, so a host running a show from a laptop never touches the trackpad. Above a laptop's width the card sets the prompt in display type on its own; there is no show mode to switch on. The clock beside the count says how long the current prompt has been up.",
  settings:
    "The cog in the corner holds four things and keeps them on this device. *Playing in* names the room: anywhere, a class or rehearsal, a show, a school drama room or a team session. Anywhere is the default and blends the four, so every prompt is in the pool, weighted for all of them at once; a room shifts the weighting to what that room needs, and a school room or a work room also keeps out what the [improv prompts](/improv-prompts) guide says to keep out of one. *How many at a time* deals a hand of up to eight, numbered, for handing out to pairs; the who, where, what card is always one. *Change on its own* deals the next card after thirty seconds to five minutes, with the clock counting down, so a class runs rounds with nobody at the laptop. *Forget what this device has seen* starts every pool again from its strongest prompts. Nothing else is a setting: the type size, where the notes sit and the never-repeat rule look after themselves.",
  installable:
    "Yes. On a phone, add the page to the home screen from the browser's share or menu and it opens full-screen; the last version of both pages and the whole bank stay on the device, so a hall with no signal still gets a prompt. Nothing about what you draw leaves the device either way.",
} as const;
