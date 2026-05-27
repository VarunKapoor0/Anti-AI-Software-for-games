# CLAUDE.md

## Project: AI Content Transparency for Games (working name: TBD)

This document is the canonical specification for the project. Anything not in this document is out of scope for the initial build. Anything in this document is in scope unless explicitly marked future-phase.

## Purpose

A web service that aggregates and surfaces information about AI-generated content in video games. Users come here to find out which games disclose AI use, which games have been independently flagged, and the evidence behind each claim. The product respects user intelligence by surfacing evidence, not verdicts. It never claims certainty it doesn't have.

The principle: users deserve all available, honestly-framed evidence about AI use in games they're considering or own. Where evidence is strong, say so. Where evidence is absent, say so. Never imply detection is complete.

## Initial scope (v1)

Build a public website backed by a database of game-level AI disclosure and evidence data. The v1 data source is the Steam disclosure data, scraped from public Steam pages. Future phases will add community reports, desktop-scanner findings, and a browser extension.

In scope for v1:
- Backend API (Cloudflare Workers)
- Database (Cloudflare D1 for relational data, KV for cache)
- Public website (Next.js or SvelteKit, deployed on Cloudflare Pages)
- Steam disclosure scraper (scheduled Worker)
- Search, filter, individual game pages
- Honest framing of all data with explicit uncertainty

Out of scope for v1 (deliberately, do not build these now):
- Desktop scanner application
- Browser extension
- Local file analysis
- ML classifiers
- User accounts and authentication
- Community-submitted reports
- Developer response mechanisms
- Multi-store support (only Steam in v1)

## Tech stack

- **Backend:** TypeScript, Cloudflare Workers, Hono framework for routing
- **Database:** Cloudflare D1 (SQLite-compatible). Use Drizzle ORM for schema and queries.
- **Cache:** Cloudflare KV for scraped page caching and rate-limit state
- **Frontend:** Next.js 14+ with App Router, TypeScript, Tailwind CSS, deployed on Cloudflare Pages
- **Scraping:** Cheerio for HTML parsing inside Workers
- **Package manager:** pnpm
- **Monorepo:** pnpm workspaces, structure below

Rationale: the user already has Cloudflare Workers + Redis experience from a separate project; this reuses that knowledge. Cloudflare D1 replaces Redis for relational data because the access patterns here are clearly relational (games, disclosures, scrape history). KV is added back for caching and rate-limit state where Redis-like access works well.

## Repository structure

```
/
├── CLAUDE.md                    (this file)
├── README.md                    (user-facing readme)
├── pnpm-workspace.yaml
├── package.json
├── .gitignore
├── .env.example
├── apps/
│   ├── api/                     (Cloudflare Worker, backend API)
│   │   ├── src/
│   │   │   ├── index.ts         (Hono app entry)
│   │   │   ├── routes/
│   │   │   │   ├── games.ts
│   │   │   │   ├── search.ts
│   │   │   │   └── stats.ts
│   │   │   ├── db/
│   │   │   │   ├── schema.ts    (Drizzle schema)
│   │   │   │   └── client.ts
│   │   │   └── lib/
│   │   ├── wrangler.toml
│   │   ├── tsconfig.json
│   │   └── package.json
│   ├── scraper/                 (Cloudflare Worker, scheduled)
│   │   ├── src/
│   │   │   ├── index.ts         (cron entry)
│   │   │   ├── steam.ts         (Steam-specific parsing)
│   │   │   └── lib/
│   │   ├── wrangler.toml
│   │   └── package.json
│   └── web/                     (Next.js frontend)
│       ├── app/
│       │   ├── page.tsx                  (home)
│       │   ├── games/
│       │   │   ├── page.tsx              (browse)
│       │   │   └── [id]/page.tsx         (individual game)
│       │   ├── search/page.tsx
│       │   ├── about/page.tsx            (methodology, honesty section)
│       │   └── layout.tsx
│       ├── components/
│       ├── lib/
│       ├── public/
│       └── package.json
├── packages/
│   ├── db-schema/               (shared Drizzle schema)
│   │   ├── src/schema.ts
│   │   └── package.json
│   └── shared-types/            (TS types shared across apps)
│       └── package.json
└── docs/
    ├── architecture.md
    ├── scraper-ethics.md
    └── data-model.md
```

## Database schema (v1)

Use Drizzle ORM. SQLite via D1.

```typescript
// games table: one row per Steam game we know about
games: {
  id: text (primary key, uuid)
  steam_app_id: integer (unique, indexed)
  name: text
  developer: text (nullable)
  publisher: text (nullable)
  release_date: text (nullable, ISO date)
  steam_url: text
  header_image_url: text (nullable)
  first_seen_at: timestamp
  last_updated_at: timestamp
}

// ai_disclosures table: one row per disclosure snapshot per game
ai_disclosures: {
  id: text (primary key, uuid)
  game_id: text (foreign key to games.id, indexed)
  source: text ("steam" for v1; future: "epic", "gog", etc.)
  has_disclosure: boolean
  pre_generated_content: boolean (Steam category)
  live_generated_content: boolean (Steam category)
  disclosure_text: text (raw scraped text, nullable)
  scraped_at: timestamp (indexed)
  raw_html_hash: text (for change detection)
}

// scrape_runs table: track scraping operations
scrape_runs: {
  id: text (primary key, uuid)
  source: text
  started_at: timestamp
  completed_at: timestamp (nullable)
  games_scraped: integer
  games_updated: integer
  errors: integer
  status: text ("running" | "completed" | "failed")
}

// scrape_errors table: detailed error log
scrape_errors: {
  id: text (primary key, uuid)
  scrape_run_id: text (foreign key)
  game_id: text (nullable, foreign key)
  url: text
  error_message: text
  occurred_at: timestamp
}
```

Indexes:
- `games(steam_app_id)` unique
- `games(name)` for search (use SQLite FTS5 virtual table for full-text search; create alongside)
- `ai_disclosures(game_id, scraped_at)` for fetching latest disclosure per game
- `ai_disclosures(scraped_at)` for "recently updated" queries

Create an FTS5 virtual table `games_fts` shadowing the games table for search. Maintain via triggers.

## API endpoints (v1)

All endpoints return JSON. CORS enabled for the frontend domain.

```
GET  /api/games                          List games, paginated, filterable
     ?limit=50 (max 100)
     &offset=0
     &has_disclosure=true|false (optional)
     &has_pre_generated=true|false (optional)
     &has_live_generated=true|false (optional)
     &sort=name|updated|release_date

GET  /api/games/:id                      Individual game with latest disclosure
GET  /api/games/by-steam-id/:steamAppId  Lookup by Steam app ID

GET  /api/search?q=...                   Full-text search across game names

GET  /api/stats                          Aggregate counts:
                                         - total games tracked
                                         - games with any disclosure
                                         - games with pre-generated content
                                         - games with live-generated content
                                         - last scrape run timestamp

GET  /api/health                         Health check
```

No write endpoints in v1. Scraper writes directly to D1 from its own Worker.

Rate limit all public endpoints: 60 requests per minute per IP, using KV for counter state. Return standard rate-limit headers.

## Scraper specification

The scraper is a separately deployed Cloudflare Worker triggered by a cron schedule.

### Schedule

Run a full pass once per 24 hours. Run an incremental "recently updated" pass every 4 hours. Use the Workers Cron Triggers feature.

### What it scrapes

1. **Discovery**: Steam's app list endpoint at `https://api.steampowered.com/ISteamApps/GetAppList/v2/`. This is a public API. Diff against existing games in D1; insert new ones with minimal data.

2. **Per-game enrichment**: For each game, fetch its Steam store page. Parse:
   - Game name, developer, publisher, release date, header image
   - The AI disclosure section: located in the "About This Game" area, in a div with class containing `ai_generated` or similar (Valve's current markup uses `<div id="game_area_content_descriptors">` and AI disclosure appears in `<p>` tags within). **Verify current markup before implementing; this changes.** Document the exact selector used and version-date it.
   - The two Steam-defined AI categories: pre-generated and live-generated. Parse the disclosure text for both.

3. **Change detection**: Hash the relevant portion of HTML. If the hash matches the most recent stored hash for that game, skip the insert. If it differs, insert a new `ai_disclosures` row.

### Politeness rules (non-negotiable)

- Respect `robots.txt`. Fetch and parse it; do not request disallowed paths.
- Set a clear, identifying `User-Agent` header that includes a contact email or website.
- Rate-limit outgoing requests: maximum 1 request per second to any single domain.
- Honor `Retry-After` headers and HTTP 429 responses with exponential backoff.
- Use HTTP caching: send `If-Modified-Since` headers when possible.
- Log all errors to `scrape_errors` table for review.

### Initial seed

Don't try to scrape all 100,000+ Steam games on day one. Start with:
1. Games that have any AI tag/disclosure on Steam (queryable via SteamDB or a focused search)
2. Top 1000 games by recent reviews
3. Expand from there in subsequent runs

Document seed strategy in `docs/scraper-ethics.md`.

## Frontend specification

Next.js App Router. Server-side rendering for game pages (SEO). Tailwind for styling. Keep design clean and information-dense, not flashy.

### Pages

**Home (`/`)**
- One-line statement of what the site is
- Search bar (prominent)
- Stats summary (e.g. "Tracking 12,847 games · 1,203 disclose AI content")
- Recently flagged or updated games (list)
- Link to methodology/about page

**Browse (`/games`)**
- Sortable, filterable table or grid of games
- Filters: has any disclosure, has pre-generated, has live-generated, no disclosure
- Sort: name, recently updated, release date
- Pagination

**Game page (`/games/[id]`)**
- Game name, header image, developer, publisher, release date
- Steam link
- **Disclosure section** with these subsections, in this order:
  1. **What the developer disclosed** (the Steam-disclosed text, both categories)
  2. **When this was last verified** (scraped_at timestamp)
  3. **What we couldn't determine** (an explicit, prominent note explaining that the absence of disclosure doesn't prove absence of AI use, and that v1 of the tool only surfaces what developers self-reported on Steam)
  4. **History** (timeline of disclosure changes if any)
- Link to view raw scraped data for transparency

**Search (`/search?q=...`)**
- Results list with game name, developer, disclosure status

**About / methodology (`/about`)** — **THIS PAGE IS CRITICAL**
- What the site does and doesn't do
- Data sources (currently only Steam self-disclosure)
- Explicit limitations: "We only know what developers disclose. A game without a disclosure may still use AI. Future versions will add independent verification."
- How disclosures are scraped, how often
- How to report errors or request corrections
- Future plans (community reports, scanner findings) clearly marked as not yet implemented

### Design and tone

- Plain, sober, factual. This is a transparency tool, not entertainment.
- No verdicts. No "AI-FREE ✓" badges. Use neutral language: "Disclosed: pre-generated AI content" rather than "USES AI".
- Every claim links to its evidence (the scraped Steam page, the timestamp).
- Dark mode by default, light mode toggle.
- No tracking, no analytics that send to third parties. If you need analytics, use Cloudflare's privacy-preserving analytics.
- No ads.

### Accessibility

WCAG 2.1 AA minimum. Semantic HTML, proper heading hierarchy, alt text on images, keyboard navigation, sufficient color contrast in both themes. Tested with at least one screen reader.

## Honesty requirements (architectural, not optional)

These are product requirements that affect implementation:

1. **Never display a "verified clean" or "AI-free" indicator.** v1 has no way to verify this. The site can only display what was disclosed. Absence of disclosure is shown as absence of disclosure, not as a clean bill of health.

2. **Always show the source and timestamp of every claim.** Every disclosure card includes "Scraped from Steam on [date]" with a link to the Steam page.

3. **The about/methodology page must be reachable from every page.** Put it in the footer.

4. **The home page must include an honest one-liner about what the site doesn't yet do.** Example: "We currently aggregate developer self-disclosures from Steam. We do not yet independently verify them."

5. **No marketing language that implies completeness.** Don't say "complete database" or "all AI games." Say "games currently tracked."

## Development workflow

1. `pnpm install` at root installs all workspaces
2. Set up local D1: `wrangler d1 create ai-games-dev` and update `wrangler.toml`
3. Run migrations: `pnpm db:migrate`
4. Seed with test data: `pnpm db:seed`
5. Run API locally: `pnpm --filter api dev`
6. Run frontend locally: `pnpm --filter web dev`
7. Run scraper locally with manual trigger: `pnpm --filter scraper dev`

Provide a `Makefile` or `package.json` scripts at root for common operations:
- `pnpm dev` runs api and web concurrently
- `pnpm build` builds all
- `pnpm typecheck` typechecks all
- `pnpm lint` lints all
- `pnpm test` runs tests

## Testing requirements

- Unit tests for scraper parsing logic. Mock Steam HTML inputs (save real samples in `apps/scraper/test/fixtures/`).
- Integration tests for API endpoints against a test D1 database.
- Frontend: at minimum, snapshot tests for the game page and a smoke test that the about page loads with the required honesty disclaimers.
- A test that asserts the about page contains the explicit limitations text. This is a regression guard against accidentally removing the honesty section.

Use Vitest for backend and frontend tests.

## Local development against fixtures

Because scraping real Steam pages during development is impolite and slow, save 20-50 real Steam page HTML samples in `apps/scraper/test/fixtures/` and provide a "fixture mode" flag for the scraper that reads from disk instead of making HTTP requests. Use this for all local dev and CI.

## What success looks like for v1

When the user runs this on their own system locally:
1. The scraper has populated D1 with at least a few hundred games and their disclosures (using fixtures + a small real scrape with rate limiting)
2. The frontend renders at `localhost:3000` with a working home page, browse page, search, and individual game pages
3. The API responds to all documented endpoints
4. The about page is present with required honesty disclaimers
5. Tests pass: `pnpm test` is green

That's v1. Don't build past this for now.

---

## Supplement: Deployment on Vercel + SEO/AEO

This section supersedes the Cloudflare-specific guidance in the original tech stack section where they conflict. The schema, scraper logic, API contract, frontend pages, and honesty requirements are unchanged. Only the infrastructure layer changes.

### Why this section exists

The original spec assumed Cloudflare Workers + D1 + Pages. The actual deployment target is Vercel. Additionally, Google's search behavior has shifted significantly (as of mid-2026) toward AI Mode and AI Overviews, where roughly half of all queries are answered without a click-through. This means SEO alone is insufficient and the site must also be optimized for AI citation (AEO / GEO).

### Revised infrastructure

| Concern | Original (Cloudflare) | Revised (Vercel) |
|---------|----------------------|------------------|
| Frontend | Cloudflare Pages | Vercel (native Next.js) |
| API | Cloudflare Workers | Next.js Route Handlers in the same app (`app/api/**`) |
| Database | Cloudflare D1 (SQLite) | Postgres via Supabase, Neon, or Vercel Postgres |
| Scheduled scraper | Cloudflare Workers + Cron Triggers | Vercel Cron Jobs invoking a protected API route |
| Cache / rate-limit state | Cloudflare KV | Upstash Redis (or Vercel KV) |
| Analytics | (n/a in original) | Vercel Analytics (built-in, privacy-respecting) |

### Project structure adjustment

The monorepo collapses because the API and frontend can live in the same Next.js app. Revised structure:

```
/
├── CLAUDE.md
├── README.md
├── package.json
├── pnpm-lock.yaml
├── .env.example
├── vercel.json                  (cron config lives here)
├── next.config.mjs
├── tsconfig.json
├── drizzle.config.ts
├── app/
│   ├── (marketing)/
│   │   ├── page.tsx             (home)
│   │   └── about/page.tsx       (methodology, REQUIRED)
│   ├── games/
│   │   ├── page.tsx             (browse)
│   │   └── [slug]/page.tsx      (individual game by slug)
│   ├── search/page.tsx
│   ├── api/
│   │   ├── games/route.ts
│   │   ├── games/[id]/route.ts
│   │   ├── games/by-steam-id/[steamAppId]/route.ts
│   │   ├── search/route.ts
│   │   ├── stats/route.ts
│   │   ├── health/route.ts
│   │   └── cron/
│   │       ├── scrape-full/route.ts
│   │       └── scrape-incremental/route.ts
│   ├── sitemap.ts
│   ├── robots.ts
│   ├── layout.tsx
│   └── opengraph-image.tsx
├── lib/
│   ├── db/
│   │   ├── schema.ts            (Drizzle schema, Postgres dialect)
│   │   ├── client.ts
│   │   └── queries.ts
│   ├── scraper/
│   │   ├── steam.ts
│   │   ├── fetch.ts             (rate-limited fetcher)
│   │   └── parse.ts
│   ├── seo/
│   │   ├── jsonld.ts            (structured data builders)
│   │   └── metadata.ts          (generateMetadata helpers)
│   └── rate-limit.ts
├── components/
├── public/
│   ├── llms.txt                 (REQUIRED, see below)
│   └── favicon.ico
├── drizzle/                     (migrations)
└── test/
    ├── fixtures/                (saved Steam HTML samples)
    └── unit/
```

### Database

Use Drizzle ORM with the Postgres dialect. The schema in the original spec translates directly; replace `text` UUIDs with native `uuid` columns and use Postgres timestamps. Use `pgvector` if and only if you later need similarity search (not needed for v1).

Connection pooling: Supabase, Neon, and Vercel Postgres all provide pooled connection strings. Use the pooled URL in serverless functions (the non-pooled URL only for migrations).

Full-text search: use Postgres `tsvector` columns with a GIN index instead of SQLite FTS5. Add a generated column on `games.name` and `games.developer` for the search vector.

### Cron jobs

Configure in `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/scrape-incremental", "schedule": "0 */4 * * *" },
    { "path": "/api/cron/scrape-full", "schedule": "0 3 * * *" }
  ]
}
```

Protect these routes by checking the `Authorization: Bearer ${CRON_SECRET}` header that Vercel includes on cron invocations. Reject any request without it. Set `CRON_SECRET` in Vercel environment variables.

Vercel cron jobs run with the same function timeout as your hobby/pro plan (10s on hobby, up to 300s on pro for serverless, longer on fluid compute). The scraper must respect this: do incremental work per invocation, persist progress in the database, resume on the next tick. Don't try to scrape thousands of games in a single function call.

If the scrape job needs more time than a single function allows, split it: the cron route enqueues work into a queue table, and a separate route processes batches. For v1's scale (few thousand games), per-invocation batching of ~50 games with state-aware resumption is sufficient.

### Environment variables

`.env.example` must include:

```
DATABASE_URL=                    # Pooled Postgres connection string
DATABASE_URL_DIRECT=             # Non-pooled, for migrations
UPSTASH_REDIS_REST_URL=          # If using Upstash for rate limiting
UPSTASH_REDIS_REST_TOKEN=
CRON_SECRET=                     # Random string, must match Vercel cron config
SCRAPER_USER_AGENT=              # e.g. "AIGamesBot/0.1 (+https://yoursite.example/about)"
SITE_URL=                        # Canonical site URL, used in sitemap/og-tags
```

### Analytics

Enable Vercel Analytics (the Web Analytics product, free tier). Install `@vercel/analytics` and add `<Analytics />` to the root layout. Do not add Google Analytics. Do not add any third-party tracker.

If more depth is needed later, Plausible (paid, self-hostable) or Umami (self-hostable, free) are the right next steps. Skip them for v1.

### SEO baseline (required)

These are not optional. The site is informational and depends on being discoverable.

**Server-side rendering.** Every public page is SSR or static. Game pages use `generateStaticParams` for the top-N games (statically generated at build) and ISR (`revalidate`) for the long tail. Game data must be in the HTML on first response, not loaded by client JS.

**Metadata API on every page.** Use Next.js `generateMetadata` to produce:
- Page-specific `<title>` (e.g. `"<Game Name> — AI Content Disclosure"`)
- Meta description summarizing the game's AI disclosure status
- Open Graph tags (title, description, image, type, url)
- Twitter card tags (`summary_large_image`)
- Canonical URL

**Clean URLs.** Game pages use `/games/[slug]` where slug is `name-steamAppId` (e.g. `/games/baldurs-gate-3-1086940`). The Steam app ID is appended to guarantee uniqueness. Slug is generated at scrape time and stored in the games table.

**Sitemap.** `app/sitemap.ts` returns all game URLs plus static pages. Regenerated on each request (cheap with a DB query) or cached for 1 hour. Submit to Google Search Console and Bing Webmaster Tools after launch.

**Robots.txt.** `app/robots.ts` allows all crawlers by default and points to the sitemap. The about page must explain crawler policy plainly.

**JSON-LD structured data on every game page.** Use the `VideoGame` schema type, embedded in a `<script type="application/ld+json">` block:

```typescript
{
  "@context": "https://schema.org",
  "@type": "VideoGame",
  "name": game.name,
  "publisher": { "@type": "Organization", "name": game.publisher },
  "author": { "@type": "Organization", "name": game.developer },
  "datePublished": game.releaseDate,
  "url": canonicalUrl,
  "sameAs": [game.steamUrl],
  "description": disclosureSummary
}
```

The disclosure status itself doesn't have a perfect schema.org type. Include a `description` field that plainly states the disclosed AI status, because this is what AI systems extract verbatim.

### AEO / GEO (AI citation optimization)

Google AI Mode, ChatGPT Search, Perplexity, and Claude's web search read your site differently than a human user. Most cite sources but few drive clicks. Optimize for being the cited source.

**The `llms.txt` file.** Place a plain-text file at `/public/llms.txt`, served at `https://yoursite/llms.txt`. This is an emerging convention for telling LLMs what the site is and how to use it. Example:

```
# AI in Games

This site aggregates publicly-disclosed information about AI use in video games.

Primary data source: Steam developer self-disclosures (scraped from Steam store pages).

Coverage: We track Steam games that have AI disclosures and a broader set of popular games regardless of disclosure status.

Important limitations:
- We only surface what developers self-report on Steam.
- Absence of disclosure does not prove absence of AI use.
- We do not perform independent verification in this version.

For programmatic access, use our public API at https://yoursite/api/games.

Methodology: https://yoursite/about
```

**Atomic, source-cited claims.** Every claim on a game page must be a single atomic fact with a visible source. "Scraped from Steam on 2026-05-26. Source: <Steam URL>." This format is what AI citation pipelines reward: clear claim, clear source, clear date.

**FAQ-style content blocks on game pages.** Include a small Q&A section per game in a format AI systems consume well:

```
Q: Does <Game Name> use AI-generated content?
A: According to the developer's disclosure on Steam (scraped <date>), <Game Name> <does/does not> disclose pre-generated AI content and <does/does not> disclose live-generated AI content. <If disclosed: brief quote of disclosure.>
```

This adds zero noise for human readers (it can be styled subtly) but is very citable.

**Crawler allowlist policy.** In `robots.txt`, explicitly allow AI crawlers if the goal is citation reach:
- `GPTBot` (OpenAI)
- `ClaudeBot` (Anthropic)
- `PerplexityBot`
- `Googlebot` (handles Google AI Mode and traditional search)
- `Google-Extended` (controls inclusion in Gemini training/grounding separately)
- `Bingbot` and `OAI-SearchBot`

The default in v1 is **allow all**, because the goal is reach. If the project's stance changes later (e.g. wanting to block training while allowing search citation), the granularity is there: `GPTBot` is the OpenAI training crawler, `OAI-SearchBot` is for ChatGPT search responses. Document the chosen policy in the about page.

**Stable, semantic HTML.** AI crawlers vary in JS execution. The primary content (game name, developer, disclosure status, source link, scrape timestamp) must be in the server-rendered HTML inside semantic elements (`<h1>`, `<article>`, `<dl>`, `<time>`). No JS-only content for primary claims.

**Public API as a citation surface.** AI systems sometimes prefer structured endpoints. Document the API in a public OpenAPI spec at `/api/openapi.json` and link to it from the about page. Make the JSON responses self-describing (include source URLs and timestamps in every game record).

### Realistic expectations

Traditional Google organic traffic for informational queries has declined sharply in 2026 due to AI Overviews and AI Mode. Position-one click-through rates have dropped from roughly 27% to as low as 11% on queries where AI features appear. Plan acquisition accordingly:

1. Community sharing (Reddit, niche Discord servers, forums) will likely outperform Google.
2. Being cited in AI Mode and ChatGPT responses is more valuable than ranking for keywords.
3. Eventually the browser extension (future phase) brings users directly into the product without search.

This is not a reason to skip SEO. It's a reason to do SEO + AEO together and not over-invest time chasing rankings that no longer convert the way they used to.

### What the v1 success criteria become

Update the success criteria from the original spec to include:

6. The site has working SEO baseline: per-page metadata, sitemap, robots.txt, structured data on game pages, clean URLs.
7. `llms.txt` is present and accurate.
8. Vercel Analytics is enabled and reporting.
9. At least one game page passes Google's Rich Results Test for `VideoGame` schema.
10. The about page documents the crawler policy and limitations honestly.

### Deployment runbook (one-time setup)

1. Create a Vercel account and a new project linked to the repo.
2. Provision Postgres: Supabase project, Neon project, or Vercel Postgres add-on. Copy both pooled and direct connection strings.
3. Provision Upstash Redis (free tier) for rate-limit state. Copy URL and token.
4. Set environment variables in Vercel project settings: `DATABASE_URL`, `DATABASE_URL_DIRECT`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `CRON_SECRET`, `SCRAPER_USER_AGENT`, `SITE_URL`.
5. Run migrations against the direct URL: `pnpm db:migrate`.
6. Deploy: push to main, Vercel builds and deploys automatically.
7. Verify cron jobs are registered in the Vercel dashboard.
8. Add the production domain in Google Search Console and submit the sitemap.
9. Add the production domain in Bing Webmaster Tools and submit the sitemap.
10. Verify `/robots.txt`, `/sitemap.xml`, `/llms.txt` all return correctly.

---

## Future phases (DO NOT IMPLEMENT in v1, listed for context)

- Phase 2: Community reports with evidence requirements, moderation, dev response mechanism
- Phase 3: Desktop scanner (Tauri) that does forensic analysis of installed games and submits findings to the backend
- Phase 4: Browser extension overlay on Steam, Epic, GOG, itch store pages
- Phase 5: Additional store sources (Epic, GOG, itch.io disclosures)
- Phase 6: Known-AI hash database with public scraping pipeline

## Open questions to resolve before building

1. Project name. Pick something neutral. Suggestions: `gamedisclose`, `ai-in-games`, `assetwatch`, `playseen`. (User decides.)
2. Domain. Get one before launch.
3. Hosting accounts: Vercel account ready, database provider account ready (Supabase, Neon, or Vercel Postgres).
4. Legal: privacy policy and terms of service templates. Even v1 needs basic versions if accepting any user data (initially: none).

## File this document under

`/CLAUDE.md` at the root of the repository. Treat it as the source of truth for scope. If something isn't here, it's not in v1.
