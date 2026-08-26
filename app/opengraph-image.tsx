import { ImageResponse } from "next/og";

export const alt = "Kaify Ai — Your Personal Coach Team";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-static";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px",
          background: "linear-gradient(135deg, #0a0a0a 0%, #1a1028 55%, #0a0a0a 100%)",
          color: "white",
        }}
      >
        <div
          style={{
            fontSize: 28,
            letterSpacing: "0.28em",
            color: "#c4b5fd",
            fontWeight: 600,
          }}
        >
          Kaify Ai
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1.1,
            maxWidth: 900,
          }}
        >
          Your personal coach team
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 28,
            color: "#a1a1aa",
            maxWidth: 820,
          }}
        >
          Four expert coaches, analytics, and Kai — from $14.99/month.
        </div>
      </div>
    ),
    { ...size },
  );
}
