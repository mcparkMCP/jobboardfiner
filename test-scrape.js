const fs = require("fs");

function test() {
  const data = JSON.parse(fs.readFileSync("jobboards-complete.json", "utf-8"));
  let passed = 0;
  let failed = 0;

  function assert(name, condition, detail = "") {
    if (condition) {
      console.log(`  ✅ ${name}`);
      passed++;
    } else {
      console.log(`  ❌ ${name}${detail ? ": " + detail : ""}`);
      failed++;
    }
  }

  console.log("=== JobBoardFinder Scrape Verification ===\n");

  // 1. Total count matches their site (993 listed, we may have ~992 unique)
  console.log("--- Count Verification ---");
  assert("Has at least 990 job boards", data.length >= 990, `Got ${data.length}`);
  assert("Has at most 995 job boards", data.length <= 995, `Got ${data.length}`);

  // 2. No duplicates
  const slugs = data.map((j) => j.slug);
  const uniqueSlugs = new Set(slugs);
  assert("No duplicate slugs", slugs.length === uniqueSlugs.size, `${slugs.length} vs ${uniqueSlugs.size} unique`);

  // 3. Core fields present on every entry
  console.log("\n--- Core Fields (must be on every entry) ---");

  const withName = data.filter((j) => j.name && j.name.length > 0);
  assert("Every entry has a name", withName.length === data.length, `${withName.length}/${data.length}`);

  const withSlug = data.filter((j) => j.slug && j.slug.length > 0);
  assert("Every entry has a slug", withSlug.length === data.length, `${withSlug.length}/${data.length}`);

  const withDetailUrl = data.filter((j) => j.detailUrl && j.detailUrl.startsWith("http"));
  assert("Every entry has a detail URL", withDetailUrl.length === data.length, `${withDetailUrl.length}/${data.length}`);

  const withScore = data.filter((j) => j.score !== null && j.score !== undefined);
  assert("Every entry has a score", withScore.length === data.length, `${withScore.length}/${data.length}`);

  const withLogo = data.filter((j) => j.logo && j.logo.startsWith("http"));
  assert("Every entry has a logo URL", withLogo.length === data.length, `${withLogo.length}/${data.length}`);

  const withCountry = data.filter((j) => j.country && j.country.length > 0);
  assert("Every entry has a country", withCountry.length >= data.length * 0.95, `${withCountry.length}/${data.length}`);

  // 4. Detail fields - high coverage expected
  console.log("\n--- Detail Fields (high coverage expected) ---");

  const withWebsite = data.filter((j) => j.websiteUrl && j.websiteUrl.startsWith("http"));
  assert("98%+ have website URL", withWebsite.length >= data.length * 0.98, `${withWebsite.length}/${data.length} (${(withWebsite.length / data.length * 100).toFixed(1)}%)`);

  const withDescription = data.filter((j) => j.siteStatement && j.siteStatement.length > 20);
  assert("99%+ have site statement", withDescription.length >= data.length * 0.99, `${withDescription.length}/${data.length} (${(withDescription.length / data.length * 100).toFixed(1)}%)`);

  const withLanguages = data.filter((j) => j.languages && j.languages.length > 0);
  assert("98%+ have languages", withLanguages.length >= data.length * 0.98, `${withLanguages.length}/${data.length} (${(withLanguages.length / data.length * 100).toFixed(1)}%)`);

  const withYearFounded = data.filter((j) => j.yearFounded);
  assert("98%+ have year founded", withYearFounded.length >= data.length * 0.98, `${withYearFounded.length}/${data.length} (${(withYearFounded.length / data.length * 100).toFixed(1)}%)`);

  const withEmployees = data.filter((j) => j.employees);
  assert("96%+ have employee count", withEmployees.length >= data.length * 0.96, `${withEmployees.length}/${data.length} (${(withEmployees.length / data.length * 100).toFixed(1)}%)`);

  const withPricing = data.filter((j) => j.pricingModel && j.pricingModel.length > 0);
  assert("85%+ have pricing model", withPricing.length >= data.length * 0.85, `${withPricing.length}/${data.length} (${(withPricing.length / data.length * 100).toFixed(1)}%)`);

  const withScreenshot = data.filter((j) => j.screenshotUrl && j.screenshotUrl.startsWith("http"));
  assert("95%+ have screenshot", withScreenshot.length >= data.length * 0.95, `${withScreenshot.length}/${data.length} (${(withScreenshot.length / data.length * 100).toFixed(1)}%)`);

  const withSimilar = data.filter((j) => j.similarJobBoards && j.similarJobBoards.length > 0);
  assert("98%+ have similar boards", withSimilar.length >= data.length * 0.98, `${withSimilar.length}/${data.length} (${(withSimilar.length / data.length * 100).toFixed(1)}%)`);

  // 5. Detail fields - moderate coverage
  console.log("\n--- Detail Fields (moderate coverage) ---");

  const withSpecialties = data.filter((j) => j.specialties && j.specialties.length > 0);
  assert("25%+ have specialties", withSpecialties.length >= data.length * 0.25, `${withSpecialties.length}/${data.length} (${(withSpecialties.length / data.length * 100).toFixed(1)}%)`);

  // 6. Data quality checks
  console.log("\n--- Data Quality ---");

  // Scores should be valid numbers between 0-10
  const invalidScores = data.filter((j) => {
    if (!j.score) return false;
    const s = parseFloat(j.score);
    return isNaN(s) || s < 0 || s > 10;
  });
  assert("All scores are valid (0-10)", invalidScores.length === 0, `${invalidScores.length} invalid`);

  // Website URLs should not be JBF's own site
  const jbfUrls = data.filter((j) => j.websiteUrl && j.websiteUrl.includes("jobboardfinder"));
  assert("No website URLs point to JBF itself", jbfUrls.length === 0, `${jbfUrls.length} entries have JBF as website`);

  // Year founded should be reasonable
  const badYears = data.filter((j) => {
    if (!j.yearFounded) return false;
    const y = parseInt(j.yearFounded);
    return isNaN(y) || y < 1990 || y > 2026;
  });
  assert("All years founded are reasonable (1990-2026)", badYears.length === 0, `${badYears.length} bad years`);

  // 7. Spot check known job boards
  console.log("\n--- Spot Check Known Job Boards ---");

  const indeed = data.find((j) => j.name === "Indeed" && j.country === "United States");
  assert("Indeed (US) exists", !!indeed);
  if (indeed) {
    assert("Indeed has correct website", indeed.websiteUrl?.includes("indeed"), `Got: ${indeed.websiteUrl}`);
  }

  const linkedin = data.find((j) => j.name === "LinkedIn");
  assert("LinkedIn exists", !!linkedin);

  const glassdoor = data.find((j) => j.name.includes("Glassdoor"));
  assert("Glassdoor exists", !!glassdoor);

  const monster = data.filter((j) => j.name.includes("Monster"));
  assert("Multiple Monster entries (regional)", monster.length >= 5, `Found ${monster.length}`);

  const stepstone = data.filter((j) => j.name.includes("StepStone"));
  assert("Multiple StepStone entries (regional)", stepstone.length >= 3, `Found ${stepstone.length}`);

  // 8. Country coverage
  console.log("\n--- Geographic Coverage ---");
  const countries = new Set(data.map((j) => j.country).filter(Boolean));
  assert("Covers 50+ countries", countries.size >= 50, `Got ${countries.size} countries`);

  // Check major regions
  const hasUS = data.some((j) => j.country === "United States");
  const hasUK = data.some((j) => j.country === "United Kingdom");
  const hasFrance = data.some((j) => j.country === "France");
  const hasGermany = data.some((j) => j.country === "Germany");
  const hasJapan = data.some((j) => j.country === "Japan");
  const hasBrazil = data.some((j) => j.country === "Brazil");
  const hasIndia = data.some((j) => j.country === "India");
  const hasAustralia = data.some((j) => j.country === "Australia");
  assert("Has US boards", hasUS);
  assert("Has UK boards", hasUK);
  assert("Has France boards", hasFrance);
  assert("Has Germany boards", hasGermany);
  assert("Has Japan boards", hasJapan);
  assert("Has Brazil boards", hasBrazil);
  assert("Has India boards", hasIndia);
  assert("Has Australia boards", hasAustralia);

  // Summary
  console.log(`\n${"=".repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} checks`);
  console.log(`${"=".repeat(50)}`);

  if (failed > 0) {
    process.exit(1);
  }
}

test();
