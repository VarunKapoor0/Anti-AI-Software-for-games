import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { getDb } from "./client";
import { aiDisclosures, games, scrapeRuns } from "./schema";

export type GameWithDisclosure = {
  id: string;
  steamAppId: number;
  name: string;
  slug: string;
  developer: string | null;
  publisher: string | null;
  releaseDate: string | null;
  steamUrl: string;
  headerImageUrl: string | null;
  lastUpdatedAt: Date;
  hasDisclosure: boolean | null;
  preGeneratedContent: boolean | null;
  liveGeneratedContent: boolean | null;
  disclosureText: string | null;
  scrapedAt: Date | null;
};

export async function listGames(opts: {
  limit: number;
  offset: number;
  hasDisclosure?: boolean;
  hasPreGenerated?: boolean;
  hasLiveGenerated?: boolean;
  sort: "name" | "updated" | "release_date";
}): Promise<{ games: GameWithDisclosure[]; total: number }> {
  const db = getDb();

  const latestDisclosure = db
    .select({
      gameId: aiDisclosures.gameId,
      hasDisclosure: aiDisclosures.hasDisclosure,
      preGeneratedContent: aiDisclosures.preGeneratedContent,
      liveGeneratedContent: aiDisclosures.liveGeneratedContent,
      disclosureText: aiDisclosures.disclosureText,
      scrapedAt: aiDisclosures.scrapedAt,
      rn: sql<number>`row_number() over (partition by ${aiDisclosures.gameId} order by ${aiDisclosures.scrapedAt} desc)`.as("rn"),
    })
    .from(aiDisclosures)
    .as("latest_disclosure");

  let query = db
    .select({
      id: games.id,
      steamAppId: games.steamAppId,
      name: games.name,
      slug: games.slug,
      developer: games.developer,
      publisher: games.publisher,
      releaseDate: games.releaseDate,
      steamUrl: games.steamUrl,
      headerImageUrl: games.headerImageUrl,
      lastUpdatedAt: games.lastUpdatedAt,
      hasDisclosure: latestDisclosure.hasDisclosure,
      preGeneratedContent: latestDisclosure.preGeneratedContent,
      liveGeneratedContent: latestDisclosure.liveGeneratedContent,
      disclosureText: latestDisclosure.disclosureText,
      scrapedAt: latestDisclosure.scrapedAt,
    })
    .from(games)
    .leftJoin(
      latestDisclosure,
      and(eq(games.id, latestDisclosure.gameId), eq(latestDisclosure.rn, 1))
    )
    .$dynamic();

  const conditions = [];
  if (opts.hasDisclosure !== undefined) {
    conditions.push(eq(latestDisclosure.hasDisclosure, opts.hasDisclosure));
  }
  if (opts.hasPreGenerated !== undefined) {
    conditions.push(eq(latestDisclosure.preGeneratedContent, opts.hasPreGenerated));
  }
  if (opts.hasLiveGenerated !== undefined) {
    conditions.push(eq(latestDisclosure.liveGeneratedContent, opts.hasLiveGenerated));
  }
  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  if (opts.sort === "name") {
    query = query.orderBy(games.name);
  } else if (opts.sort === "updated") {
    query = query.orderBy(desc(games.lastUpdatedAt));
  } else if (opts.sort === "release_date") {
    query = query.orderBy(desc(games.releaseDate));
  }

  const [rows, countResult] = await Promise.all([
    query.limit(opts.limit).offset(opts.offset),
    db.select({ count: sql<number>`count(*)` }).from(games),
  ]);

  return { games: rows as GameWithDisclosure[], total: Number(countResult[0]?.count ?? 0) };
}

export async function getGameById(id: string): Promise<GameWithDisclosure | null> {
  const db = getDb();
  const rows = await db
    .select({
      id: games.id,
      steamAppId: games.steamAppId,
      name: games.name,
      slug: games.slug,
      developer: games.developer,
      publisher: games.publisher,
      releaseDate: games.releaseDate,
      steamUrl: games.steamUrl,
      headerImageUrl: games.headerImageUrl,
      lastUpdatedAt: games.lastUpdatedAt,
      hasDisclosure: aiDisclosures.hasDisclosure,
      preGeneratedContent: aiDisclosures.preGeneratedContent,
      liveGeneratedContent: aiDisclosures.liveGeneratedContent,
      disclosureText: aiDisclosures.disclosureText,
      scrapedAt: aiDisclosures.scrapedAt,
    })
    .from(games)
    .leftJoin(aiDisclosures, eq(games.id, aiDisclosures.gameId))
    .where(eq(games.id, id))
    .orderBy(desc(aiDisclosures.scrapedAt))
    .limit(1);
  return (rows[0] as GameWithDisclosure) ?? null;
}

export async function getGameBySlug(slug: string): Promise<GameWithDisclosure | null> {
  const db = getDb();
  const rows = await db
    .select({
      id: games.id,
      steamAppId: games.steamAppId,
      name: games.name,
      slug: games.slug,
      developer: games.developer,
      publisher: games.publisher,
      releaseDate: games.releaseDate,
      steamUrl: games.steamUrl,
      headerImageUrl: games.headerImageUrl,
      lastUpdatedAt: games.lastUpdatedAt,
      hasDisclosure: aiDisclosures.hasDisclosure,
      preGeneratedContent: aiDisclosures.preGeneratedContent,
      liveGeneratedContent: aiDisclosures.liveGeneratedContent,
      disclosureText: aiDisclosures.disclosureText,
      scrapedAt: aiDisclosures.scrapedAt,
    })
    .from(games)
    .leftJoin(aiDisclosures, eq(games.id, aiDisclosures.gameId))
    .where(eq(games.slug, slug))
    .orderBy(desc(aiDisclosures.scrapedAt))
    .limit(1);
  return (rows[0] as GameWithDisclosure) ?? null;
}

export async function getGameBySteamId(steamAppId: number): Promise<GameWithDisclosure | null> {
  const db = getDb();
  const rows = await db
    .select({
      id: games.id,
      steamAppId: games.steamAppId,
      name: games.name,
      slug: games.slug,
      developer: games.developer,
      publisher: games.publisher,
      releaseDate: games.releaseDate,
      steamUrl: games.steamUrl,
      headerImageUrl: games.headerImageUrl,
      lastUpdatedAt: games.lastUpdatedAt,
      hasDisclosure: aiDisclosures.hasDisclosure,
      preGeneratedContent: aiDisclosures.preGeneratedContent,
      liveGeneratedContent: aiDisclosures.liveGeneratedContent,
      disclosureText: aiDisclosures.disclosureText,
      scrapedAt: aiDisclosures.scrapedAt,
    })
    .from(games)
    .leftJoin(aiDisclosures, eq(games.id, aiDisclosures.gameId))
    .where(eq(games.steamAppId, steamAppId))
    .orderBy(desc(aiDisclosures.scrapedAt))
    .limit(1);
  return (rows[0] as GameWithDisclosure) ?? null;
}

export async function getDisclosureHistory(gameId: string) {
  const db = getDb();
  return db
    .select()
    .from(aiDisclosures)
    .where(eq(aiDisclosures.gameId, gameId))
    .orderBy(desc(aiDisclosures.scrapedAt));
}

export async function searchGames(q: string, limit = 20): Promise<GameWithDisclosure[]> {
  const db = getDb();
  const term = `%${q}%`;
  const rows = await db
    .select({
      id: games.id,
      steamAppId: games.steamAppId,
      name: games.name,
      slug: games.slug,
      developer: games.developer,
      publisher: games.publisher,
      releaseDate: games.releaseDate,
      steamUrl: games.steamUrl,
      headerImageUrl: games.headerImageUrl,
      lastUpdatedAt: games.lastUpdatedAt,
      hasDisclosure: aiDisclosures.hasDisclosure,
      preGeneratedContent: aiDisclosures.preGeneratedContent,
      liveGeneratedContent: aiDisclosures.liveGeneratedContent,
      disclosureText: aiDisclosures.disclosureText,
      scrapedAt: aiDisclosures.scrapedAt,
    })
    .from(games)
    .leftJoin(aiDisclosures, eq(games.id, aiDisclosures.gameId))
    .where(or(ilike(games.name, term), ilike(games.developer, term)))
    .orderBy(desc(aiDisclosures.scrapedAt))
    .limit(limit);
  return rows as GameWithDisclosure[];
}

export async function getStats() {
  const db = getDb();
  const [totals, lastRun] = await Promise.all([
    db
      .select({
        totalGames: sql<number>`count(distinct ${games.id})`,
        gamesWithDisclosure: sql<number>`count(distinct case when ${aiDisclosures.hasDisclosure} = true then ${games.id} end)`,
        gamesWithPreGenerated: sql<number>`count(distinct case when ${aiDisclosures.preGeneratedContent} = true then ${games.id} end)`,
        gamesWithLiveGenerated: sql<number>`count(distinct case when ${aiDisclosures.liveGeneratedContent} = true then ${games.id} end)`,
      })
      .from(games)
      .leftJoin(aiDisclosures, eq(games.id, aiDisclosures.gameId)),
    db
      .select({ completedAt: scrapeRuns.completedAt })
      .from(scrapeRuns)
      .where(eq(scrapeRuns.status, "completed"))
      .orderBy(desc(scrapeRuns.completedAt))
      .limit(1),
  ]);

  return {
    totalGames: Number(totals[0]?.totalGames ?? 0),
    gamesWithDisclosure: Number(totals[0]?.gamesWithDisclosure ?? 0),
    gamesWithPreGenerated: Number(totals[0]?.gamesWithPreGenerated ?? 0),
    gamesWithLiveGenerated: Number(totals[0]?.gamesWithLiveGenerated ?? 0),
    lastScrapeAt: lastRun[0]?.completedAt ?? null,
  };
}
