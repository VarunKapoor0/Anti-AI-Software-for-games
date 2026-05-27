import type { Metadata } from "next";
import Link from "next/link";
import { listGames } from "@/lib/db/queries";
import { DisclosureBadge } from "@/components/DisclosureBadge";

export const metadata: Metadata = {
  title: "Browse Games",
  description: "Browse all video games currently tracked for AI content disclosures.",
};

export const revalidate = 300;

type SearchParams = {
  page?: string;
  sort?: string;
  has_disclosure?: string;
  has_pre_generated?: string;
  has_live_generated?: string;
};

export default async function BrowsePage({ searchParams }: { searchParams: SearchParams }) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const limit = 50;
  const offset = (page - 1) * limit;
  const sort = (searchParams.sort ?? "updated") as "name" | "updated" | "release_date";

  const opts = {
    limit,
    offset,
    sort,
    ...(searchParams.has_disclosure !== undefined
      ? { hasDisclosure: searchParams.has_disclosure === "true" }
      : {}),
    ...(searchParams.has_pre_generated !== undefined
      ? { hasPreGenerated: searchParams.has_pre_generated === "true" }
      : {}),
    ...(searchParams.has_live_generated !== undefined
      ? { hasLiveGenerated: searchParams.has_live_generated === "true" }
      : {}),
  };

  const { games, total } = await listGames(opts).catch(() => ({ games: [], total: 0 }));
  const totalPages = Math.ceil(total / limit);

  function buildUrl(overrides: Record<string, string>) {
    const params = new URLSearchParams({
      ...(sort !== "updated" ? { sort } : {}),
      ...(searchParams.has_disclosure ? { has_disclosure: searchParams.has_disclosure } : {}),
      ...(searchParams.has_pre_generated
        ? { has_pre_generated: searchParams.has_pre_generated }
        : {}),
      ...(searchParams.has_live_generated
        ? { has_live_generated: searchParams.has_live_generated }
        : {}),
      ...overrides,
    });
    return `/games?${params.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h1 className="text-2xl font-bold">Browse Games</h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          {total.toLocaleString()} games currently tracked
        </p>
      </div>

      <div
        className="flex flex-wrap gap-3 p-4 rounded-lg border"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}
        role="group"
        aria-label="Filters"
      >
        <FilterLink
          label="All games"
          href="/games"
          active={!searchParams.has_disclosure && !searchParams.has_pre_generated && !searchParams.has_live_generated}
        />
        <FilterLink
          label="Has any disclosure"
          href={buildUrl({ has_disclosure: "true", page: "1" })}
          active={searchParams.has_disclosure === "true"}
        />
        <FilterLink
          label="Pre-generated AI"
          href={buildUrl({ has_pre_generated: "true", page: "1" })}
          active={searchParams.has_pre_generated === "true"}
        />
        <FilterLink
          label="Live-generated AI"
          href={buildUrl({ has_live_generated: "true", page: "1" })}
          active={searchParams.has_live_generated === "true"}
        />
        <span className="ml-auto flex items-center gap-2 text-sm" style={{ color: "var(--muted)" }}>
          Sort:
          <SortLink label="Name" value="name" current={sort} buildUrl={buildUrl} />
          <SortLink label="Updated" value="updated" current={sort} buildUrl={buildUrl} />
          <SortLink label="Release" value="release_date" current={sort} buildUrl={buildUrl} />
        </span>
      </div>

      {games.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>No games match the selected filters.</p>
      ) : (
        <div
          className="rounded-lg border overflow-hidden"
          style={{ borderColor: "var(--border)" }}
        >
          <table className="w-full text-sm" aria-label="Games list">
            <thead>
              <tr
                className="border-b text-left text-xs uppercase tracking-wider"
                style={{ borderColor: "var(--border)", color: "var(--muted)", backgroundColor: "var(--card)" }}
              >
                <th className="px-4 py-3 font-medium">Game</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Developer</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Release</th>
                <th className="px-4 py-3 font-medium">Disclosure</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
              {games.map((game) => (
                <tr
                  key={game.id}
                  className="hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: "var(--bg)" }}
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/games/${game.slug}`}
                      className="font-medium hover:underline"
                      style={{ color: "var(--fg)" }}
                    >
                      {game.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell" style={{ color: "var(--muted)" }}>
                    {game.developer ?? "—"}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell" style={{ color: "var(--muted)" }}>
                    {game.releaseDate ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <DisclosureBadge game={game} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <nav className="flex gap-2 items-center justify-center" aria-label="Pagination">
          {page > 1 && (
            <Link
              href={buildUrl({ page: String(page - 1) })}
              className="px-3 py-1 rounded border text-sm"
              style={{ borderColor: "var(--border)" }}
            >
              Previous
            </Link>
          )}
          <span className="text-sm" style={{ color: "var(--muted)" }}>
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={buildUrl({ page: String(page + 1) })}
              className="px-3 py-1 rounded border text-sm"
              style={{ borderColor: "var(--border)" }}
            >
              Next
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}

function FilterLink({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className="px-3 py-1 rounded text-sm font-medium"
      style={{
        backgroundColor: active ? "var(--accent)" : "transparent",
        color: active ? "#fff" : "var(--muted)",
        border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
      }}
      aria-current={active ? "page" : undefined}
    >
      {label}
    </Link>
  );
}

function SortLink({
  label,
  value,
  current,
  buildUrl,
}: {
  label: string;
  value: string;
  current: string;
  buildUrl: (o: Record<string, string>) => string;
}) {
  const active = current === value;
  return (
    <Link
      href={buildUrl({ sort: value, page: "1" })}
      className="hover:underline"
      style={{ color: active ? "var(--fg)" : "var(--muted)", fontWeight: active ? 600 : 400 }}
    >
      {label}
    </Link>
  );
}
