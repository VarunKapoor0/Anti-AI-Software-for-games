/**
 * Bulk scraper: hits real Steam store pages for a curated list of popular games.
 * Run with: DATABASE_URL=... npx tsx scripts/bulk-scrape.ts
 * Rate-limited to 1 req/sec. Skips games already in DB with unchanged hash.
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../lib/db/schema";
import { parseSteamPage, makeSlug } from "../lib/scraper/parse";
import { eq } from "drizzle-orm";

const DELAY_MS = 1100;

// Curated list: top games by player count, recent releases, and games
// known to have AI disclosures on Steam.
const STEAM_APP_IDS = [
  // Mega-popular titles
  730,      // CS2
  570,      // Dota 2
  440,      // Team Fortress 2
  578080,   // PUBG
  1172470,  // Apex Legends
  252490,   // Rust
  304930,   // Unturned
  271590,   // GTA V
  1086940,  // Baldur's Gate 3
  1245620,  // Elden Ring
  1091500,  // Cyberpunk 2077
  1203220,  // NARAKA: BLADEPOINT
  1174180,  // Red Dead Redemption 2
  2358720,  // Palworld
  553850,   // HELLDIVERS 2
  1599340,  // Lost Ark
  1811260,  // EA Sports FC 24
  1326470,  // Sons of the Forest
  1888930,  // The Finals
  2073850,  // Hogwarts Legacy
  1938090,  // Call of Duty HQ
  2519060,  // Marvel Rivals
  // AI-disclosure known games
  1850330,  // AI Dungeon (Steam version)
  2139460,  // Atomic Heart
  1888160,  // Assassin's Creed Mirage
  1971650,  // Starfield
  1517290,  // Wo Long: Fallen Dynasty
  1938010,  // Lies of P
  2138710,  // Hi-Fi Rush
  2246340,  // Sons of the Forest
  975370,   // Dwarf Fortress
  1245450,  // Raft
  413150,   // Stardew Valley
  381210,   // Dead by Daylight
  359550,   // Tom Clancy's Rainbow Six Siege
  377160,   // Fallout 4
  489830,   // The Elder Scrolls V: Skyrim Special Edition
  72850,    // The Elder Scrolls V: Skyrim
  292030,   // The Witcher 3
  1623730,  // Vampire Survivors
  1222670,  // The Sims 4
  1151640,  // Melvor Idle
  1517290,  // Wo Long
  1938010,  // Lies of P
  // Recent releases with AI categories
  2677660,  // Hellblade II
  2527500,  // Manor Lords
  1839660,  // Dave the Diver
  2050650,  // Baldur's Gate 3 (EA)
  1593500,  // God of War
  1551360,  // Forza Horizon 5
  1174940,  // Hades
  1282730,  // Hades II
  1644560,  // NieR:Automata
  524220,   // NieR:Automata (original)
  1343400,  // MONSTER HUNTER RISE
  1446780,  // Monster Hunter World
  582010,   // Monster Hunter: World
  814380,   // Sekiro
  1245620,  // Elden Ring
  2358720,  // Palworld
  1091500,  // Cyberpunk 2077
  1716740,  // Planet of Lana
  2379780,  // Chained Together
  2284190,  // Dredge
  2287260,  // Potionomics
  1622080,  // TOEM
  2246340,  // Sons of the Forest
  // Indie games likely to have AI
  2067340,  // The Entropy Centre
  1533420,  // Hardspace: Shipbreaker
  1061090,  // Kena: Bridge of Spirits
  1265280,  // Deathloop
  1368840,  // Twelve Minutes
  1585140,  // Disco Elysium
  632360,   // Risk of Rain 2
  1456200,  // Codename CURE (example AI game)
  2358720,  // Palworld
  1811630,  // SYNCED
  1282730,  // Hades II
  2379780,  // Chained Together
  2369390,  // Cyberpunk 2077: Phantom Liberty
  // Recent AI disclosure games
  2195250,  // Atomic Heart (DLC)
  1971650,  // Starfield
  2050650,  // BG3 early access
  1086940,  // BG3
  2677660,  // Senua's Saga: Hellblade II
  2527500,  // Manor Lords
  2527500,  // Manor Lords
  2514190,  // Gray Zone Warfare
  2667120,  // Content Warning
  2999680,  // Balatro
  2379780,  // Chained Together
  // Major franchises
  2369390,  // Phantom Liberty
  814380,   // Sekiro
  1382330,  // MONSTER HUNTER RISE: SUNBREAK
  1675200,  // Monster Hunter Stories 2
  1328670,  // Ghostwire: Tokyo
  1454490,  // Tiny Tina's Wonderlands
  1222140,  // OUTRIDERS
  1198810,  // Microsoft Flight Simulator
  1151640,  // Melvor Idle
  1172620,  // Sea of Thieves
  1468010,  // Back 4 Blood
  1222670,  // The Sims 4
  1184040,  // The Medium
  // AI-generated content flagged
  2073850,  // Hogwarts Legacy
  2103320,  // Company of Heroes 3
  2362540,  // Crime Boss: Rockay City
  1826580,  // Evil Dead: The Game
  1551360,  // Forza Horizon 5
  1716740,  // Planet of Lana
  1811260,  // EA Sports FC 24
  1716740,  // Planet of Lana
  1282730,  // Hades II Early Access
  // More popular titles
  1091500,  // Cyberpunk 2077
  1182480,  // The Forest (2)
  1067690,  // Resident Evil Village
  952060,   // Resident Evil 3
  883710,   // Resident Evil 2
  418370,   // Resident Evil 7
  377160,   // Fallout 4
  22370,    // Fallout: New Vegas
  1716740,  // Planet of Lana
  2358720,  // Palworld
  // Strategy
  289070,   // Sid Meier's Civilization VI
  8930,     // Sid Meier's Civilization V
  1158310,  // Crusader Kings III
  1145360,  // Hoi4
  394360,   // Hearts of Iron IV
  281990,   // Stellaris
  108600,   // Project Zomboid
  1517290,  // Wo Long
  // Sports/Racing
  271590,   // GTA V
  1551360,  // Forza Horizon 5
  1811260,  // EA Sports FC 24
  2767030,  // EA Sports FC 25
  // Horror
  311690,   // Layers of Fear (2016)
  1286830,  // Layers of Fear (2023)
  939510,   // Control
  632360,   // Risk of Rain 2
  1245450,  // Raft
  // Simulation
  920210,   // Farming Simulator 19
  1248130,  // Farming Simulator 22
  2848550,  // Farming Simulator 25
  255710,   // Cities: Skylines
  949230,   // Cities: Skylines II
  1422450,  // Planet Crafter
  // Survival
  1850550,  // Core Keeper
  108600,   // Project Zomboid
  252490,   // Rust
  242760,   // The Forest
  1326470,  // Sons of the Forest
  // Roguelike
  1245460,  // Hades (EA)
  1174940,  // Hades
  1282730,  // Hades II
  1623730,  // Vampire Survivors
  1781750,  // Brotato
  // Puzzle/Narrative
  1049410,  // Disco Elysium
  1585140,  // Disco Elysium Final Cut
  736260,   // Baba Is You
  1592510,  // Unpacking
  620,      // Portal 2
  400,      // Portal
  // Co-op
  945360,   // Among Us
  1966720,  // Lethal Company
  526870,   // Satisfactory
  // Action RPG
  238960,   // Path of Exile
  1272250,  // Path of Exile 2
  752590,   // A Short Hike
  // Fighting
  1551360,  // Forza Horizon 5
  // Anime/Japanese
  1245460,  // Hades EA
  // New releases 2024-2025
  2767030,  // EA Sports FC 25
  2835570,  // Call of Duty: Black Ops 6
  2677660,  // Senua's Saga: Hellblade II
  2527500,  // Manor Lords
  2999680,  // Balatro
  2667120,  // Content Warning
  2379780,  // Chained Together
  2514190,  // Gray Zone Warfare
  2863080,  // Stalker 2
  3146520,  // Delta Force
  2551830,  // Dragon's Dogma 2
  2050650,  // BG3 EA
];

// Deduplicate
const uniqueIds = [...new Set(STEAM_APP_IDS)];

async function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchPage(url: string): Promise<string> {
  const userAgent =
    process.env.SCRAPER_USER_AGENT ||
    "AIGamesBot/0.1 (+https://ai-in-games.vercel.app/about)";
  const res = await fetch(url, {
    headers: { "User-Agent": userAgent, Accept: "text/html" },
    signal: AbortSignal.timeout(15_000),
  });
  if (res.status === 429) {
    const wait = parseInt(res.headers.get("Retry-After") ?? "30", 10);
    console.log(`  Rate limited. Waiting ${wait}s...`);
    await delay(wait * 1000);
    return fetchPage(url);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function main() {
  const db = drizzle(new Pool({ connectionString: process.env.DATABASE_URL }), { schema });

  console.log(`Scraping ${uniqueIds.length} games...\n`);
  let scraped = 0, inserted = 0, skipped = 0, errors = 0;

  for (const appId of uniqueIds) {
    const url = `https://store.steampowered.com/app/${appId}`;
    try {
      await delay(DELAY_MS);
      const html = await fetchPage(url);
      const parsed = parseSteamPage(html);

      if (!parsed.name || parsed.name.length < 2) {
        console.log(`  [${appId}] skipped — no name parsed`);
        skipped++;
        continue;
      }

      const slug = makeSlug(parsed.name, appId);

      // Check existing hash
      const existing = await db
        .select({ rawHtmlHash: schema.aiDisclosures.rawHtmlHash })
        .from(schema.aiDisclosures)
        .innerJoin(schema.games, eq(schema.aiDisclosures.gameId, schema.games.id))
        .where(eq(schema.games.steamAppId, appId))
        .orderBy(schema.aiDisclosures.scrapedAt)
        .limit(1);

      const [game] = await db
        .insert(schema.games)
        .values({
          steamAppId: appId,
          name: parsed.name,
          slug,
          developer: parsed.developer,
          publisher: parsed.publisher,
          releaseDate: parsed.releaseDate,
          steamUrl: url,
          headerImageUrl: parsed.headerImageUrl,
        })
        .onConflictDoUpdate({
          target: schema.games.steamAppId,
          set: {
            name: parsed.name,
            developer: parsed.developer,
            publisher: parsed.publisher,
            releaseDate: parsed.releaseDate,
            headerImageUrl: parsed.headerImageUrl,
            lastUpdatedAt: new Date(),
          },
        })
        .returning();

      if (existing[0]?.rawHtmlHash === parsed.rawHtmlHash) {
        console.log(`  [${appId}] ${parsed.name} — unchanged`);
        skipped++;
      } else {
        await db.insert(schema.aiDisclosures).values({
          gameId: game.id,
          source: "steam",
          hasDisclosure: parsed.hasDisclosure,
          preGeneratedContent: parsed.preGeneratedContent,
          liveGeneratedContent: parsed.liveGeneratedContent,
          disclosureText: parsed.disclosureText,
          rawHtmlHash: parsed.rawHtmlHash,
        });
        const tag = parsed.hasDisclosure ? "⚠ AI DISCLOSED" : "ok";
        console.log(`  [${appId}] ${parsed.name} — ${tag}`);
        inserted++;
      }
      scraped++;
    } catch (err) {
      console.error(`  [${appId}] ERROR: ${err instanceof Error ? err.message : err}`);
      errors++;
    }
  }

  console.log(`\nDone. ${scraped} scraped, ${inserted} new/updated, ${skipped} unchanged, ${errors} errors.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
