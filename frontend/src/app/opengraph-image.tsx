import { ImageResponse } from "next/og";

// Social share / AI-engine preview card (used for Open Graph + Twitter).
export const alt = "Highlight — Get cited by AI answer engines";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #6F55EE 0%, #1BC8E8 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: 6, opacity: 0.92 }}>
          HIGHLIGHT
        </div>
        <div style={{ fontSize: 74, fontWeight: 800, lineHeight: 1.05, marginTop: 24, maxWidth: 940 }}>
          When buyers ask AI, be the answer it gives.
        </div>
        <div style={{ fontSize: 30, marginTop: 28, opacity: 0.92, maxWidth: 900 }}>
          Measure your AI Share of Voice across ChatGPT, Perplexity & Gemini — then generate the
          content that gets you cited.
        </div>
      </div>
    ),
    { ...size },
  );
}
