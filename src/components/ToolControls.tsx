import type { ButtonHTMLAttributes } from "react";

/**
 * The controls the hero tools share, with their states declared once.
 *
 * Four tools sit in a hero and open a dialog — the prompt generator, would you
 * rather, 21 questions, the game picker — and each had written its own option
 * buttons. They agreed on hover and on nothing else: none had a pressed
 * state, none a disabled one, and keyboard focus was invisible on the dark
 * panel in the light theme, because the site's focus ring is
 * `--foreground-strong` (#111) drawn on the hero (#101014). Found on
 * /would-you-rather-questions, 2026-09-27.
 *
 * The standard, for every control a tool renders:
 *
 * - **rest**: a hairline border and a faint fill, so a choice reads as a
 *   thing that can be pressed before it is pointed at.
 * - **hover**: the border comes up to full and the fill doubles. Colour only,
 *   so reduced-motion loses nothing.
 * - **focus-visible**: the site's two-pixel ring, offset clear of the edge, in
 *   `--focus-ring` — the page's strong foreground on a page, the hero's own
 *   foreground inside a `[data-hero-panel]` (globals.css). Never
 *   `outline-none`.
 * - **active**: the fill steps up again while the button is down, so a tap
 *   registers on a phone before anything else happens.
 * - **selected** (`aria-pressed="true"`): full border, the strongest fill, bold
 *   where the caller wants it. The attribute carries the meaning; the styling
 *   reads it.
 * - **disabled**: half opacity and the not-allowed cursor, and nothing else
 *   changes, so a spent control still says what it was.
 *
 * Two palettes, because a tool lives in two places: `hero` on the dark panel
 * (`text-hero-*` tokens, the same in both themes), `page` inside the dialog
 * on the page's own background. Three shapes: a **choice** the reader picks
 * from, an **action** that does the one thing next, and a **quiet** control
 * styled as a line of text for the way back or sideways.
 *
 * The typography inside a choice belongs to the caller — a room's label and
 * note, a pair's side in large type — so the components take children and
 * own only the shell and its states. `tool-controls.test.tsx` holds the
 * standard: the four tools import from here, the class sets carry every
 * state, and the hero panels declare the ring.
 */
export type ToolPalette = "hero" | "page";

const BASE = "cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-50";

/** A card the reader chooses from: a room, a size, a kind, a side. */
export const CHOICE_CLASS: Record<ToolPalette, string> = {
  hero: [
    BASE,
    "rounded-xl border text-left",
    "border-hero-foreground/40 bg-hero-foreground/[0.08] text-hero-foreground",
    "hover:border-hero-foreground/70 hover:bg-hero-foreground/15",
    "active:bg-hero-foreground/25",
    "aria-pressed:border-hero-foreground aria-pressed:bg-hero-foreground/20",
  ].join(" "),
  page: [
    BASE,
    "rounded-lg border text-left",
    "border-border-ui bg-foreground/[0.03] text-foreground-strong",
    "hover:border-foreground-strong hover:bg-foreground/[0.07]",
    "active:bg-foreground/[0.12]",
    "aria-pressed:border-foreground-strong aria-pressed:bg-foreground/10",
  ].join(" "),
};

/** The one thing to do next — deal, draw, finish — and its second. */
export const ACTION_CLASS = {
  primary: [
    BASE,
    "rounded-lg font-semibold",
    "bg-foreground text-background",
    "hover:bg-foreground/90",
    "active:bg-foreground/80",
  ].join(" "),
  secondary: [
    BASE,
    "rounded-lg border",
    "border-border-ui bg-foreground/[0.03] text-foreground-strong",
    "hover:border-foreground-strong hover:bg-foreground/[0.07]",
    "active:bg-foreground/[0.12]",
  ].join(" "),
} as const;

/** A way back or sideways, styled as a line of text. */
export const QUIET_CLASS = [
  BASE,
  "text-foreground-dim underline underline-offset-4",
  "hover:text-foreground",
  "active:text-foreground-strong",
].join(" ");

function join(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type">;

export function ToolChoice({
  palette,
  selected,
  className,
  ...rest
}: ButtonProps & {
  palette: ToolPalette;
  /** A toggle's state; leave undefined on a choice that only navigates. */
  selected?: boolean;
}) {
  return (
    <button
      type="button"
      {...(selected === undefined ? {} : { "aria-pressed": selected })}
      className={join(CHOICE_CLASS[palette], className)}
      {...rest}
    />
  );
}

export function ToolAction({
  kind = "primary",
  className,
  ...rest
}: ButtonProps & { kind?: keyof typeof ACTION_CLASS }) {
  return <button type="button" className={join(ACTION_CLASS[kind], className)} {...rest} />;
}

export function ToolQuiet({ className, ...rest }: ButtonProps) {
  return <button type="button" className={join(QUIET_CLASS, className)} {...rest} />;
}
