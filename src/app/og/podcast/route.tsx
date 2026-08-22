import { ImageResponse } from "next/og";

import { SITE_NAME } from "@/lib/seo";

export const contentType = "image/png";

/**
 * Square podcast artwork.
 *
 * Apple Podcasts and Spotify both reject a feed outright if the channel has no
 * itunes:image, and both require square art of at least 1400x1400 — so this is
 * a submission blocker, not a nicety.
 */
const SIZE = { width: 1400, height: 1400 };

function titleSize(title: string): number {
  if (title.length <= 24) return 130;
  if (title.length <= 40) return 104;
  return 82;
}

export function GET(request: Request) {
  const title = (new URL(request.url).searchParams.get("title") ?? SITE_NAME).slice(0, 80);

  return new ImageResponse(
    <div
      style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "120px",
      }}
    >
      <div
        style={{
          fontSize: titleSize(title),
          fontWeight: 700,
          color: "#f8fafc",
          textAlign: "center",
          lineHeight: 1.1,
          display: "flex",
        }}
      >
        {title}
      </div>
      <div
        style={{
          width: "120px",
          height: "6px",
          background: "#64748b",
          margin: "56px 0",
          display: "flex",
        }}
      />
      <div
        style={{
          fontSize: 44,
          color: "#cbd5e1",
          textAlign: "center",
          letterSpacing: "0.04em",
          display: "flex",
        }}
      >
        {SITE_NAME}
      </div>
    </div>,
    { ...SIZE },
  );
}
