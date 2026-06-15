import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://highlight-fyp.netlify.app";

// Allow crawling of public marketing pages; keep the logged-in app + admin out
// of the index (they're behind auth and have no SEO value).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/projects", "/settings", "/adminpanel"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
