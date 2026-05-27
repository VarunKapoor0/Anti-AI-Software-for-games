import { eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { aiDisclosures, games, scrapeErrors, scrapeRuns } from "../db/schema";
import { fetchPage, fetchPageFixture, fetchSteamAppList } from "./fetch";
import { makeSlug, parseSteamPage } from "./parse";

const BATCH_SIZE = 50;

type ScrapeMode = "full" | "incremental";

export async function runScrape(mode: ScrapeMode, fixtureMode = false): Promise<void> {
  const db = getDb();

  const [run] = await db
    .insert(scrapeRuns)
    .values({ source: "steam", status: "running" })
    .returning();

  let gamesScraped = 0;
  let gamesUpdated = 0;
  let errors = 0;

  try {
    const appIds = await getTargetAppIds(mode, run.id);

    for (const { appid, name } of appIds.slice(0, BATCH_SIZE)) {
      try {
        const updated = await scrapeGame(appid, name, fixtureMode, run.id);
        gamesScraped++;
        if (updated) gamesUpdated++;
      } catch (err) {
        errors++;
        await db.insert(scrapeErrors).values({
          scrapeRunId: run.id,
          url: `https://store.steampowered.com/app/${appid}`,
          errorMessage: err instanceof Error ? err.message : String(err),
        });
      }
    }

    await db
      .update(scrapeRuns)
      .set({
        status: "completed",
        completedAt: new Date(),
        gamesScraped,
        gamesUpdated,
        errors,
      })
      .where(eq(scrapeRuns.id, run.id));
  } catch (err) {
    await db
      .update(scrapeRuns)
      .set({ status: "failed", completedAt: new Date(), errors: errors + 1 })
      .where(eq(scrapeRuns.id, run.id));
    throw err;
  }
}

async function getTargetAppIds(
  mode: ScrapeMode,
  _runId: string
): Promise<{ appid: number; name: string }[]> {
  if (mode === "incremental") {
    // Re-scrape games we've already seen (oldest first)
    const db = getDb();
    const existing = await db
      .select({ steamAppId: games.steamAppId, name: games.name })
      .from(games)
      .orderBy(games.lastUpdatedAt)
      .limit(BATCH_SIZE);
    return existing.map((g) => ({ appid: g.steamAppId, name: g.name }));
  }

  // Full: fetch the Steam app list and diff against DB
  const allApps = await fetchSteamAppList();
  const db = getDb();
  const existingIds = new Set(
    (await db.select({ steamAppId: games.steamAppId }).from(games)).map(
      (g) => g.steamAppId
    )
  );
  return allApps
    .filter((a) => !existingIds.has(a.appid) && a.name)
    .slice(0, BATCH_SIZE);
}

async function scrapeGame(
  steamAppId: number,
  name: string,
  fixtureMode: boolean,
  runId: string
): Promise<boolean> {
  const url = `https://store.steampowered.com/app/${steamAppId}`;

  let html: string;
  if (fixtureMode) {
    const fixture = await fetchPageFixture(steamAppId);
    if (!fixture) return false;
    html = fixture;
  } else {
    html = await fetchPage(url);
  }

  const parsed = parseSteamPage(html);
  const db = getDb();

  // Check for existing hash
  const existing = await db
    .select({ rawHtmlHash: aiDisclosures.rawHtmlHash })
    .from(aiDisclosures)
    .innerJoin(games, eq(aiDisclosures.gameId, games.id))
    .where(eq(games.steamAppId, steamAppId))
    .orderBy(aiDisclosures.scrapedAt)
    .limit(1);

  const slug = makeSlug(parsed.name || name, steamAppId);

  const [game] = await db
    .insert(games)
    .values({
      steamAppId,
      name: parsed.name || name,
      slug,
      developer: parsed.developer,
      publisher: parsed.publisher,
      releaseDate: parsed.releaseDate,
      steamUrl: url,
      headerImageUrl: parsed.headerImageUrl,
    })
    .onConflictDoUpdate({
      target: games.steamAppId,
      set: {
        name: parsed.name || name,
        developer: parsed.developer,
        publisher: parsed.publisher,
        releaseDate: parsed.releaseDate,
        headerImageUrl: parsed.headerImageUrl,
        lastUpdatedAt: new Date(),
      },
    })
    .returning();

  // Skip disclosure insert if hash unchanged
  if (existing[0]?.rawHtmlHash === parsed.rawHtmlHash) return false;

  await db.insert(aiDisclosures).values({
    gameId: game.id,
    source: "steam",
    hasDisclosure: parsed.hasDisclosure,
    preGeneratedContent: parsed.preGeneratedContent,
    liveGeneratedContent: parsed.liveGeneratedContent,
    disclosureText: parsed.disclosureText,
    rawHtmlHash: parsed.rawHtmlHash,
  });

  return true;
}
