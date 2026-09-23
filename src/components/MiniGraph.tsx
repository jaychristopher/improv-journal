"use client";

import Link from "next/link";
import { useId } from "react";

import {
  directRequiresOf,
  type GraphLink,
  type GraphSatellite,
  pickMiniGraphSatellites,
} from "@/lib/mini-graph-picks";
import {
  isRelation,
  RELATION_ORDER,
  type RelationStyle,
  relationStyle,
} from "@/lib/relation-style";

interface MiniGraphProps {
  centerTitle: string;
  centerUrl: string;
  links: GraphLink[];
  /** Map of atom ID → { title, url } for resolving link targets */
  resolvedLinks: Map<string, { title: string; url: string }>;
}

const CENTER_R = 24;
const SATELLITE_R = 18;

/**
 * The relations present among the drawn edges, in legend order, with any
 * relation the schema does not name listed last under its own string.
 */
function relationsPresent(links: readonly GraphSatellite[]): string[] {
  const present = new Set(links.map((l) => l.relation));
  const known = RELATION_ORDER.filter((r) => present.has(r));
  const unknown = [...present].filter((r) => !isRelation(r)).sort();
  return [...known, ...unknown];
}

function edgeProps(style: RelationStyle) {
  return {
    className: style.className,
    strokeWidth: style.strokeWidth,
    strokeDasharray: style.dasharray,
    strokeLinecap: "round" as const,
  };
}

export function MiniGraph({ centerTitle, links, resolvedLinks }: MiniGraphProps) {
  const markerId = useId();
  if (links.length === 0) return null;

  // Not the first six declared: chosen by relation priority, with the knot
  // collapsed to "the core" — see mini-graph-picks for the measurement. The
  // direct `requires` set comes off the links' flags (the index writes them,
  // entry 302); an implied prerequisite is not drawn and counts in "+N more".
  const { satellites: displayLinks, more } = pickMiniGraphSatellites(
    links,
    directRequiresOf(links),
  );
  const cx = 200;
  const cy = 120;
  const radius = 90;
  const present = relationsPresent(displayLinks);
  const markerFor = (relation: string) => `${markerId}-${relation}`;

  return (
    <div className="border-foreground/10 bg-surface mb-6 rounded-lg border p-4">
      <h3 className="text-foreground/40 mb-3 text-xs font-semibold tracking-wider uppercase">
        Connections
      </h3>
      <div className="flex flex-wrap items-start gap-4">
        <svg
          viewBox="0 0 400 240"
          className="w-full max-w-md"
          role="img"
          aria-label={`${centerTitle} and its connections`}
        >
          <defs>
            {present.map((relation) => {
              const style = relationStyle(relation);
              if (!style.arrowhead) return null;
              return (
                <marker
                  key={relation}
                  id={markerFor(relation)}
                  viewBox="0 0 8 8"
                  refX="7"
                  refY="4"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto"
                >
                  <path d="M0,0 L8,4 L0,8 z" className={style.markerClassName} />
                </marker>
              );
            })}
          </defs>

          {/* Edges, one per link, styled by relation */}
          {displayLinks.map((link, i) => {
            const angle = (i / displayLinks.length) * Math.PI * 2 - Math.PI / 2;
            const dx = Math.cos(angle);
            const dy = Math.sin(angle);
            const style = relationStyle(link.relation);
            // Start at the centre circle's rim and stop at the satellite's,
            // so an arrowhead lands on the node instead of under it.
            const gap = style.arrowhead ? 3 : 0;
            const x1 = cx + dx * CENTER_R;
            const y1 = cy + dy * CENTER_R;
            const x2 = cx + dx * (radius - SATELLITE_R - gap);
            const y2 = cy + dy * (radius - SATELLITE_R - gap);
            const target = link.label ?? resolvedLinks.get(link.id)?.title ?? link.id;
            // The core's title names what it stands for, so a screen reader
            // hears the members the one node collapsed.
            const stands =
              link.members.length > 1
                ? ` — ${link.members.map((id) => resolvedLinks.get(id)?.title ?? id).join(", ")}`
                : "";
            return (
              <g key={`edge-${link.id}`} data-relation={link.relation}>
                <title>{`${centerTitle} ${style.label.toLowerCase()} ${target} (${link.relation})${stands}`}</title>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  {...edgeProps(style)}
                  markerEnd={style.arrowhead ? `url(#${markerFor(link.relation)})` : undefined}
                />
              </g>
            );
          })}

          {/* Center node */}
          <circle
            cx={cx}
            cy={cy}
            r={CENTER_R}
            className="fill-foreground/5 stroke-foreground/20"
            strokeWidth={1}
          />
          <text
            x={cx}
            y={more > 0 ? cy - 5 : cy}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-foreground/70 text-[9px] font-medium"
          >
            {centerTitle.length > 18 ? centerTitle.substring(0, 16) + "..." : centerTitle}
          </text>
          {/* The links the six slots left out, so a truncated graph says it is one */}
          {more > 0 && (
            <text
              x={cx}
              y={cy + 7}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-foreground/40 text-[7px]"
              data-more={more}
            >
              +{more} more
            </text>
          )}

          {/* Satellite nodes */}
          {displayLinks.map((link, i) => {
            const angle = (i / displayLinks.length) * Math.PI * 2 - Math.PI / 2;
            const x = cx + Math.cos(angle) * radius;
            const y = cy + Math.sin(angle) * radius;
            const resolved = resolvedLinks.get(link.id);
            const label = link.label ?? resolved?.title ?? link.id;
            const shortLabel = label.length > 14 ? label.substring(0, 12) + "..." : label;
            // The core node links the page that defines it, not the member
            // it happens to stand at (entry 315).
            const href = link.href ?? resolved?.url;

            return (
              <g
                key={link.id}
                data-members={link.members.length > 1 ? link.members.join(" ") : undefined}
              >
                <circle
                  cx={x}
                  cy={y}
                  r={SATELLITE_R}
                  className="fill-surface stroke-foreground/10 hover:stroke-foreground/30 cursor-pointer"
                  strokeWidth={1}
                />
                {href ? (
                  <Link href={href}>
                    <text
                      x={x}
                      y={y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="fill-foreground/50 hover:fill-foreground/80 cursor-pointer text-[8px]"
                    >
                      {shortLabel}
                    </text>
                  </Link>
                ) : (
                  <text
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="fill-foreground/40 text-[8px]"
                  >
                    {shortLabel}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Legend: only the relations actually drawn */}
        <ul className="text-foreground/60 flex flex-col gap-1.5 text-xs" aria-label="Edge legend">
          {present.map((relation) => {
            const style = relationStyle(relation);
            return (
              <li key={relation} className="flex items-center gap-2" data-relation={relation}>
                <svg viewBox="0 0 36 8" width="36" height="8" aria-hidden="true">
                  <line
                    x1={1}
                    y1={4}
                    x2={style.arrowhead ? 30 : 35}
                    y2={4}
                    {...edgeProps(style)}
                    markerEnd={style.arrowhead ? `url(#${markerFor(relation)})` : undefined}
                  />
                </svg>
                <span>
                  {style.label} <span className="text-foreground/35">({relation})</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
