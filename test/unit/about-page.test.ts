import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

// Regression guard: about page must contain required honesty disclaimer text.
// If this test fails, someone removed content from app/about/page.tsx that
// must stay per spec.

describe("about page honesty disclaimers", () => {
  const aboutSrc = fs.readFileSync(
    path.join(__dirname, "../../app/about/page.tsx"),
    "utf-8"
  );

  it("states that we only surface what developers self-report", () => {
    expect(aboutSrc).toMatch(/only surface what developers self-report/i);
  });

  it("states that absence of disclosure does not prove absence of AI use", () => {
    expect(aboutSrc).toMatch(/absence of (a )?disclosure does not (prove|confirm) absence of AI use/i);
  });

  it("states that Steam is the only source in this version", () => {
    expect(aboutSrc).toMatch(/Steam is our only source/i);
  });

  it("states that we do not perform independent technical verification", () => {
    expect(aboutSrc).toMatch(/do not perform independent (technical )?verification/i);
  });

  it("never uses the phrase 'AI-free' as a positive claim", () => {
    // The word may appear in context of explaining we don't show it.
    // Check that it doesn't appear as a badge/indicator phrase.
    // These patterns would indicate a positive claim we must not make.
    // Note: the about page may mention these terms in a negative context ("we never show X")
    // so we check for the positive assertion form only.
    const forbiddenPatterns = [/AI-free ✓/, /verified clean ✓/, /✓.*AI.free/i];
    for (const pattern of forbiddenPatterns) {
      expect(aboutSrc).not.toMatch(pattern);
    }
  });

  it("states that future features are not yet implemented", () => {
    expect(aboutSrc).toMatch(/not yet implemented/i);
  });
});
