"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { searchBoards } from "@/lib/data";
import { JobBoardCard } from "./job-board-card";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 30;

export function JobBoardGrid() {
  const searchParams = useSearchParams();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const boards = useMemo(() => {
    setVisibleCount(PAGE_SIZE);
    return searchBoards({
      query: searchParams.get("q") || undefined,
      country: searchParams.get("country") || undefined,
      type: searchParams.get("type") || undefined,
      scope: searchParams.get("scope") || undefined,
      sort: searchParams.get("sort") || undefined,
    });
  }, [searchParams]);

  const visible = boards.slice(0, visibleCount);

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">
        {boards.length} result{boards.length !== 1 ? "s" : ""}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map((board) => (
          <JobBoardCard key={board.slug} board={board} />
        ))}
      </div>
      {visibleCount < boards.length && (
        <div className="flex justify-center mt-8">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          >
            Load more ({boards.length - visibleCount} remaining)
          </Button>
        </div>
      )}
    </div>
  );
}
