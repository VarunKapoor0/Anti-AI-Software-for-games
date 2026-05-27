# AI in Games

A public website that aggregates developer self-disclosures about AI-generated content in video games. Data is sourced from Steam store pages.

**Live site:** https://ai-in-games.vercel.app

## What it does

When developers publish games on Steam, Valve requires them to disclose whether the game uses AI-generated content and what kind (pre-generated assets, or live/runtime generation). This site scrapes those disclosures, stores them with timestamps, and makes them searchable.

**What it doesn't do:** independently verify AI use. A game without a disclosure may still use AI. Absence of disclosure is never shown as a clean bill of health.

## Tech stack

- **Frontend & API:** Next.js 15 App Router, TypeScript, Tailwind CSS — deployed on Vercel
- **Database:** Postgres via Neon, Drizzle ORM
- **Rate limiting:** Upstash Redis
- **Scraping:** Cheerio, scheduled via Vercel Cron Jobs

## Local development

### Prerequisites

- Node.js 18+
- A Postgres database (Neon free tier recommended)

### Setup

```bash
# Install dependencies
npm install

# Copy env template and fill in your values
cp .env.example .env.local

# Push schema to database
DATABASE_URL_DIRECT=your_direct_url npx drizzle-kit push

# Seed with sample data
DATABASE_URL=your_pooled_url npx tsx scripts/seed.ts

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Pooled Postgres connection string (for app queries) |
| `DATABASE_URL_DIRECT` | Direct Postgres connection string (for migrations) |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL (rate limiting; optional in dev) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token |
| `CRON_SECRET` | Secret for protecting cron routes |
| `SCRAPER_USER_AGENT` | User-Agent string for the scraper |
| `SITE_URL` | Canonical site URL (used in sitemap and metadata) |

### Scripts

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run typecheck    # TypeScript check
npm test             # Run tests (Vitest)
npm run db:generate  # Generate Drizzle migrations
npm run db:migrate   # Apply migrations
npm run db:studio    # Open Drizzle Studio

# Bulk scrape real Steam data (local only, rate-limited)
DATABASE_URL=... npx tsx scripts/bulk-scrape.ts
```

## API

Public JSON API — no auth required, rate-limited to 60 req/min per IP.

| Endpoint | Description |
|---|---|
| `GET /api/games` | List games (paginated, filterable) |
| `GET /api/games/:id` | Game by internal ID |
| `GET /api/games/by-steam-id/:id` | Game by Steam app ID |
| `GET /api/search?q=...` | Full-text search |
| `GET /api/stats` | Aggregate counts |
| `GET /api/health` | Health check |

Full OpenAPI spec: [/api/openapi.json](/api/openapi.json)

## Cron jobs

Two scheduled scrapes run daily via Vercel Cron (Hobby plan):

- **3:00 AM UTC** — full scrape (discovers new games from Steam app list)
- **12:00 PM UTC** — incremental scrape (re-checks existing games for disclosure changes)

Cron routes are protected by `Authorization: Bearer <CRON_SECRET>`.

## Honesty policy

This site never displays "AI-free" or "verified clean" indicators. It shows only what developers have self-reported on Steam, with the source URL and timestamp for every claim. See [/about](/about) for full methodology.

## License

MIT
