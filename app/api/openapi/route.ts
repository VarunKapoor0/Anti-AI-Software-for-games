import { NextResponse } from "next/server";

const siteUrl = process.env.SITE_URL ?? "https://ai-in-games.example.com";

export async function GET() {
  const spec = {
    openapi: "3.0.3",
    info: {
      title: "AI in Games API",
      version: "1.0.0",
      description:
        "Public API for AI content disclosures in video games. All data is sourced from developer self-disclosures on Steam.",
    },
    servers: [{ url: `${siteUrl}/api` }],
    paths: {
      "/games": {
        get: {
          summary: "List games",
          parameters: [
            { name: "limit", in: "query", schema: { type: "integer", default: 50, maximum: 100 } },
            { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
            { name: "has_disclosure", in: "query", schema: { type: "boolean" } },
            { name: "has_pre_generated", in: "query", schema: { type: "boolean" } },
            { name: "has_live_generated", in: "query", schema: { type: "boolean" } },
            {
              name: "sort",
              in: "query",
              schema: { type: "string", enum: ["name", "updated", "release_date"] },
            },
          ],
          responses: { "200": { description: "Paginated list of games with latest disclosures" } },
        },
      },
      "/games/{id}": {
        get: {
          summary: "Get game by ID",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Game with disclosure history" } },
        },
      },
      "/games/by-steam-id/{steamAppId}": {
        get: {
          summary: "Get game by Steam app ID",
          parameters: [
            { name: "steamAppId", in: "path", required: true, schema: { type: "integer" } },
          ],
          responses: { "200": { description: "Game with disclosure history" } },
        },
      },
      "/search": {
        get: {
          summary: "Search games by name or developer",
          parameters: [{ name: "q", in: "query", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Search results" } },
        },
      },
      "/stats": {
        get: {
          summary: "Aggregate statistics",
          responses: { "200": { description: "Counts of tracked games and disclosures" } },
        },
      },
      "/health": {
        get: {
          summary: "Health check",
          responses: { "200": { description: "OK" } },
        },
      },
    },
  };

  return NextResponse.json(spec, {
    headers: { "Content-Type": "application/json" },
  });
}
