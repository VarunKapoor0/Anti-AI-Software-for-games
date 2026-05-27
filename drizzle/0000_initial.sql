CREATE TABLE IF NOT EXISTS "games" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "steam_app_id" integer NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "developer" text,
  "publisher" text,
  "release_date" text,
  "steam_url" text NOT NULL,
  "header_image_url" text,
  "first_seen_at" timestamp DEFAULT now() NOT NULL,
  "last_updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "games_steam_app_id_idx" ON "games" ("steam_app_id");
CREATE UNIQUE INDEX IF NOT EXISTS "games_slug_idx" ON "games" ("slug");
CREATE INDEX IF NOT EXISTS "games_name_idx" ON "games" ("name");

-- Full-text search vector column
ALTER TABLE "games" ADD COLUMN IF NOT EXISTS "search_vector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(developer, '') || ' ' || coalesce(publisher, ''))
  ) STORED;

CREATE INDEX IF NOT EXISTS "games_search_vector_idx" ON "games" USING GIN ("search_vector");

CREATE TABLE IF NOT EXISTS "ai_disclosures" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "game_id" uuid NOT NULL REFERENCES "games"("id"),
  "source" text NOT NULL DEFAULT 'steam',
  "has_disclosure" boolean NOT NULL DEFAULT false,
  "pre_generated_content" boolean NOT NULL DEFAULT false,
  "live_generated_content" boolean NOT NULL DEFAULT false,
  "disclosure_text" text,
  "scraped_at" timestamp DEFAULT now() NOT NULL,
  "raw_html_hash" text
);

CREATE INDEX IF NOT EXISTS "ai_disclosures_game_id_scraped_at_idx" ON "ai_disclosures" ("game_id", "scraped_at");
CREATE INDEX IF NOT EXISTS "ai_disclosures_scraped_at_idx" ON "ai_disclosures" ("scraped_at");

CREATE TABLE IF NOT EXISTS "scrape_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "source" text NOT NULL,
  "started_at" timestamp DEFAULT now() NOT NULL,
  "completed_at" timestamp,
  "games_scraped" integer NOT NULL DEFAULT 0,
  "games_updated" integer NOT NULL DEFAULT 0,
  "errors" integer NOT NULL DEFAULT 0,
  "status" text NOT NULL DEFAULT 'running',
  "last_steam_app_id" integer
);

CREATE TABLE IF NOT EXISTS "scrape_errors" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "scrape_run_id" uuid NOT NULL REFERENCES "scrape_runs"("id"),
  "game_id" uuid REFERENCES "games"("id"),
  "url" text NOT NULL,
  "error_message" text NOT NULL,
  "occurred_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "game_search_index" (
  "game_id" uuid PRIMARY KEY REFERENCES "games"("id"),
  "search_vector" text NOT NULL
);
