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
 */
export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const title = (params.get("title") ?? SITE_NAME).slice(0, 140);
  const eyebrow = params.get("eyebrow")?.slice(0, 60);

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

      <div
        style={{
          fontSize: titleSize(title),
          fontWeight: 700,
          color: "#f8fafc",
          lineHeight: 1.15,
          display: "flex",
        }}
      >
        {title}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div style={{ width: "40px", height: "4px", background: "#64748b", display: "flex" }} />
        <div style={{ fontSize: 26, color: "#cbd5e1", display: "flex" }}>{SITE_NAME}</div>
      </div>
    </div>,
    { ...SIZE },
  );
}
