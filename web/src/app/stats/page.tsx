import Link from "next/link";
import { jobBoards, countries, types } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Globe } from "lucide-react";

export const metadata = {
  title: "Statistics - JobBoard Finder",
};

export default function StatsPage() {
  const countByCountry = new Map<string, number>();
  const countByType = new Map<string, number>();
  const countByScope = new Map<string, number>();

  for (const board of jobBoards) {
    if (board.country) {
      countByCountry.set(
        board.country,
        (countByCountry.get(board.country) || 0) + 1
      );
    }
    if (board.type) {
      countByType.set(board.type, (countByType.get(board.type) || 0) + 1);
    }
    if (board.scope) {
      countByScope.set(board.scope, (countByScope.get(board.scope) || 0) + 1);
    }
  }

  const topCountries = [...countByCountry.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30);

  const withReviews = jobBoards.filter((j) => j.reviews?.length > 0).length;
  const withWebsite = jobBoards.filter((j) => j.websiteUrl).length;
  const avgScore =
    jobBoards.reduce((sum, j) => sum + (parseFloat(j.score || "0") || 0), 0) /
    jobBoards.length;

  return (
    <div className="min-h-screen">
      <header className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to all job boards
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold tracking-tight mb-8">
          Job Board Statistics
        </h1>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Job Boards", value: jobBoards.length },
            { label: "Countries", value: countries.length },
            { label: "Avg. Score", value: avgScore.toFixed(1) },
            { label: "With Reviews", value: withReviews },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-primary">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {stat.label}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* By Type */}
          <Card>
            <CardHeader>
              <CardTitle>By Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...countByType.entries()]
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => (
                    <div key={type} className="flex items-center gap-3">
                      <div className="flex-1 text-sm">{type}</div>
                      <div className="w-32 h-2.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{
                            width: `${(count / jobBoards.length) * 100}%`,
                          }}
                        />
                      </div>
                      <div className="text-sm font-medium w-8 text-right">
                        {count}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* By Scope */}
          <Card>
            <CardHeader>
              <CardTitle>By Scope</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...countByScope.entries()]
                  .sort((a, b) => b[1] - a[1])
                  .map(([scope, count]) => (
                    <div key={scope} className="flex items-center gap-3">
                      <div className="flex-1 text-sm">{scope}</div>
                      <div className="w-32 h-2.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-chart-2 rounded-full"
                          style={{
                            width: `${(count / jobBoards.length) * 100}%`,
                          }}
                        />
                      </div>
                      <div className="text-sm font-medium w-8 text-right">
                        {count}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Countries */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Top 30 Countries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {topCountries.map(([country, count], i) => (
                  <div
                    key={country}
                    className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-muted"
                  >
                    <span className="text-xs text-muted-foreground w-5">
                      {i + 1}.
                    </span>
                    <span className="flex-1 text-sm">{country}</span>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
