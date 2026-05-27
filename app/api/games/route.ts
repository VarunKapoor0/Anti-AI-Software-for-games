import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from "@/lib/rate-limit";
import { listGames } from "@/lib/db/queries";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const rl = await applyRateLimit(req);
  if (rl.blocked) return rl.blocked;

  const { searchParams } = req.nextUrl;
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);
  const sort = (searchParams.get("sort") ?? "updated") as "name" | "updated" | "release_date";

  const hasDisclosureParam = searchParams.get("has_disclosure");
  const hasPreParam = searchParams.get("has_pre_generated");
  const hasLiveParam = searchParams.get("has_live_generated");

  const opts = {
    limit,
    offset,
    sort,
    ...(hasDisclosureParam !== null ? { hasDisclosure: hasDisclosureParam === "true" } : {}),
    ...(hasPreParam !== null ? { hasPreGenerated: hasPreParam === "true" } : {}),
    ...(hasLiveParam !== null ? { hasLiveGenerated: hasLiveParam === "true" } : {}),
  };

  try {
    const result = await listGames(opts);
    return NextResponse.json(result, {
      headers: { ...corsHeaders(), ...rl.headers },
    });
  } catch (err) {
    console.error("GET /api/games error:", err);
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
