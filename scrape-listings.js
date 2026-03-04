const { chromium } = require("playwright");
const fs = require("fs");

const BASE = "https://www.jobboardfinder.com";
const RESULTS_PER_PAGE = 100;
const OUTPUT_FILE = "listings.json";

async function scrapeListings() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  // First page to get total count
  console.log("Loading first page to get total count...");
  await page.goto(`${BASE}/search?page=1&nb=${RESULTS_PER_PAGE}`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(2000);

  // Get total count
  const totalText = await page.textContent("body");
  const countMatch = totalText.match(/(\d+)\s+job boards? match/i);
  const totalCount = countMatch ? parseInt(countMatch[1]) : 993;
  const totalPages = Math.ceil(totalCount / RESULTS_PER_PAGE);
  console.log(`Found ${totalCount} job boards across ${totalPages} pages`);

  const allListings = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    console.log(`Scraping page ${pageNum}/${totalPages}...`);

    if (pageNum > 1) {
      await page.goto(`${BASE}/search?page=${pageNum}&nb=${RESULTS_PER_PAGE}`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.waitForTimeout(2000);
    }

    // Extract listings from the page
    const listings = await page.evaluate(() => {
      const results = [];

      // Try multiple selector strategies
      // Strategy 1: Look for links that match the jobboard detail pattern
      const allLinks = document.querySelectorAll('a[href*="/jobboard-"]');
      const seen = new Set();

      for (const link of allLinks) {
        const href = link.getAttribute("href");
        if (!href || seen.has(href) || href.includes("#")) continue;
        if (!href.match(/\/jobboard-[^/]+$/)) continue;
        seen.add(href);

        // Walk up to find the containing card/row
        let container = link.closest("tr, .jobboard-item, .card, [class*='jobboard'], [class*='listing'], [class*='result']");
        if (!container) {
          // Try going up a few levels
          container = link.parentElement?.parentElement?.parentElement?.parentElement || link.parentElement;
        }

        const item = {
          name: link.textContent.trim(),
          detailUrl: href,
          slug: href.replace(/^.*\/jobboard-/, ""),
        };

        // Extract text content from the container
        if (container) {
          const text = container.textContent;

          // Try to extract score
          const scoreEl = container.querySelector('[class*="score"], [class*="rating"]');
          if (scoreEl) item.score = scoreEl.textContent.trim();

          // Try to find the logo
          const img = container.querySelector("img");
          if (img) item.logo = img.src;

          // Extract all spans/cells for structured data
          const spans = container.querySelectorAll("td, span, p, div");
          const textParts = [];
          for (const s of spans) {
            const t = s.textContent.trim();
            if (t && t.length < 200 && t !== item.name) {
              textParts.push(t);
            }
          }
          item.rawTextParts = textParts.slice(0, 20);

          // Look for review count
          const reviewMatch = text.match(/(\d+)\s*reviews?/i);
          if (reviewMatch) item.reviewCount = parseInt(reviewMatch[1]);

          // Look for job offers count
          const offersMatch = text.match(/([\d,]+)\s*job offers?/i);
          if (offersMatch) item.jobOffers = offersMatch[1].replace(/,/g, "");

          // Country - often the first location-like text
          const countryMatch = text.match(/(National|Multi countries|Regional)/i);
          if (countryMatch) item.scope = countryMatch[1];
        }

        results.push(item);
      }

      return results;
    });

    console.log(`  Found ${listings.length} listings on page ${pageNum}`);
    allListings.push(...listings);

    // Be polite - wait between requests
    if (pageNum < totalPages) {
      await page.waitForTimeout(1500 + Math.random() * 1500);
    }
  }

  console.log(`\nTotal listings scraped: ${allListings.length}`);

  // Deduplicate by slug
  const uniqueMap = new Map();
  for (const item of allListings) {
    if (!uniqueMap.has(item.slug)) {
      uniqueMap.set(item.slug, item);
    }
  }
  const unique = Array.from(uniqueMap.values());
  console.log(`Unique listings: ${unique.length}`);

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(unique, null, 2));
  console.log(`Saved to ${OUTPUT_FILE}`);

  await browser.close();
}

scrapeListings().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
