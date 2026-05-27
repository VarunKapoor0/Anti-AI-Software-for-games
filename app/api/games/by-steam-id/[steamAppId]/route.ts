import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from "@/lib/rate-limit";
import { getGameBySteamId, getDisclosureHistory } from "@/lib/db/queries";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ steamAppId: string }> }
) {
  const limited = await applyRateLimit(req);
  if (limited) return limited;

  const { steamAppId: steamAppIdStr } = await params;
  const steamAppId = parseInt(steamAppIdStr, 10);
  if (isNaN(steamAppId)) {
    return NextResponse.json({ error: "Invalid Steam app ID" }, { status: 400 });
  }

  try {
    const game = await getGameBySteamId(steamAppId);
    if (!game) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const history = await getDisclosureHistory(game.id);
    return NextResponse.json({ game, history }, { headers: corsHeaders() });
  } catch (err) {
    console.error("GET /api/games/by-steam-id error:", err);
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
