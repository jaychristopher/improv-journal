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
    "The first card in the kind step draws a relationship, a location and a shared task together, each from its own ranked pool, so the three lines are the strongest the bank has for your room rather than three random words. Tap any line to change just that one and keep the other two; that is the lock-and-regenerate other generators do with padlocks, done on the line itself. The theory under it is [base reality](/practice/vocabulary/base-reality): a scene needs all three before anything else can happen, and the [improv prompts](/improv-prompts) guide has the method in full.",
  keys: "Space or Enter draws another one, C copies it, K goes back to the kinds and Escape closes. They work from anywhere on the card except a button that already has focus, so a host running a show from a laptop never touches the trackpad. Above a laptop's width the card sets the prompt in display type on its own; there is no show mode to switch on. Everything drawn this session sits under the buttons, newest first, and selects as one block, and the clock beside the count says how long the current prompt has been up.",
  installable:
    "Yes. On a phone, add the page to the home screen from the browser's share or menu and it opens full-screen; the last version of both pages and the whole bank stay on the device, so a hall with no signal still gets a prompt. Nothing about what you draw leaves the device either way.",
} as const;
