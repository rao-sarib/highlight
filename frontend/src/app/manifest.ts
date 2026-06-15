import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Highlight — AI SEO & GEO Platform",
    short_name: "Highlight",
    description:
      "Measure your AI Share of Voice across ChatGPT, Perplexity & Gemini, audit your whole site, and generate GEO content that earns citations.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#6F55EE",
    icons: [{ src: "/logo.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
