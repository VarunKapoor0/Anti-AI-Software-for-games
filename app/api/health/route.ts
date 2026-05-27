import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET() {
  try {
    await getDb().execute(sql`SELECT 1`);
    return NextResponse.json({ status: "ok", db: "ok" });
  } catch {
    return NextResponse.json({ status: "error", db: "unreachable" }, { status: 503 });
  }
}
