import { cn } from "@/lib/utils";

export function ScoreBadge({
  score,
  size = "md",
}: {
  score: string | null;
  size?: "sm" | "md" | "lg";
}) {
  if (!score) return null;
  const num = parseFloat(score);
  const color =
    num >= 8
      ? "bg-emerald-500 text-white"
      : num >= 6
        ? "bg-blue-500 text-white"
        : num >= 4
          ? "bg-amber-500 text-white"
          : "bg-red-500 text-white";

  const sizeClass =
    size === "lg"
      ? "text-2xl w-14 h-14"
      : size === "sm"
        ? "text-xs w-7 h-7"
        : "text-sm w-9 h-9";

  return (
    <div
      className={cn(
        "rounded-lg font-bold flex items-center justify-center shrink-0",
        color,
        sizeClass
      )}
    >
      {num.toFixed(1)}
    </div>
  );
}
