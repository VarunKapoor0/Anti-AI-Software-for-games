import Link from "next/link";
import { SearchBar } from "@/components/SearchBar";
import { DisclosureBadge } from "@/components/DisclosureBadge";
import { getStats, listGames } from "@/lib/db/queries";

export const revalidate = 300;

export default async function HomePage() {
  const [stats, recent] = await Promise.all([
    getStats().catch(() => null),
    listGames({ limit: 10, offset: 0, sort: "updated" }).catch(() => ({ games: [], total: 0 })),
  ]);

  return (
    <div className="space-y-10">
      <section aria-labelledby="hero-heading">
        <h1 id="hero-heading" className="text-3xl font-bold tracking-tight mb-3">
          AI Content Disclosures for Video Games
        </h1>
        <p className="mb-1" style={{ color: "var(--muted)" }}>
          Find out which games disclose AI-generated content, based on developer self-disclosures on
          Steam.
        </p>
        <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
          We currently aggregate developer self-disclosures from Steam. We do not independently
          verify them. Absence of disclosure does not confirm absence of AI use.
        </p>
        <SearchBar placeholder="Search by game name or developer..." />
      </section>

      {stats && (
        <section aria-labelledby="stats-heading">
          <h2 id="stats-heading" className="sr-only">
            Statistics
          </h2>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Games tracked", value: stats.totalGames.toLocaleString() },
              { label: "Disclose AI content", value: stats.gamesWithDisclosure.toLocaleString() },
              { label: "Pre-generated AI", value: stats.gamesWithPreGenerated.toLocaleString() },
              { label: "Live-generated AI", value: stats.gamesWithLiveGenerated.toLocaleString() },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-lg border p-4"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}
              >
                <dt className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--muted)" }}>
                  {label}
                </dt>
                <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          {stats.lastScrapeAt && (
            <p className="mt-3 text-xs" style={{ color: "var(--muted)" }}>
              Last updated:{" "}
              <time dateTime={stats.lastScrapeAt.toISOString()}>
                {stats.lastScrapeAt.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
            </p>
          )}
        </section>
      )}

      <section aria-labelledby="recent-heading">
        <div className="flex items-center justify-between mb-4">
          <h2 id="recent-heading" className="text-lg font-semibold">
            Recently updated
          </h2>
          <Link href="/games" className="text-sm" style={{ color: "var(--accent)" }}>
            Browse all
          </Link>
        </div>
        {recent.games.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>No games yet. Run the scraper to populate data.</p>
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--border)" }} role="list">
            {recent.games.map((game) => (
              <li key={game.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <Link
                    href={`/games/${game.slug}`}
                    className="font-medium hover:underline truncate block"
                    style={{ color: "var(--fg)" }}
                  >
                    {game.name}
                  </Link>
                  {game.developer && (
                    <p className="text-xs mt-0.5 truncate" style={{ color: "var(--muted)" }}>
                      {game.developer}
                    </p>
                  )}
                </div>
                <DisclosureBadge game={game} size="sm" />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
