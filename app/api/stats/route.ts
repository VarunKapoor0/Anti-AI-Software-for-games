import { NextRequest, NextResponse } from "next/server";
import { applyRateLimit } from "@/lib/rate-limit";
import { getStats } from "@/lib/db/queries";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const rl = await applyRateLimit(req);
  if (rl.blocked) return rl.blocked;

  try {
    const stats = await getStats();
    return NextResponse.json(stats, {
      headers: {
        ...corsHeaders(),
        ...rl.headers,
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    });
  } catch (err) {
    console.error("GET /api/stats error:", err);
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
