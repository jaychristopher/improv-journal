import { type Relation, RELATION_LABELS } from "./relation-labels";

export type { Relation };

/**
 * How one relation is drawn as an edge.
 *
 * `className` and `markerClassName` are literal Tailwind classes, spelled out
 * rather than derived, because Tailwind only emits classes it can find as
 * whole strings in source. `dasharray` is undefined for a solid line.
 */
export interface RelationStyle {
  /** The reader-facing name: the outbound label from relation-labels.ts, the one AtomDetail uses. */
  label: string;
  /** Tailwind stroke class for the line and the legend swatch. */
  className: string;
  /** Tailwind fill class for the arrowhead marker, when `arrowhead` is set. */
  markerClassName: string;
  strokeWidth: number;
  dasharray?: string;
  /** Directed relations get an arrowhead at the target end. */
  arrowhead: boolean;
}

/**
 * One visual grammar for the five declared relations, so a prerequisite and a
 * counter-example stop looking like the same faint line (novel-insights #61).
 *
 * The two directed relations, `requires` and `enables`, are the only ones
 * that carry an arrowhead; they differ by dash. `contrasts` is the only one
 * in colour, because it is the only relation that says "not this". `extends`
 * is the quietest solid line and `illustrates` the grey one, since both are
 * associations rather than dependencies.
 */
export const RELATION_STYLE: Record<Relation, RelationStyle> = {
  requires: {
    label: RELATION_LABELS.requires.outbound,
    className: "stroke-foreground/60",
    markerClassName: "fill-foreground/60",
    strokeWidth: 1.5,
    arrowhead: true,
  },
  enables: {
    label: RELATION_LABELS.enables.outbound,
    className: "stroke-foreground/50",
    markerClassName: "fill-foreground/50",
    strokeWidth: 1.25,
    dasharray: "6 3",
    arrowhead: true,
  },
  contrasts: {
    label: RELATION_LABELS.contrasts.outbound,
    className: "stroke-red-500/70",
    markerClassName: "fill-red-500/70",
    strokeWidth: 1.25,
    dasharray: "1.5 3",
    arrowhead: false,
  },
  extends: {
    label: RELATION_LABELS.extends.outbound,
    className: "stroke-foreground/40",
    markerClassName: "fill-foreground/40",
    strokeWidth: 0.75,
    arrowhead: false,
  },
  illustrates: {
    label: RELATION_LABELS.illustrates.outbound,
    className: "stroke-foreground/25",
    markerClassName: "fill-foreground/25",
    strokeWidth: 1,
    arrowhead: false,
  },
};

/** The order the legend lists relations in: dependencies first, associations last. */
export const RELATION_ORDER: Relation[] = [
  "requires",
  "enables",
  "extends",
  "contrasts",
  "illustrates",
];

/** Anything the schema does not name draws as the quietest line and says so in the legend. */
export const UNKNOWN_RELATION_STYLE: RelationStyle = {
  label: "Linked",
  className: "stroke-foreground/15",
  markerClassName: "fill-foreground/15",
  strokeWidth: 1,
  arrowhead: false,
};

export function isRelation(value: string): value is Relation {
  return Object.prototype.hasOwnProperty.call(RELATION_STYLE, value);
}

export function relationStyle(relation: string): RelationStyle {
  return isRelation(relation) ? RELATION_STYLE[relation] : UNKNOWN_RELATION_STYLE;
}
