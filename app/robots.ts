import type { MetadataRoute } from "next";

const siteUrl = process.env.SITE_URL ?? "https://ai-in-games.example.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/cron/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
