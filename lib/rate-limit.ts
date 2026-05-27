import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

let _ratelimit: Ratelimit | null = null;

function getRatelimit(): Ratelimit | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  if (!_ratelimit) {
    _ratelimit = new Ratelimit({
      redis: new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      }),
      limiter: Ratelimit.slidingWindow(60, "1 m"),
      prefix: "aigames:rl",
    });
  }
  return _ratelimit;
}

export type RateLimitResult =
  | { blocked: NextResponse }
  | { blocked: null; headers: Record<string, string> };

export async function applyRateLimit(req: NextRequest): Promise<RateLimitResult> {
  const rl = getRatelimit();
  if (!rl) return { blocked: null, headers: {} };

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";

  const { success, limit, remaining, reset } = await rl.limit(ip);

  const rlHeaders: Record<string, string> = {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(reset),
  };

  if (!success) {
    return {
      blocked: NextResponse.json(
        { error: "Too many requests" },
        {
          status: 429,
          headers: {
            ...rlHeaders,
            "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
          },
        }
      ),
    };
  }

  return { blocked: null, headers: rlHeaders };
}
