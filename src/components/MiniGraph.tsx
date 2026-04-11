"use client";

import Link from "next/link";

interface GraphLink {
  id: string;
  relation: string;
}

interface MiniGraphProps {
  centerTitle: string;
  centerUrl: string;
  links: GraphLink[];
  /** Map of atom ID → { title, url } for resolving link targets */
  resolvedLinks: Map<string, { title: string; url: string }>;
}

export function MiniGraph({ centerTitle, links, resolvedLinks }: MiniGraphProps) {
  if (links.length === 0) return null;

  const displayLinks = links.slice(0, 6);
  const cx = 200;
  const cy = 120;
  const radius = 90;

  return (
    <div className="border-foreground/10 bg-surface mb-6 rounded-lg border p-4">
      <h3 className="text-foreground/40 mb-3 text-xs font-semibold tracking-wider uppercase">
        Connections
      </h3>
      <svg
        viewBox="0 0 400 240"
        className="w-full max-w-md"
        role="img"
        aria-label={`${centerTitle} and its connections`}
      >
        {/* Lines */}
        {displayLinks.map((link, i) => {
          const angle = (i / displayLinks.length) * Math.PI * 2 - Math.PI / 2;
          const x = cx + Math.cos(angle) * radius;
          const y = cy + Math.sin(angle) * radius;
          return (
            <line
              key={`line-${link.id}`}
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              className="stroke-foreground/10"
              strokeWidth={1}
            />
          );
        })}

        {/* Center node */}
        <circle
          cx={cx}
          cy={cy}
          r={24}
          className="fill-foreground/5 stroke-foreground/20"
          strokeWidth={1}
        />
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-foreground/70 text-[9px] font-medium"
        >
          {centerTitle.length > 18 ? centerTitle.substring(0, 16) + "..." : centerTitle}
        </text>

        {/* Satellite nodes */}
        {displayLinks.map((link, i) => {
          const angle = (i / displayLinks.length) * Math.PI * 2 - Math.PI / 2;
          const x = cx + Math.cos(angle) * radius;
          const y = cy + Math.sin(angle) * radius;
          const resolved = resolvedLinks.get(link.id);
          const label = resolved?.title ?? link.id;
          const shortLabel = label.length > 14 ? label.substring(0, 12) + "..." : label;

          return (
            <g key={link.id}>
              <circle
                cx={x}
                cy={y}
                r={18}
                className="fill-foreground/[0.03] stroke-foreground/10 hover:stroke-foreground/30 cursor-pointer"
                strokeWidth={1}
              />
              {resolved?.url ? (
                <Link href={resolved.url}>
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
    </div>
  );
}
