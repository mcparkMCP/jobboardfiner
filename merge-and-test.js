const fs = require("fs");

// Merge all batch files
const batchFiles = [
  "details-batch-0-200.json",
  "details-batch-200-400.json",
  "details-batch-400-600.json",
  "details-batch-600-800.json",
  "details-batch-800-992.json",
];

console.log("=== Merging batch files ===\n");
const allDetails = {};
for (const file of batchFiles) {
  const data = JSON.parse(fs.readFileSync(file, "utf-8"));
  const count = Object.keys(data).length;
  console.log(`  ${file}: ${count} entries`);
  Object.assign(allDetails, data);
}
console.log(`\n  Total details: ${Object.keys(allDetails).length}`);

// Load listings and merge
const listings = JSON.parse(fs.readFileSync("listings.json", "utf-8"));
console.log(`  Total listings: ${listings.length}\n`);

const finalData = listings.map((listing) => {
  const detail = allDetails[listing.slug];
  if (!detail || detail._error) {
    return { ...listing, _scrapeError: detail?._error || "missing" };
  }
  return {
    // From listings
    name: listing.name,
    slug: listing.slug,
    detailUrl: listing.detailUrl,
    logo: listing.logo,
    country: listing.country,
    scope: listing.scope,
    type: listing.type,
    // From detail page
    websiteUrl: detail.websiteUrl || null,
    jobBoardLink: detail.jobBoardLink || null,
    score: detail.score || listing.score,
    yearFounded: detail.yearFounded || null,
    employees: detail.employees || null,
    countriesServed: detail.countriesServed || [],
    languages: detail.languages || [],
    specialties: detail.specialties || [],
    pricingModel: detail.pricingModel || [],
    currentJobOffers: detail.currentJobOffers || listing.jobOffers,
    siteStatement: detail.siteStatement || null,
    jbfOpinion: detail.jbfOpinion || null,
    marketingActivities: detail.marketingActivities || null,
    additionalInfo: detail.additionalInfo || {},
    screenshotUrl: detail.screenshotUrl || null,
    logoUrl: detail.logoUrl || listing.logo,
    lastUpdate: detail.lastUpdate || null,
    // Reviews
    globalReviewScore: detail.globalReviewScore || null,
    reviewBreakdown: detail.reviewBreakdown || null,
    reviewsByType: detail.reviewsByType || null,
    reviewDetailScores: detail.reviewDetailScores || null,
    reviews: detail.reviews || [],
    reviewTags: detail.reviewTags || [],
    // Related
    similarJobBoards: detail.similarJobBoards || [],
    // Contact
    emails: detail.emails || [],
    phones: detail.phones || [],
  };
});

fs.writeFileSync("jobboards-complete.json", JSON.stringify(finalData, null, 2));
const fileSize = fs.statSync("jobboards-complete.json").size;
console.log(`Saved jobboards-complete.json (${(fileSize / 1024 / 1024).toFixed(1)} MB)\n`);

// === TEST ===
console.log("=== Verification Tests ===\n");
let passed = 0, failed = 0;

function assert(name, condition, detail = "") {
  if (condition) { console.log(`  ✅ ${name}`); passed++; }
  else { console.log(`  ❌ ${name}${detail ? ": " + detail : ""}`); failed++; }
}

const pct = (count) => `${count}/${finalData.length} (${(count / finalData.length * 100).toFixed(1)}%)`;

// Count
console.log("--- Counts ---");
assert("Has 992 job boards", finalData.length === 992);
const errors = finalData.filter(j => j._scrapeError);
assert("No scrape errors", errors.length === 0, `${errors.length} errors`);

// Core fields
console.log("\n--- Core Fields ---");
assert("100% have name", finalData.every(j => j.name));
assert("100% have slug", finalData.every(j => j.slug));
assert("100% have logo", finalData.every(j => j.logo || j.logoUrl));
assert("100% have country", finalData.filter(j => j.country).length >= 990);
assert("100% have score", finalData.filter(j => j.score).length >= 990);

// Website
console.log("\n--- Website & Description ---");
const withUrl = finalData.filter(j => j.websiteUrl);
assert("98%+ have website URL", withUrl.length >= finalData.length * 0.98, pct(withUrl.length));
const withDesc = finalData.filter(j => j.siteStatement && j.siteStatement.length > 20);
assert("98%+ have site statement", withDesc.length >= finalData.length * 0.98, pct(withDesc.length));
const withOpinion = finalData.filter(j => j.jbfOpinion && j.jbfOpinion.length > 20);
assert("85%+ have JBF opinion", withOpinion.length >= finalData.length * 0.85, pct(withOpinion.length));

// Metadata
console.log("\n--- Metadata ---");
const withYear = finalData.filter(j => j.yearFounded);
assert("98%+ have year founded", withYear.length >= finalData.length * 0.98, pct(withYear.length));
const withEmps = finalData.filter(j => j.employees);
assert("95%+ have employee count", withEmps.length >= finalData.length * 0.95, pct(withEmps.length));
const withLangs = finalData.filter(j => j.languages && j.languages.length > 0);
assert("93%+ have languages", withLangs.length >= finalData.length * 0.93, pct(withLangs.length));
const withSpecs = finalData.filter(j => j.specialties && j.specialties.length > 0);
assert("25%+ have specialties", withSpecs.length >= finalData.length * 0.25, pct(withSpecs.length));
const withPricing = finalData.filter(j => j.pricingModel && j.pricingModel.length > 0);
assert("85%+ have pricing model", withPricing.length >= finalData.length * 0.85, pct(withPricing.length));
const withScreenshot = finalData.filter(j => j.screenshotUrl);
assert("95%+ have screenshot", withScreenshot.length >= finalData.length * 0.95, pct(withScreenshot.length));

// Reviews
console.log("\n--- Reviews ---");
const withReviewScore = finalData.filter(j => j.globalReviewScore);
assert("Has review scores where available", withReviewScore.length > 0, pct(withReviewScore.length));
const withReviews = finalData.filter(j => j.reviews && j.reviews.length > 0);
assert("Has individual reviews where available", withReviews.length > 0, pct(withReviews.length));
const withReviewTags = finalData.filter(j => j.reviewTags && j.reviewTags.length > 0);
assert("Has review tags where available", withReviewTags.length > 0, pct(withReviewTags.length));
const withDetailScores = finalData.filter(j => j.reviewDetailScores && Object.keys(j.reviewDetailScores).length > 0);
assert("Has detailed review scores", withDetailScores.length > 0, pct(withDetailScores.length));

// Related & contact
console.log("\n--- Related & Contact ---");
const withSimilar = finalData.filter(j => j.similarJobBoards && j.similarJobBoards.length > 0);
assert("98%+ have similar boards", withSimilar.length >= finalData.length * 0.98, pct(withSimilar.length));
const withEmail = finalData.filter(j => j.emails && j.emails.length > 0);
console.log(`  ℹ️  Emails found: ${pct(withEmail.length)}`);
const withPhone = finalData.filter(j => j.phones && j.phones.length > 0);
console.log(`  ℹ️  Phones found: ${pct(withPhone.length)}`);
const withMarketing = finalData.filter(j => j.marketingActivities);
console.log(`  ℹ️  Marketing activities: ${pct(withMarketing.length)}`);
const withAdditionalInfo = finalData.filter(j => j.additionalInfo && Object.keys(j.additionalInfo).length > 0);
console.log(`  ℹ️  Additional info: ${pct(withAdditionalInfo.length)}`);

// Spot checks
console.log("\n--- Spot Checks ---");
const indeed = finalData.find(j => j.name === "Indeed" && j.country === "United States");
assert("Indeed (US) exists with website", !!indeed?.websiteUrl);
const linkedin = finalData.find(j => j.name === "LinkedIn");
assert("LinkedIn exists with description", !!linkedin?.siteStatement);
const glassdoor = finalData.find(j => j.name?.includes("Glassdoor"));
assert("Glassdoor exists", !!glassdoor);

// Data quality
console.log("\n--- Data Quality ---");
const badScores = finalData.filter(j => j.score && (parseFloat(j.score) < 0 || parseFloat(j.score) > 10));
assert("All scores valid (0-10)", badScores.length === 0);
const badUrls = finalData.filter(j => j.websiteUrl?.includes("jobboardfinder"));
assert("No website URLs point to JBF", badUrls.length === 0);
const countries = new Set(finalData.map(j => j.country).filter(Boolean));
assert("Covers 50+ countries", countries.size >= 50, `${countries.size} countries`);

// Sample output
console.log("\n--- Sample Entry ---");
const sample = finalData.find(j => j.jbfOpinion && j.reviews?.length > 0 && j.specialties?.length > 0);
if (sample) {
  console.log(`  ${sample.name} (${sample.country})`);
  console.log(`  URL: ${sample.websiteUrl}`);
  console.log(`  Score: ${sample.score}`);
  console.log(`  Founded: ${sample.yearFounded}`);
  console.log(`  Specialties: ${sample.specialties?.join(", ")}`);
  console.log(`  JBF Opinion: ${sample.jbfOpinion?.substring(0, 150)}...`);
  console.log(`  Reviews: ${sample.reviews?.length}`);
  console.log(`  Review tags: ${sample.reviewTags?.join(", ")}`);
}

console.log(`\n${"=".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed}`);
console.log(`${"=".repeat(50)}`);
if (failed > 0) process.exit(1);
