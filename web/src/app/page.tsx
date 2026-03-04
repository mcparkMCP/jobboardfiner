import { Suspense } from "react";
import Link from "next/link";
import { SearchFilters } from "@/components/search-filters";
import { JobBoardGrid } from "@/components/job-board-grid";
import { jobBoards } from "@/lib/data";
import { Globe, BarChart3 } from "lucide-react";

export default function Home() {
  const totalCountries = new Set(
    jobBoards.map((j) => j.country).filter(Boolean)
  ).size;

  return (
    <div className="min-h-screen">
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Globe className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  JobBoard Finder
                </h1>
                <p className="text-sm text-muted-foreground">
                  {jobBoards.length.toLocaleString()} job boards across{" "}
                  {totalCountries} countries
                </p>
              </div>
            </div>
            <Link
              href="/stats"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              Stats
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <Suspense>
          <SearchFilters />
        </Suspense>
        <div className="mt-6">
          <Suspense
            fallback={
              <div className="text-center py-12 text-muted-foreground">
                Loading...
              </div>
            }
          >
            <JobBoardGrid />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
