import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { parseSteamPage, makeSlug } from "@/lib/scraper/parse";

function loadFixture(steamAppId: number): string {
  return fs.readFileSync(
    path.join(__dirname, "../fixtures", `steam-${steamAppId}.html`),
    "utf-8"
  );
}

describe("parseSteamPage", () => {
  it("parses a game with pre-generated AI disclosure", () => {
    const html = loadFixture(2358720);
    const result = parseSteamPage(html);

    expect(result.name).toBe("Palworld");
    expect(result.developer).toBe("Pocketpair, Inc.");
    expect(result.hasDisclosure).toBe(true);
    expect(result.preGeneratedContent).toBe(true);
    expect(result.liveGeneratedContent).toBe(false);
    expect(result.disclosureText).toBeTruthy();
    expect(result.rawHtmlHash).toHaveLength(64);
  });

  it("parses a game with no AI disclosure", () => {
    const html = loadFixture(1086940);
    const result = parseSteamPage(html);

    expect(result.name).toBe("Baldur's Gate 3");
    expect(result.developer).toBe("Larian Studios");
    expect(result.hasDisclosure).toBe(false);
    expect(result.preGeneratedContent).toBe(false);
    expect(result.liveGeneratedContent).toBe(false);
  });

  it("parses a game with both pre-generated and live-generated AI", () => {
    const html = loadFixture(9999999);
    const result = parseSteamPage(html);

    expect(result.name).toBe("Live AI Demo Game");
    expect(result.hasDisclosure).toBe(true);
    expect(result.preGeneratedContent).toBe(true);
    expect(result.liveGeneratedContent).toBe(true);
  });

  it("produces consistent hash for identical HTML", () => {
    const html = loadFixture(2358720);
    const r1 = parseSteamPage(html);
    const r2 = parseSteamPage(html);
    expect(r1.rawHtmlHash).toBe(r2.rawHtmlHash);
  });

  it("produces different hashes for different disclosure sections", () => {
    const html1 = loadFixture(2358720);
    const html2 = loadFixture(1086940);
    const r1 = parseSteamPage(html1);
    const r2 = parseSteamPage(html2);
    expect(r1.rawHtmlHash).not.toBe(r2.rawHtmlHash);
  });
});

describe("makeSlug", () => {
  it("generates a URL-safe slug with steam app ID", () => {
    expect(makeSlug("Baldur's Gate 3", 1086940)).toBe("baldurs-gate-3-1086940");
  });

  it("handles special characters", () => {
    expect(makeSlug("HELLDIVERS™ 2", 553850)).toBe("helldivers-2-553850");
  });

  it("truncates long names", () => {
    const longName = "A".repeat(100);
    const slug = makeSlug(longName, 12345);
    expect(slug.length).toBeLessThanOrEqual(67); // 60 chars + dash + 5 digit id
    expect(slug).toMatch(/-12345$/);
  });
});
