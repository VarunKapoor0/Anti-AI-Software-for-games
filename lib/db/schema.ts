import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  uuid,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const games = pgTable(
  "games",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    steamAppId: integer("steam_app_id").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    developer: text("developer"),
    publisher: text("publisher"),
    releaseDate: text("release_date"),
    steamUrl: text("steam_url").notNull(),
    headerImageUrl: text("header_image_url"),
    firstSeenAt: timestamp("first_seen_at").notNull().defaultNow(),
    lastUpdatedAt: timestamp("last_updated_at").notNull().defaultNow(),
  },
  (table) => ({
    steamAppIdIdx: uniqueIndex("games_steam_app_id_idx").on(table.steamAppId),
    slugIdx: uniqueIndex("games_slug_idx").on(table.slug),
    nameIdx: index("games_name_idx").on(table.name),
  })
);

export const aiDisclosures = pgTable(
  "ai_disclosures",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id),
    source: text("source").notNull().default("steam"),
    hasDisclosure: boolean("has_disclosure").notNull().default(false),
    preGeneratedContent: boolean("pre_generated_content").notNull().default(false),
    liveGeneratedContent: boolean("live_generated_content").notNull().default(false),
    disclosureText: text("disclosure_text"),
    scrapedAt: timestamp("scraped_at").notNull().defaultNow(),
    rawHtmlHash: text("raw_html_hash"),
  },
  (table) => ({
    gameIdScrapedAtIdx: index("ai_disclosures_game_id_scraped_at_idx").on(
      table.gameId,
      table.scrapedAt
    ),
    scrapedAtIdx: index("ai_disclosures_scraped_at_idx").on(table.scrapedAt),
  })
);

export const scrapeRuns = pgTable("scrape_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  source: text("source").notNull(),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  gamesScraped: integer("games_scraped").notNull().default(0),
  gamesUpdated: integer("games_updated").notNull().default(0),
  errors: integer("errors").notNull().default(0),
  status: text("status", { enum: ["running", "completed", "failed"] })
    .notNull()
    .default("running"),
  lastSteamAppId: integer("last_steam_app_id"),
});

export const scrapeErrors = pgTable("scrape_errors", {
  id: uuid("id").primaryKey().defaultRandom(),
  scrapeRunId: uuid("scrape_run_id")
    .notNull()
    .references(() => scrapeRuns.id),
  gameId: uuid("game_id").references(() => games.id),
  url: text("url").notNull(),
  errorMessage: text("error_message").notNull(),
  occurredAt: timestamp("occurred_at").notNull().defaultNow(),
});

// Full-text search: maintained via application logic on upsert
// Postgres tsvector GIN index on games name + developer
export const gameSearchIndex = pgTable(
  "game_search_index",
  {
    gameId: uuid("game_id")
      .primaryKey()
      .references(() => games.id),
    searchVector: text("search_vector").notNull(),
  }
);

export type Game = typeof games.$inferSelect;
export type NewGame = typeof games.$inferInsert;
export type AiDisclosure = typeof aiDisclosures.$inferSelect;
export type NewAiDisclosure = typeof aiDisclosures.$inferInsert;
export type ScrapeRun = typeof scrapeRuns.$inferSelect;
export type NewScrapeRun = typeof scrapeRuns.$inferInsert;
export type ScrapeError = typeof scrapeErrors.$inferSelect;
export type NewScrapeError = typeof scrapeErrors.$inferInsert;
