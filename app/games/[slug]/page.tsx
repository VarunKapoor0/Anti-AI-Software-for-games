import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getGameBySlug, getDisclosureHistory } from "@/lib/db/queries";
import { DisclosureBadge } from "@/components/DisclosureBadge";
import { gameMetadata, siteUrl } from "@/lib/seo/metadata";
import { videoGameJsonLd } from "@/lib/seo/jsonld";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const game = await getGameBySlug(params.slug);
  if (!game) return { title: "Game not found" };
  const canonicalUrl = `${siteUrl}/games/${game.slug}`;
  return gameMetadata(game, canonicalUrl);
}

export const revalidate = 3600;

export default async function GamePage({ params }: Props) {
  const game = await getGameBySlug(params.slug);
  if (!game) notFound();

  const history = await getDisclosureHistory(game.id);
  const canonicalUrl = `${siteUrl}/games/${game.slug}`;

  const disclosureSummary = game.hasDisclosure
    ? `According to the developer's disclosure on Steam (scraped ${
        game.scrapedAt ? new Date(game.scrapedAt).toISOString().split("T")[0] : "unknown date"
      }), ${game.name} ${game.preGeneratedContent ? "discloses pre-generated AI content" : "does not disclose pre-generated AI content"} and ${game.liveGeneratedContent ? "discloses live-generated AI content" : "does not disclose live-generated AI content"}.`
    : `No AI content disclosure found for ${game.name} on Steam as of ${
        game.scrapedAt ? new Date(game.scrapedAt).toISOString().split("T")[0] : "last check"
      }. Absence of disclosure does not confirm absence of AI use.`;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(videoGameJsonLd(game, canonicalUrl)) }}
      />

      <article className="space-y-8">
        <header className="flex flex-col sm:flex-row gap-6">
          {game.headerImageUrl && (
            <div className="shrink-0">
              <Image
                src={game.headerImageUrl}
                alt={`${game.name} header image`}
                width={460}
                height={215}
                className="rounded-lg object-cover w-full sm:w-64"
                priority
              />
            </div>
          )}
          <div className="space-y-3">
            <h1 className="text-2xl font-bold">{game.name}</h1>
            <dl className="space-y-1 text-sm" style={{ color: "var(--muted)" }}>
              {game.developer && (
                <div className="flex gap-2">
                  <dt className="font-medium" style={{ color: "var(--fg)" }}>
                    Developer
                  </dt>
                  <dd>{game.developer}</dd>
                </div>
              )}
              {game.publisher && (
                <div className="flex gap-2">
                  <dt className="font-medium" style={{ color: "var(--fg)" }}>
                    Publisher
                  </dt>
                  <dd>{game.publisher}</dd>
                </div>
              )}
              {game.releaseDate && (
                <div className="flex gap-2">
                  <dt className="font-medium" style={{ color: "var(--fg)" }}>
                    Released
                  </dt>
                  <dd>
                    <time dateTime={game.releaseDate}>{game.releaseDate}</time>
                  </dd>
                </div>
              )}
            </dl>
            <DisclosureBadge game={game} />
            <a
              href={game.steamUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm hover:underline"
              style={{ color: "var(--accent)" }}
            >
              View on Steam →
            </a>
          </div>
        </header>

        <section
          aria-labelledby="disclosure-heading"
          className="rounded-lg border p-6 space-y-6"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}
        >
          <h2 id="disclosure-heading" className="text-lg font-semibold">
            AI Content Disclosure
          </h2>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>
              What the developer disclosed
            </h3>
            {game.hasDisclosure ? (
              <div className="space-y-2">
                {game.preGeneratedContent && (
                  <p className="flex items-center gap-2 text-sm">
                    <span style={{ color: "var(--disclosure-yes)" }}>✓</span>
                    Pre-generated AI content disclosed
                  </p>
                )}
                {game.liveGeneratedContent && (
                  <p className="flex items-center gap-2 text-sm">
                    <span style={{ color: "var(--disclosure-yes)" }}>✓</span>
                    Live-generated AI content disclosed
                  </p>
                )}
                {game.disclosureText && (
                  <blockquote
                    className="mt-3 pl-4 border-l-2 text-sm italic"
                    style={{ borderColor: "var(--accent)", color: "var(--muted)" }}
                  >
                    {game.disclosureText}
                  </blockquote>
                )}
              </div>
            ) : (
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                No AI content disclosure found on this game&apos;s Steam store page.
              </p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>
              When this was last verified
            </h3>
            {game.scrapedAt ? (
              <p className="text-sm">
                Scraped from{" "}
                <a
                  href={game.steamUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                  style={{ color: "var(--accent)" }}
                >
                  Steam store page
                </a>{" "}
                on{" "}
                <time dateTime={new Date(game.scrapedAt).toISOString()}>
                  {new Date(game.scrapedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
                .
              </p>
            ) : (
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                Not yet scraped.
              </p>
            )}
          </div>

          <div
            className="rounded border p-4 text-sm"
            style={{ borderColor: "var(--border)", color: "var(--muted)" }}
            role="note"
          >
            <h3 className="font-semibold mb-1" style={{ color: "var(--fg)" }}>
              What we couldn&apos;t determine
            </h3>
            <p>
              This site only surfaces what developers have self-reported on Steam. The absence of a
              disclosure does not prove that a game contains no AI-generated content. We do not
              perform independent technical verification.{" "}
              <Link href="/about" className="hover:underline" style={{ color: "var(--accent)" }}>
                Learn about our methodology.
              </Link>
            </p>
          </div>
        </section>

        {/* FAQ block for AEO/AI citation */}
        <section aria-labelledby="faq-heading" className="space-y-4">
          <h2 id="faq-heading" className="text-lg font-semibold">
            Frequently asked
          </h2>
          <details className="text-sm">
            <summary className="cursor-pointer font-medium mb-1">
              Does {game.name} use AI-generated content?
            </summary>
            <p className="mt-2 pl-4" style={{ color: "var(--muted)" }}>
              {disclosureSummary}
            </p>
          </details>
          <details className="text-sm">
            <summary className="cursor-pointer font-medium mb-1">
              Where does this data come from?
            </summary>
            <p className="mt-2 pl-4" style={{ color: "var(--muted)" }}>
              This data is scraped from{" "}
              <a
                href={game.steamUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
                style={{ color: "var(--accent)" }}
              >
                {game.name}&apos;s Steam store page
              </a>
              . We collect only the AI content disclosure section that Valve requires developers to
              fill out.
            </p>
          </details>
        </section>

        {history.length > 1 && (
          <section aria-labelledby="history-heading" className="space-y-3">
            <h2 id="history-heading" className="text-lg font-semibold">
              Disclosure history
            </h2>
            <ol className="space-y-2 text-sm" style={{ color: "var(--muted)" }}>
              {history.map((entry) => (
                <li key={entry.id} className="flex gap-3">
                  <time dateTime={new Date(entry.scrapedAt).toISOString()} className="shrink-0 font-mono text-xs pt-0.5">
                    {new Date(entry.scrapedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </time>
                  <span>
                    {entry.hasDisclosure
                      ? `Disclosed: ${[
                          entry.preGeneratedContent ? "pre-generated" : null,
                          entry.liveGeneratedContent ? "live-generated" : null,
                        ]
                          .filter(Boolean)
                          .join(", ")} AI content`
                      : "No disclosure found"}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}
      </article>
    </>
  );
}
