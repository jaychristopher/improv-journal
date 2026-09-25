import { ImageResponse } from "next/og";

import { SITE_NAME } from "@/lib/seo";

export const contentType = "image/png";

const SIZE = { width: 1200, height: 630 };

/** Longer titles need smaller type to stay inside the card. */
function titleSize(title: string): number {
  if (title.length <= 40) return 64;
  if (title.length <= 70) return 54;
  if (title.length <= 100) return 44;
  return 38;
}

/**
 * Per-page share card.
 *
 * Pages that declare their own `openGraph` metadata do not inherit the
 * root opengraph-image, which left every guide, atom and thread — 254 pages —
 * previewing as a bare link with no image anywhere it was shared.
 *
 * Image search was weighed and declined (SA-13.1, 2026-09-25). The 248
 * diagrams are inlined at build time on purpose — theme-aware, in the page's
 * typeface, nothing shipped to the client — and inventory for image search
 * means raster derivatives referenced by <img>, which trades that away for a
 * channel nobody has sized. The card carries each diagram's description
 * instead, and Article markup already lists the diagram first (articleImages).
 */
export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const title = (params.get("title") ?? SITE_NAME).slice(0, 140);
  const eyebrow = params.get("eyebrow")?.slice(0, 60);
  // The page's primary diagram, described. See ogImages for why the
  // description travels and the picture does not.
  const sub = params.get("sub")?.slice(0, 200);

  return new ImageResponse(
    <div
      style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px",
      }}
    >
      {eyebrow ? (
        <div
          style={{
            fontSize: 26,
            color: "#94a3b8",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            display: "flex",
          }}
        >
          {eyebrow}
        </div>
      ) : (
        <div style={{ display: "flex" }} />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div
          style={{
            fontSize: sub ? Math.min(titleSize(title), 54) : titleSize(title),
            fontWeight: 700,
            color: "#f8fafc",
            lineHeight: 1.15,
            display: "flex",
          }}
        >
          {title}
        </div>
        {sub ? (
          <div style={{ fontSize: 26, color: "#cbd5e1", lineHeight: 1.35, display: "flex" }}>
            {sub}
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div style={{ width: "40px", height: "4px", background: "#64748b", display: "flex" }} />
        <div style={{ fontSize: 26, color: "#cbd5e1", display: "flex" }}>{SITE_NAME}</div>
      </div>
    </div>,
    { ...SIZE },
  );
}
