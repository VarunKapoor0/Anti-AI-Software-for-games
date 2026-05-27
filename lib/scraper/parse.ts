import * as cheerio from "cheerio";
import crypto from "crypto";

export type SteamPageData = {
  name: string;
  developer: string | null;
  publisher: string | null;
  releaseDate: string | null;
  headerImageUrl: string | null;
  hasDisclosure: boolean;
  preGeneratedContent: boolean;
  liveGeneratedContent: boolean;
  disclosureText: string | null;
  rawHtmlHash: string;
};

// Verified against Steam markup as of 2026-05-26.
// Steam renders AI disclosures in #game_area_content_descriptors within
// div.game_area_sys_req or a dedicated AI content notice block.
// The two categories surface as text containing "AI Generated Content" with
// sub-labels for pre-generated and live-generated.
export function parseSteamPage(html: string): SteamPageData {
  const $ = cheerio.load(html);

  const name =
    $("#appHubAppName").text().trim() ||
    $("div.apphub_AppName").text().trim() ||
    $("title").text().replace("on Steam", "").trim();

  const developer =
    $("#developers_list a").first().text().trim() ||
    $(".dev_row .summary.column a").first().text().trim() ||
    null;

  const publisher =
    $(".dev_row").filter((_, el) => $(el).text().includes("Publisher")).find("a").first().text().trim() ||
    null;

  const releaseDateRaw =
    $(".release_date .date").text().trim() ||
    $("#game_highlights .release_date .date").text().trim();
  const releaseDate = releaseDateRaw ? normalizeDate(releaseDateRaw) : null;

  const headerImageUrl =
    $('img.game_header_image_full').attr("src") ||
    $('meta[property="og:image"]').attr("content") ||
    null;

  // AI disclosure block — Steam uses #game_area_content_descriptors for ratings/notices
  // and a separate div for AI content disclosures.
  const disclosureBlock =
    $("#game_area_content_descriptors").text() +
    " " +
    $(".game_area_sys_req").text() +
    " " +
    $("[class*='ai_content']").text() +
    " " +
    $("[class*='AI_generated']").text();

  // Also check the full page text for the Steam AI disclosure pattern
  const fullText = $("body").text();

  const hasAiSection =
    /AI[- ]Generated Content/i.test(fullText) ||
    /AI[- ]generated content/i.test(fullText) ||
    /artificial intelligence/i.test(disclosureBlock);

  let disclosureText: string | null = null;
  let preGeneratedContent = false;
  let liveGeneratedContent = false;

  if (hasAiSection) {
    // Extract the disclosure paragraph
    const aiParagraphs: string[] = [];
    $("p, div").each((_, el) => {
      const text = $(el).text().trim();
      if (/AI[- ]Generated Content/i.test(text) && text.length < 2000) {
        aiParagraphs.push(text);
      }
    });
    disclosureText = aiParagraphs[0] ?? null;

    // Check Steam's explicit "Pre-Generated AI Content: Yes" pattern first,
    // then fall back to presence-based detection.
    const preYesNo = fullText.match(/Pre[- ]Generated AI Content:\s*(Yes|No)/i);
    const liveYesNo = fullText.match(/Live[- ]Generated AI Content:\s*(Yes|No)/i);

    preGeneratedContent = preYesNo
      ? preYesNo[1].toLowerCase() === "yes"
      : /pre[- ]generated/i.test(disclosureBlock);

    liveGeneratedContent = liveYesNo
      ? liveYesNo[1].toLowerCase() === "yes"
      : /live[- ]generated/i.test(disclosureBlock);
  }

  const hasDisclosure = hasAiSection && (preGeneratedContent || liveGeneratedContent || !!disclosureText);

  // Hash only the disclosure-relevant portion to detect changes
  const hashInput =
    $("#game_area_content_descriptors").html() ?? disclosureText ?? "";
  const rawHtmlHash = crypto.createHash("sha256").update(hashInput).digest("hex");

  return {
    name,
    developer: developer || null,
    publisher: publisher || null,
    releaseDate,
    headerImageUrl: headerImageUrl || null,
    hasDisclosure,
    preGeneratedContent,
    liveGeneratedContent,
    disclosureText,
    rawHtmlHash,
  };
}

export function makeSlug(name: string, steamAppId: number): string {
  const base = name
    .toLowerCase()
    .replace(/['’]/g, "") // strip apostrophes before replacing non-alphanumeric
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `${base}-${steamAppId}`;
}

function normalizeDate(raw: string): string | null {
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split("T")[0];
  } catch {
    return null;
  }
}
