import type { MetadataRoute } from "next";
import { listGames } from "@/lib/db/queries";

const siteUrl = process.env.SITE_URL ?? "https://ai-in-games.example.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/games`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/search`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
  ];

  let gamePages: MetadataRoute.Sitemap = [];
  try {
    const { games } = await listGames({ limit: 1000, offset: 0, sort: "updated" });
    gamePages = games.map((game) => ({
      url: `${siteUrl}/games/${game.slug}`,
      lastModified: game.lastUpdatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch {
    // DB unavailable at build time — return static pages only
  }

  return [...staticPages, ...gamePages];
}
