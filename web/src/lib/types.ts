export interface JobBoard {
  name: string;
  slug: string;
  detailUrl: string;
  logo: string;
  country: string;
  scope: string;
  type: string;
  websiteUrl: string | null;
  jobBoardLink: string | null;
  score: string | null;
  yearFounded: string | null;
  employees: string | null;
  countriesServed: string[];
  languages: string[];
  specialties: string[];
  pricingModel: string[];
  currentJobOffers: string | null;
  siteStatement: string | null;
  jbfOpinion: string | null;
  marketingActivities: string | null;
  additionalInfo: Record<string, string>;
  screenshotUrl: string | null;
  logoUrl: string | null;
  lastUpdate: string | null;
  globalReviewScore: string | null;
  reviewBreakdown: Record<string, number> | null;
  reviewsByType: Record<string, number> | null;
  reviewDetailScores: Record<string, number> | null;
  reviews: Review[];
  reviewTags: string[];
  similarJobBoards: SimilarBoard[];
  emails: string[];
  phones: string[];
  _scrapeError?: string;
}

export interface Review {
  rating: number | null;
  author: string | null;
  role: string | null;
  comment: string | null;
  detailScores: Record<string, number> | null;
}

export interface SimilarBoard {
  name: string;
  slug: string;
}
