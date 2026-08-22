import { ImageResponse } from "next/og";

import { getSystemCounts } from "@/lib/system-counts";

export const alt = "The Physics of Connection";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  const { tagline } = await getSystemCounts();

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
        padding: "60px",
      }}
    >
      <div
        style={{
          fontSize: 72,
          fontWeight: 700,
          color: "#f8fafc",
          textAlign: "center",
          lineHeight: 1.2,
          marginBottom: "24px",
        }}
      >
        The Physics of Connection
      </div>
      <div
        style={{
          fontSize: 28,
          color: "#94a3b8",
          textAlign: "center",
          maxWidth: "800px",
          lineHeight: 1.5,
        }}
      >
        {`${tagline} — discovered on the improv stage, applicable everywhere.`}
      </div>
    </div>,
    { ...size },
  );
}
