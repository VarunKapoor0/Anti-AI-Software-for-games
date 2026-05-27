import type { Metadata } from "next";
import type { GameWithDisclosure } from "../db/queries";

const siteUrl = process.env.SITE_URL ?? "https://ai-in-games.example.com";
const siteName = "AI in Games";

export function baseMetadata(): Metadata {
  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: `${siteName} — AI Content Disclosures for Video Games`,
      template: `%s — ${siteName}`,
    },
    description:
      "Find out which video games disclose AI-generated content. We aggregate developer self-disclosures from Steam, with sources and timestamps for every claim.",
    openGraph: {
      siteName,
      type: "website",
      locale: "en_US",
    },
    twitter: { card: "summary_large_image" },
    robots: { index: true, follow: true },
  };
}

export function gameMetadata(game: GameWithDisclosure, canonicalUrl: string): Metadata {
  const disclosureSummary = game.hasDisclosure
    ? `Discloses ${[
        game.preGeneratedContent ? "pre-generated AI content" : null,
        game.liveGeneratedContent ? "live-generated AI content" : null,
      ]
        .filter(Boolean)
        .join(" and ")}`
    : "No AI content disclosure found on Steam";

  const description = `${game.name} by ${game.developer ?? "unknown developer"}. ${disclosureSummary}. Source: Steam store page.`;

  return {
    title: `${game.name} — AI Content Disclosure`,
    description,
    openGraph: {
      title: `${game.name} — AI Content Disclosure`,
      description,
      url: canonicalUrl,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${game.name} — AI Content Disclosure`,
      description,
    },
    alternates: { canonical: canonicalUrl },
  };
}

export { siteUrl, siteName };
