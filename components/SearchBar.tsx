"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  defaultValue?: string;
  placeholder?: string;
};

export function SearchBar({ defaultValue = "", placeholder = "Search games..." }: Props) {
  const router = useRouter();
  const [q, setQ] = useState(defaultValue);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} role="search" className="flex gap-2 w-full max-w-xl">
      <label htmlFor="search-input" className="sr-only">
        Search games
      </label>
      <input
        id="search-input"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        className="flex-1 rounded border px-4 py-2 text-sm focus:outline-none focus:ring-2"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--card)",
          color: "var(--fg)",
        }}
        aria-label="Search games"
      />
      <button
        type="submit"
        className="rounded px-4 py-2 text-sm font-medium text-white"
        style={{ backgroundColor: "var(--accent)" }}
      >
        Search
      </button>
    </form>
  );
}
