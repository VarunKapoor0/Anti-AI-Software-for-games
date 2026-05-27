import type { Metadata } from "next";
import Link from "next/link";
import { SearchBar } from "@/components/SearchBar";
import { DisclosureBadge } from "@/components/DisclosureBadge";
import { searchGames } from "@/lib/db/queries";

type Props = { searchParams: Promise<{ q?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q: qRaw } = await searchParams;
  const q = qRaw?.trim() ?? "";
  return {
    title: q ? `Search: "${q}"` : "Search Games",
    description: q
      ? `Search results for "${q}" — AI content disclosures in video games.`
      : "Search for video games and their AI content disclosures.",
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const { q: qRaw } = await searchParams;
  const q = qRaw?.trim() ?? "";
  const results = q ? await searchGames(q).catch(() => []) : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Search</h1>
      <SearchBar defaultValue={q} />

      {q && (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          {results.length} result{results.length !== 1 ? "s" : ""} for &ldquo;{q}&rdquo;
        </p>
      )}

      {results.length > 0 && (
        <ul className="divide-y" style={{ borderColor: "var(--border)" }} role="list">
          {results.map((game) => (
            <li key={game.id} className="py-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <Link
                  href={`/games/${game.slug}`}
                  className="font-medium hover:underline truncate block"
                  style={{ color: "var(--fg)" }}
                >
                  {game.name}
                </Link>
                <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                  {[game.developer, game.publisher].filter(Boolean).join(" · ")}
                </p>
              </div>
              <DisclosureBadge game={game} size="sm" />
            </li>
          ))}
        </ul>
      )}

      {q && results.length === 0 && (
        <p style={{ color: "var(--muted)" }}>
          No games found matching &ldquo;{q}&rdquo;.{" "}
          <Link href="/games" className="hover:underline" style={{ color: "var(--accent)" }}>
            Browse all games
          </Link>
        </p>
      )}
    </div>
  );
}
