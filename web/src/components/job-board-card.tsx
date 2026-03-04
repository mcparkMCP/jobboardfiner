import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScoreBadge } from "./score-badge";
import type { JobBoard } from "@/lib/types";
import { Globe, MapPin, Users, Star } from "lucide-react";

export function JobBoardCard({ board }: { board: JobBoard }) {
  const logoSrc = board.logoUrl || board.logo;
  return (
    <Link href={`/board/${board.slug}`}>
      <Card className="h-full hover:shadow-lg hover:border-primary/30 transition-all duration-200 group cursor-pointer">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0 border">
              {logoSrc ? (
                <Image
                  src={logoSrc}
                  alt={board.name}
                  width={48}
                  height={48}
                  className="object-contain"
                  unoptimized
                />
              ) : (
                <Globe className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-base group-hover:text-primary transition-colors truncate">
                  {board.name}
                </h3>
                <ScoreBadge score={board.score} size="sm" />
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                <MapPin className="w-3.5 h-3.5" />
                <span className="truncate">{board.country || "Global"}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-3">
            {board.type && (
              <Badge variant="secondary" className="text-xs">
                {board.type}
              </Badge>
            )}
            {board.scope && board.scope !== board.type && (
              <Badge variant="outline" className="text-xs">
                {board.scope}
              </Badge>
            )}
            {board.pricingModel?.map((p) => (
              <Badge
                key={p}
                variant="outline"
                className="text-xs border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400"
              >
                {p}
              </Badge>
            ))}
          </div>

          {board.siteStatement && (
            <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
              {board.siteStatement}
            </p>
          )}

          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            {board.yearFounded && <span>Est. {board.yearFounded}</span>}
            {board.employees && (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {board.employees}
              </span>
            )}
            {board.reviews?.length > 0 && (
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3" />
                {board.reviews.length} review{board.reviews.length !== 1 ? "s" : ""}
              </span>
            )}
            {board.languages?.length > 0 && (
              <span>{board.languages.length} lang{board.languages.length !== 1 ? "s" : ""}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
