/**
 * One body-scroll lock, reference counted.
 *
 * Nav and SearchInput each wrote `document.body.style.overflow` from their
 * own effect, with no knowledge of the other. Measured on 2026-09-24: open
 * the mobile menu, open search, close search — and the page unlocked while
 * the menu was still covering it. Two components cannot own one global
 * property.
 *
 * `lockScroll()` returns the release for its own claim; the page only
 * unlocks when the last claim is released.
 */
let claims = 0;
let previous = "";

export function lockScroll(): () => void {
  if (claims === 0) {
    previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  claims += 1;
  let released = false;

  return () => {
    // Guard against a double release: React can run a cleanup twice in
    // development, and a negative count would unlock while somebody holds.
    if (released) return;
    released = true;
    claims -= 1;
    if (claims === 0) document.body.style.overflow = previous;
  };
}
