import { NextRequest, NextResponse } from "next/server";
import { runScrape } from "@/lib/scraper/steam";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await runScrape("incremental");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Incremental scrape failed:", err);
    return NextResponse.json({ error: "Scrape failed" }, { status: 500 });
  }
}
