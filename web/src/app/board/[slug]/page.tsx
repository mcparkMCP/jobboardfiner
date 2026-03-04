import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getBoard, jobBoards } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ScoreBadge } from "@/components/score-badge";
import {
  ArrowLeft,
  ExternalLink,
  Globe,
  MapPin,
  Users,
  Calendar,
  Languages,
  Star,
  Mail,
  Phone,
  Tag,
} from "lucide-react";

export function generateStaticParams() {
  return jobBoards.map((board) => ({ slug: board.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const board = getBoard(params.slug);
  if (!board) return { title: "Not Found" };
  return {
    title: `${board.name} - JobBoard Finder`,
    description: board.siteStatement?.substring(0, 160),
  };
}

export default async function BoardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const board = getBoard(slug);
  if (!board) notFound();

  const logoSrc = board.logoUrl || board.logo;

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
        {/* Hero */}
        <div className="flex flex-col sm:flex-row items-start gap-6 mb-8">
          <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center overflow-hidden border shrink-0">
            {logoSrc ? (
              <Image
                src={logoSrc}
                alt={board.name}
                width={80}
                height={80}
                className="object-contain"
                unoptimized
              />
            ) : (
              <Globe className="w-10 h-10 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  {board.name}
                </h1>
                <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{board.country || "Global"}</span>
                  {board.yearFounded && (
                    <>
                      <span className="mx-1">·</span>
                      <Calendar className="w-4 h-4" />
                      <span>Est. {board.yearFounded}</span>
                    </>
                  )}
                  {board.employees && (
                    <>
                      <span className="mx-1">·</span>
                      <Users className="w-4 h-4" />
                      <span>{board.employees} employees</span>
                    </>
                  )}
                </div>
              </div>
              <ScoreBadge score={board.score} size="lg" />
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              {board.type && <Badge>{board.type}</Badge>}
              {board.scope && board.scope !== board.type && (
                <Badge variant="secondary">{board.scope}</Badge>
              )}
              {board.pricingModel?.map((p) => (
                <Badge
                  key={p}
                  variant="outline"
                  className="border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400"
                >
                  {p}
                </Badge>
              ))}
              {board.specialties?.map((s) => (
                <Badge key={s} variant="outline">
                  {s}
                </Badge>
              ))}
            </div>

            <div className="flex gap-3 mt-5">
              {board.websiteUrl && (
                <Button asChild>
                  <a
                    href={board.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Visit Website
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Site Statement */}
            {board.siteStatement && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">About</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed whitespace-pre-line">
                    {board.siteStatement}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* JBF Opinion */}
            {board.jbfOpinion && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Expert Opinion</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed whitespace-pre-line">
                    {board.jbfOpinion}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Screenshot */}
            {board.screenshotUrl && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Screenshot</CardTitle>
                </CardHeader>
                <CardContent>
                  <Image
                    src={board.screenshotUrl}
                    alt={`${board.name} screenshot`}
                    width={800}
                    height={500}
                    className="rounded-lg border w-full"
                    unoptimized
                  />
                </CardContent>
              </Card>
            )}

            {/* Reviews */}
            {board.reviews && board.reviews.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      Reviews ({board.reviews.length})
                    </CardTitle>
                    {board.globalReviewScore && (
                      <div className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                        <span className="font-semibold text-lg">
                          {board.globalReviewScore}/5
                        </span>
                      </div>
                    )}
                  </div>
                  {board.reviewTags && board.reviewTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {board.reviewTags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          <Tag className="w-3 h-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {board.reviewBreakdown && (
                    <div className="grid grid-cols-5 gap-2 text-center text-xs mb-4">
                      {Object.entries(board.reviewBreakdown).map(
                        ([label, count]) => (
                          <div key={label}>
                            <div className="font-medium text-foreground">
                              {count}
                            </div>
                            <div className="text-muted-foreground">{label}</div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                  <Separator />
                  {board.reviews.map((review, i) => (
                    <div key={i} className="py-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {review.author || "Anonymous"}
                          </span>
                          {review.role && (
                            <Badge variant="outline" className="text-xs">
                              {review.role}
                            </Badge>
                          )}
                        </div>
                        {review.rating && (
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                            <span className="text-sm font-medium">
                              {review.rating}
                            </span>
                          </div>
                        )}
                      </div>
                      {review.comment && (
                        <p className="text-sm text-muted-foreground">
                          {review.comment}
                        </p>
                      )}
                      {review.detailScores && (
                        <div className="flex flex-wrap gap-3 mt-2">
                          {Object.entries(review.detailScores).map(
                            ([key, val]) => (
                              <span
                                key={key}
                                className="text-xs text-muted-foreground"
                              >
                                {key}: {val}/5
                              </span>
                            )
                          )}
                        </div>
                      )}
                      {i < board.reviews.length - 1 && (
                        <Separator className="mt-3" />
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Marketing Activities */}
            {board.marketingActivities && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Marketing Activities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed whitespace-pre-line">
                    {board.marketingActivities}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Additional Info */}
            {board.additionalInfo &&
              Object.keys(board.additionalInfo).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Additional Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {Object.entries(board.additionalInfo).map(([key, val]) => (
                      <div key={key}>
                        <h4 className="font-medium text-sm mb-1">{key}</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-line">
                          {val}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {board.currentJobOffers && (
                  <div>
                    <div className="text-muted-foreground">Current Job Offers</div>
                    <div className="font-semibold text-lg">
                      {parseInt(board.currentJobOffers).toLocaleString()}
                    </div>
                  </div>
                )}
                {board.languages && board.languages.length > 0 && (
                  <div>
                    <div className="text-muted-foreground flex items-center gap-1.5 mb-1">
                      <Languages className="w-4 h-4" />
                      Languages
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {board.languages.map((l) => (
                        <Badge key={l} variant="secondary" className="text-xs">
                          {l}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {board.countriesServed && board.countriesServed.length > 0 && (
                  <div>
                    <div className="text-muted-foreground flex items-center gap-1.5 mb-1">
                      <MapPin className="w-4 h-4" />
                      Countries Served
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {board.countriesServed.map((c) => (
                        <Badge key={c} variant="secondary" className="text-xs">
                          {c}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {board.lastUpdate && (
                  <div>
                    <div className="text-muted-foreground">Last Updated</div>
                    <div>{board.lastUpdate}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contact */}
            {(board.emails?.length > 0 || board.phones?.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {board.emails?.map((email) => (
                    <a
                      key={email}
                      href={`mailto:${email}`}
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <Mail className="w-4 h-4" />
                      {email}
                    </a>
                  ))}
                  {board.phones?.map((phone) => (
                    <div
                      key={phone}
                      className="flex items-center gap-2 text-muted-foreground"
                    >
                      <Phone className="w-4 h-4" />
                      {phone}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Review Detail Scores */}
            {board.reviewDetailScores &&
              Object.keys(board.reviewDetailScores).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Review Scores</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {Object.entries(board.reviewDetailScores).map(
                      ([key, val]) => (
                        <div key={key}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">{key}</span>
                            <span className="font-medium">{val}/5</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${(val / 5) * 100}%` }}
                            />
                          </div>
                        </div>
                      )
                    )}
                  </CardContent>
                </Card>
              )}

            {/* Similar Job Boards */}
            {board.similarJobBoards && board.similarJobBoards.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Similar Job Boards</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {board.similarJobBoards.map((sim) => (
                      <Link key={sim.slug} href={`/board/${sim.slug}`}>
                        <Badge
                          variant="outline"
                          className="cursor-pointer hover:bg-accent"
                        >
                          {sim.name}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
