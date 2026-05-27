import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from "@/lib/rate-limit";
import { searchGames } from "@/lib/db/queries";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const rl = await applyRateLimit(req);
  if (rl.blocked) return rl.blocked;

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return NextResponse.json({ results: [] }, { headers: { ...corsHeaders(), ...rl.headers } });
  }
  if (q.length > 200) {
    return NextResponse.json({ error: "Query too long" }, { status: 400 });
  }

  try {
    const results = await searchGames(q);
    return NextResponse.json({ results }, { headers: { ...corsHeaders(), ...rl.headers } });
  } catch (err) {
    console.error("GET /api/search error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": process.env.SITE_URL ?? "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
