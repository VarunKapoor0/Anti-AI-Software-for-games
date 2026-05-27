import Link from "next/link";

export function Footer() {
  return (
    <footer
      className="border-t px-4 py-6 text-sm"
      style={{ borderColor: "var(--border)", color: "var(--muted)" }}
    >
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row gap-3 justify-between">
        <p>
          Data sourced from Steam developer self-disclosures. We do not independently verify AI use.
        </p>
        <nav className="flex gap-4 shrink-0" aria-label="Footer navigation">
          <Link href="/about" className="hover:underline">
            Methodology
          </Link>
          <Link href="/api/openapi" className="hover:underline">
            API
          </Link>
          <a
            href="https://github.com/ai-in-games"
            className="hover:underline"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
