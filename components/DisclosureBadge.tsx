import type { GameWithDisclosure } from "@/lib/db/queries";

type Props = {
  game: Pick<GameWithDisclosure, "hasDisclosure" | "preGeneratedContent" | "liveGeneratedContent">;
  size?: "sm" | "md";
};

export function DisclosureBadge({ game, size = "md" }: Props) {
  const px = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";

  if (!game.hasDisclosure) {
    return (
      <span
        className={`inline-flex items-center rounded font-medium ${px}`}
        style={{ backgroundColor: "var(--border)", color: "var(--muted)" }}
      >
        No disclosure
      </span>
    );
  }

  const labels = [
    game.preGeneratedContent ? "Pre-generated AI" : null,
    game.liveGeneratedContent ? "Live-generated AI" : null,
  ].filter(Boolean);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-medium ${px}`}
      style={{ backgroundColor: "#14532d22", color: "var(--disclosure-yes)" }}
    >
      Disclosed: {labels.join(", ")}
    </span>
  );
}
