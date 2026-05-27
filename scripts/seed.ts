import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../lib/db/schema";
import { makeSlug } from "../lib/scraper/parse";

const pool = new Pool({ connectionString: process.env.DATABASE_URL_DIRECT });
const db = drizzle(pool, { schema });

const SEED_GAMES: Array<{
  steamAppId: number;
  name: string;
  developer: string;
  publisher: string;
  releaseDate: string;
  hasDisclosure: boolean;
  preGenerated: boolean;
  liveGenerated: boolean;
  disclosureText?: string;
}> = [
  {
    steamAppId: 1086940,
    name: "Baldur's Gate 3",
    developer: "Larian Studios",
    publisher: "Larian Studios",
    releaseDate: "2023-08-03",
    hasDisclosure: false,
    preGenerated: false,
    liveGenerated: false,
  },
  {
    steamAppId: 1245620,
    name: "Elden Ring",
    developer: "FromSoftware Inc.",
    publisher: "Bandai Namco Entertainment",
    releaseDate: "2022-02-25",
    hasDisclosure: false,
    preGenerated: false,
    liveGenerated: false,
  },
  {
    steamAppId: 553850,
    name: "HELLDIVERS 2",
    developer: "Arrowhead Game Studios",
    publisher: "PlayStation PC LLC",
    releaseDate: "2024-02-08",
    hasDisclosure: false,
    preGenerated: false,
    liveGenerated: false,
  },
  {
    steamAppId: 2358720,
    name: "Palworld",
    developer: "Pocketpair, Inc.",
    publisher: "Pocketpair, Inc.",
    releaseDate: "2024-01-19",
    hasDisclosure: true,
    preGenerated: true,
    liveGenerated: false,
    disclosureText:
      "The developer has disclosed that this game uses AI Generated Content: Some game assets were generated with the assistance of AI tools including image generation models.",
  },
  {
    steamAppId: 1174180,
    name: "Red Dead Redemption 2",
    developer: "Rockstar Games",
    publisher: "Rockstar Games",
    releaseDate: "2019-12-05",
    hasDisclosure: false,
    preGenerated: false,
    liveGenerated: false,
  },
];

async function seed() {
  console.log("Seeding database...");

  for (const g of SEED_GAMES) {
    const slug = makeSlug(g.name, g.steamAppId);
    const [game] = await db
      .insert(schema.games)
      .values({
        steamAppId: g.steamAppId,
        name: g.name,
        slug,
        developer: g.developer,
        publisher: g.publisher,
        releaseDate: g.releaseDate,
        steamUrl: `https://store.steampowered.com/app/${g.steamAppId}`,
        headerImageUrl: `https://cdn.akamai.steamstatic.com/steam/apps/${g.steamAppId}/header.jpg`,
      })
      .onConflictDoUpdate({
        target: schema.games.steamAppId,
        set: {
          name: g.name,
          developer: g.developer,
          publisher: g.publisher,
          lastUpdatedAt: new Date(),
        },
      })
      .returning();

    await db.insert(schema.aiDisclosures).values({
      gameId: game.id,
      source: "steam",
      hasDisclosure: g.hasDisclosure,
      preGeneratedContent: g.preGenerated,
      liveGeneratedContent: g.liveGenerated,
      disclosureText: g.disclosureText ?? null,
      rawHtmlHash: `seed-${g.steamAppId}`,
    });

    console.log(`  ✓ ${g.name}`);
  }

  console.log("Done.");
  await pool.end();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
