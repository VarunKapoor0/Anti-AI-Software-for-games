import fs from "fs/promises";
import path from "path";

const DEFAULT_DELAY_MS = 1000;
let lastRequestAt = 0;

async function respectRateLimit() {
  const now = Date.now();
  const elapsed = now - lastRequestAt;
  if (elapsed < DEFAULT_DELAY_MS) {
    await new Promise((r) => setTimeout(r, DEFAULT_DELAY_MS - elapsed));
  }
  lastRequestAt = Date.now();
}

export async function fetchPage(url: string): Promise<string> {
  await respectRateLimit();

  const userAgent =
    process.env.SCRAPER_USER_AGENT ||
    "AIGamesBot/0.1 (+https://ai-in-games.example.com/about)";

  const res = await fetch(url, {
    headers: {
      "User-Agent": userAgent,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get("Retry-After") ?? "60", 10);
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    return fetchPage(url);
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`);
  }

  return res.text();
}

export async function fetchPageFixture(steamAppId: number): Promise<string | null> {
  const fixturePath = path.join(
    process.cwd(),
    "test",
    "fixtures",
    `steam-${steamAppId}.html`
  );
  try {
    return await fs.readFile(fixturePath, "utf-8");
  } catch {
    return null;
  }
}

export type SteamAppEntry = { appid: number; name: string };

export async function fetchSteamAppList(): Promise<SteamAppEntry[]> {
  const res = await fetch(
    "https://api.steampowered.com/ISteamApps/GetAppList/v2/",
    { signal: AbortSignal.timeout(30_000) }
  );
  if (!res.ok) throw new Error(`Steam app list HTTP ${res.status}`);
  const data = await res.json();
  return data?.applist?.apps ?? [];
}

export async function checkRobotsTxt(domain: string): Promise<boolean> {
  try {
    const res = await fetch(`https://${domain}/robots.txt`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return true; // assume allowed if robots.txt missing
    const text = await res.text();
    // Simple check: look for Disallow rules for our paths
    const lines = text.split("\n");
    let inOurAgent = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (/^User-agent:\s*\*/i.test(trimmed) || /^User-agent:\s*AIGamesBot/i.test(trimmed)) {
        inOurAgent = true;
      } else if (/^User-agent:/i.test(trimmed)) {
        inOurAgent = false;
      }
      if (inOurAgent && /^Disallow:\s*\/$/i.test(trimmed)) {
        return false;
      }
    }
    return true;
  } catch {
    return true;
  }
}
