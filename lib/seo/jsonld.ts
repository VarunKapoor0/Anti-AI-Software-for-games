import type { GameWithDisclosure } from "../db/queries";
import { siteUrl } from "./metadata";

export function videoGameJsonLd(game: GameWithDisclosure, canonicalUrl: string) {
  const disclosureSummary = game.hasDisclosure
    ? `According to the developer's disclosure on Steam (scraped ${
        game.scrapedAt ? new Date(game.scrapedAt).toISOString().split("T")[0] : "unknown date"
      }), ${game.name} ${
        game.preGeneratedContent ? "discloses pre-generated AI content" : "does not disclose pre-generated AI content"
      } and ${
        game.liveGeneratedContent ? "discloses live-generated AI content" : "does not disclose live-generated AI content"
      }.`
    : `No AI content disclosure found for ${game.name} on Steam as of ${
        game.scrapedAt ? new Date(game.scrapedAt).toISOString().split("T")[0] : "last check"
      }. Absence of disclosure does not confirm absence of AI use.`;

  return {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: game.name,
    ...(game.publisher
      ? { publisher: { "@type": "Organization", name: game.publisher } }
      : {}),
    ...(game.developer
      ? { author: { "@type": "Organization", name: game.developer } }
      : {}),
    ...(game.releaseDate ? { datePublished: game.releaseDate } : {}),
    url: canonicalUrl,
    sameAs: [game.steamUrl],
    description: disclosureSummary,
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "AI in Games",
    url: siteUrl,
    description:
      "Aggregates developer self-disclosures about AI-generated content in video games, sourced from Steam.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}
