"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export function Header() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <header
      className="border-b px-4 py-3 flex items-center justify-between"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}
    >
      <nav className="flex items-center gap-6" aria-label="Main navigation">
        <Link
          href="/"
          className="font-semibold text-lg tracking-tight"
          style={{ color: "var(--fg)" }}
        >
          AI in Games
        </Link>
        <Link
          href="/games"
          className="text-sm"
          style={{ color: "var(--muted)" }}
        >
          Browse
        </Link>
        <Link
          href="/about"
          className="text-sm"
          style={{ color: "var(--muted)" }}
        >
          About
        </Link>
      </nav>
      <button
        onClick={toggleTheme}
        aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
        className="text-sm px-3 py-1 rounded border"
        style={{ borderColor: "var(--border)", color: "var(--muted)" }}
      >
        {dark ? "Light" : "Dark"}
      </button>
    </header>
  );
}
