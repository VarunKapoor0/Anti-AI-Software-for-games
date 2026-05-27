import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About & Methodology",
  description:
    "How AI in Games works, what data we collect, its limitations, and our crawler policy.",
};

export default function AboutPage() {
  return (
    <article className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold">About & Methodology</h1>

      <section aria-labelledby="what-heading">
        <h2 id="what-heading" className="text-lg font-semibold mb-3">
          What this site does
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
          AI in Games aggregates developer self-disclosures about AI-generated content in video
          games. When developers publish their games on Steam, Valve requires them to disclose
          whether the game uses AI-generated content and what kind (pre-generated assets, or
          live/runtime generation). We scrape those disclosures and make them searchable.
        </p>
      </section>

      <section aria-labelledby="limitations-heading">
        <h2 id="limitations-heading" className="text-lg font-semibold mb-3">
          Explicit limitations
        </h2>
        <ul className="space-y-3 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
          <li>
            <strong style={{ color: "var(--fg)" }}>We only surface what developers self-report.</strong>{" "}
            A game without a disclosure may still use AI-generated content. We cannot detect AI use
            independently.
          </li>
          <li>
            <strong style={{ color: "var(--fg)" }}>Steam is our only source in this version.</strong>{" "}
            We do not scrape Epic Games Store, GOG, itch.io, or other platforms yet.
          </li>
          <li>
            <strong style={{ color: "var(--fg)" }}>Absence of disclosure does not confirm absence of AI use.</strong>{" "}
            We display the absence of a disclosure plainly. We never show &ldquo;AI-free&rdquo; or
            &ldquo;no AI content&rdquo; indicators, because we have no basis to make that claim.
          </li>
          <li>
            <strong style={{ color: "var(--fg)" }}>Disclosures can change.</strong>{" "}
            Developers can update or remove their disclosures. We scrape periodically and keep a
            timestamped history, but we may not capture every change in real time.
          </li>
          <li>
            <strong style={{ color: "var(--fg)" }}>We do not perform independent technical verification.</strong>{" "}
            We do not analyze game files, assets, or binaries.
          </li>
        </ul>
      </section>

      <section aria-labelledby="data-heading">
        <h2 id="data-heading" className="text-lg font-semibold mb-3">
          Data sources and collection
        </h2>
        <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--muted)" }}>
          We collect data from Steam store pages using an automated scraper. The scraper:
        </p>
        <ul className="space-y-2 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
          <li>Respects Steam&apos;s robots.txt</li>
          <li>Identifies itself with a clear User-Agent header</li>
          <li>Rate-limits requests to one per second</li>
          <li>Honors Retry-After headers and backs off on HTTP 429 responses</li>
          <li>Runs a full pass once per day, and incremental passes every four hours</li>
        </ul>
        <p className="text-sm leading-relaxed mt-3" style={{ color: "var(--muted)" }}>
          We store the scraped timestamp and a hash of the disclosure HTML alongside each record, so
          you can see when a disclosure was last confirmed and whether anything changed.
        </p>
      </section>

      <section aria-labelledby="crawler-heading">
        <h2 id="crawler-heading" className="text-lg font-semibold mb-3">
          Crawler policy for this site
        </h2>
        <p className="text-sm leading-relaxed mb-2" style={{ color: "var(--muted)" }}>
          We allow all crawlers by default, including AI crawlers. Our goal is reach — being a
          useful, citable source of accurate information about AI disclosures in games. We currently
          allow:
        </p>
        <ul className="text-sm space-y-1 font-mono" style={{ color: "var(--muted)" }}>
          <li>Googlebot / Google-Extended</li>
          <li>GPTBot (OpenAI training)</li>
          <li>OAI-SearchBot (ChatGPT search)</li>
          <li>ClaudeBot (Anthropic)</li>
          <li>PerplexityBot</li>
          <li>Bingbot</li>
        </ul>
        <p className="text-sm mt-3" style={{ color: "var(--muted)" }}>
          If this policy changes, it will be updated here and in{" "}
          <code className="text-xs">/robots.txt</code>.
        </p>
      </section>

      <section aria-labelledby="errors-heading">
        <h2 id="errors-heading" className="text-lg font-semibold mb-3">
          Reporting errors
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
          If you believe a game&apos;s disclosure information is incorrect or out of date, please
          check the Steam store page directly first — that is our primary source. If the Steam page
          disagrees with what we show, it&apos;s likely that the developer updated their disclosure
          after our last scrape. It will update automatically on the next scrape run.
        </p>
      </section>

      <section aria-labelledby="future-heading">
        <h2 id="future-heading" className="text-lg font-semibold mb-3">
          Future plans (not yet implemented)
        </h2>
        <ul className="space-y-1 text-sm" style={{ color: "var(--muted)" }}>
          <li>Community-submitted reports with evidence requirements</li>
          <li>Desktop scanner for forensic analysis of installed games</li>
          <li>Browser extension for Steam, Epic, GOG, and itch store pages</li>
          <li>Additional store sources (Epic, GOG, itch.io)</li>
          <li>Developer response mechanism</li>
        </ul>
        <p className="text-sm mt-3" style={{ color: "var(--muted)" }}>
          None of the above are implemented in the current version.
        </p>
      </section>

      <nav aria-label="Site navigation" className="pt-4 border-t" style={{ borderColor: "var(--border)" }}>
        <Link href="/" className="text-sm hover:underline" style={{ color: "var(--accent)" }}>
          ← Back to home
        </Link>
      </nav>
    </article>
  );
}
