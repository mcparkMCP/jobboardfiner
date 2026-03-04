const { chromium } = require("playwright");
const cheerio = require("cheerio");
const fs = require("fs");

const BASE = "https://www.jobboardfinder.com";
const PER_PAGE = 50;

async function getCsrfToken(page) {
  return page.evaluate(() => {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta?.getAttribute("content");
  });
}

async function scrapeListingPage(page, csrfToken, pageNum) {
  const formData = new URLSearchParams({
    csrf_token: csrfToken,
    search_keyword: "",
    clear_search: "0",
    page: String(pageNum),
    search_reviews: "",
    search_ranking: "",
    per_page: String(PER_PAGE),
    sort: "ranking",
    order: "desc",
  });

  const response = await page.evaluate(
    async ({ url, body, token }) => {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-Requested-With": "XMLHttpRequest",
          "X-CSRF-TOKEN": token,
        },
        body,
        credentials: "same-origin",
      });
      return res.text();
    },
    { url: `${BASE}/search`, body: formData.toString(), token: csrfToken }
  );

  return response;
}

function parseListings(html) {
  const $ = cheerio.load(html);
  const listings = [];

  $(".equalheight-parent.border-card").each((_, card) => {
    const $card = $(card);

    // Name and URL
    const nameLink = $card.find("h3 a").first();
    const name = nameLink.text().trim();
    const detailPath = nameLink.attr("href") || "";

    if (!name || !detailPath.includes("/jobboard-")) return;

    // Logo
    const logoImg = $card.find("img.center, img[title]").first();
    const logo = logoImg.attr("src") || "";

    // Country
    const country = $card.find(".country-name").text().trim();

    // Scope (National / Multi countries)
    const scopeText = $card.find(".col-sm-7.col-md-7 strong.size16").first().text().trim();

    // Type (Generalist / Specialist)
    const typeStrongs = $card.find(".col-sm-7.col-md-7 strong.size16");
    const type = typeStrongs.length > 1 ? typeStrongs.eq(1).text().trim() : "";

    // Score
    const score = $card.find(".score").text().trim();

    // Reviews
    const reviewText = $card.find(".go-to-profile").text().trim();
    const reviewMatch = reviewText.match(/(\d+)\s*reviews?/i);
    const reviewCount = reviewMatch ? parseInt(reviewMatch[1]) : 0;

    // Visitors
    const visitorText = $card.find(".col-sm-5.col-md-5.size16").text().trim();
    const visitorMatch = visitorText.match(/([\d,]+)\s*visitors/i);
    const visitors = visitorMatch ? visitorMatch[1].replace(/,/g, "") : "";

    // Description
    const descEl = $card.find(".size12.italic p, .size12.italic").first();
    const description = descEl.text().replace(/see more$/i, "").trim();

    // Job offers
    const offersMatch = $card.text().match(/([\d,]+)\s*job offers?/i);
    const jobOffers = offersMatch ? offersMatch[1].replace(/,/g, "") : "";

    // Last updated
    const updatedMatch = $card.text().match(/updated\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i);
    const lastUpdated = updatedMatch ? updatedMatch[1] : "";

    // Specializations
    const specMatch = $card.text().match(/specializations?\s*:?\s*([^\n]+)/i);

    const slug = detailPath.replace(/^.*\/jobboard-/, "");

    listings.push({
      name,
      slug,
      detailUrl: detailPath.startsWith("http") ? detailPath : `${BASE}${detailPath}`,
      logo: logo.startsWith("http") ? logo : logo ? `${BASE}${logo}` : "",
      country,
      scope: scopeText,
      type,
      score: score || null,
      reviewCount,
      visitors: visitors || null,
      jobOffers: jobOffers || null,
      lastUpdated: lastUpdated || null,
      description,
    });
  });

  return listings;
}

async function scrapeDetailPage(page, url) {
  try {
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });

    if (!response || response.status() !== 200) {
      console.log(`    Skipping ${url} (status: ${response?.status()})`);
      return null;
    }

    await page.waitForTimeout(1000);

    const data = await page.evaluate(() => {
      const getText = (sel) => {
        const el = document.querySelector(sel);
        return el ? el.textContent.trim() : "";
      };
      const getAll = (sel) => {
        return Array.from(document.querySelectorAll(sel)).map((el) =>
          el.textContent.trim()
        );
      };

      // Website URL
      const websiteLink = document.querySelector('a[target="_blank"][href*="http"]');
      let websiteUrl = "";
      if (websiteLink) {
        const href = websiteLink.getAttribute("href");
        if (href && !href.includes("jobboardfinder") && !href.includes("google") && !href.includes("facebook") && !href.includes("twitter") && !href.includes("linkedin.com/company")) {
          websiteUrl = href;
        }
      }
      // Try all external links
      if (!websiteUrl) {
        const allLinks = document.querySelectorAll('a[target="_blank"]');
        for (const link of allLinks) {
          const href = link.getAttribute("href");
          if (href && href.startsWith("http") && !href.includes("jobboardfinder") && !href.includes("google") && !href.includes("facebook.com") && !href.includes("twitter.com") && !href.includes("linkedin.com") && !href.includes("analytics") && !href.includes("piwik")) {
            websiteUrl = href;
            break;
          }
        }
      }

      // Description
      const descEls = document.querySelectorAll(".col-sm-9 p, .col-md-9 p, .description p, #description p");
      let fullDescription = "";
      for (const el of descEls) {
        const t = el.textContent.trim();
        if (t.length > 30) {
          fullDescription += (fullDescription ? "\n" : "") + t;
        }
      }
      // Fallback: look for the main content area
      if (!fullDescription) {
        const paras = document.querySelectorAll("p");
        for (const p of paras) {
          const t = p.textContent.trim();
          if (t.length > 100 && !t.includes("cookie") && !t.includes("Cookie")) {
            fullDescription = t;
            break;
          }
        }
      }

      // Specializations
      const specs = [];
      const specLabels = document.querySelectorAll('.label, .badge, [class*="spec"]');
      for (const label of specLabels) {
        const t = label.textContent.trim();
        if (t.length > 2 && t.length < 50) specs.push(t);
      }

      // Pricing section
      const pricingSection = document.querySelector('#pricing, [id*="pricing"], [class*="pricing"]');
      let pricing = {};
      if (pricingSection) {
        const rows = pricingSection.querySelectorAll("tr");
        for (const row of rows) {
          const cells = row.querySelectorAll("td, th");
          if (cells.length >= 2) {
            const key = cells[0].textContent.trim();
            const val = cells[1].textContent.trim();
            if (key && val) pricing[key] = val;
          }
        }
        if (Object.keys(pricing).length === 0) {
          pricing = { raw: pricingSection.textContent.trim().substring(0, 500) };
        }
      }

      // Audience section
      const audienceSection = document.querySelector('#audience, [id*="audience"], [class*="audience"]');
      let audience = {};
      if (audienceSection) {
        const rows = audienceSection.querySelectorAll("tr");
        for (const row of rows) {
          const cells = row.querySelectorAll("td, th");
          if (cells.length >= 2) {
            const key = cells[0].textContent.trim();
            const val = cells[1].textContent.trim();
            if (key && val) audience[key] = val;
          }
        }
        if (Object.keys(audience).length === 0) {
          audience = { raw: audienceSection.textContent.trim().substring(0, 500) };
        }
      }

      // Reviews
      const reviews = [];
      const reviewEls = document.querySelectorAll('[class*="review"], .comment, .testimonial');
      for (const rev of reviewEls) {
        const text = rev.textContent.trim();
        if (text.length > 20 && text.length < 2000) {
          reviews.push(text.substring(0, 500));
        }
      }

      // Languages
      const languages = [];
      const langSection = document.querySelector('[class*="lang"]');
      if (langSection) {
        const flags = langSection.querySelectorAll("img, span");
        for (const f of flags) {
          const t = f.getAttribute("title") || f.textContent.trim();
          if (t && t.length < 30) languages.push(t);
        }
      }

      // Countries served
      const countries = [];
      const countryEls = document.querySelectorAll(".country-name, .corail");
      for (const c of countryEls) {
        const t = c.textContent.trim();
        if (t && !countries.includes(t)) countries.push(t);
      }

      // Social links
      const socialLinks = {};
      const socials = document.querySelectorAll('a[href*="facebook.com"], a[href*="twitter.com"], a[href*="linkedin.com/company"], a[href*="instagram.com"]');
      for (const s of socials) {
        const href = s.getAttribute("href");
        if (href.includes("facebook")) socialLinks.facebook = href;
        if (href.includes("twitter")) socialLinks.twitter = href;
        if (href.includes("linkedin")) socialLinks.linkedin = href;
        if (href.includes("instagram")) socialLinks.instagram = href;
      }

      // Full page text for extraction
      const bodyText = document.body.textContent;

      // Year founded
      const foundedMatch = bodyText.match(/(?:founded|created|established|since)\s*(?:in\s*)?(\d{4})/i);

      // Contact info
      const emailMatch = bodyText.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);

      return {
        websiteUrl,
        fullDescription,
        specializations: [...new Set(specs)],
        pricing,
        audience,
        reviews: reviews.slice(0, 10),
        languages,
        countries,
        socialLinks,
        yearFounded: foundedMatch ? foundedMatch[1] : null,
        contactEmail: emailMatch ? emailMatch[0] : null,
      };
    });

    return data;
  } catch (err) {
    console.log(`    Error scraping ${url}: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log("=== JobBoardFinder Scraper ===\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  // Phase 1: Get all listings
  console.log("Phase 1: Scraping listing pages...");
  const listingPage = await context.newPage();
  await listingPage.goto(`${BASE}/search`, {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await listingPage.waitForTimeout(2000);

  const csrfToken = await getCsrfToken(listingPage);
  console.log(`CSRF Token: ${csrfToken?.substring(0, 10)}...`);

  // Get total count
  const countText = await listingPage.textContent("body");
  const countMatch = countText.match(/(\d+)\s+job boards? match/i);
  const totalCount = countMatch ? parseInt(countMatch[1]) : 993;
  const totalPages = Math.ceil(totalCount / PER_PAGE);
  console.log(`Total: ${totalCount} job boards, ${totalPages} pages\n`);

  let allListings = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    console.log(`  Page ${pageNum}/${totalPages}...`);
    const html = await scrapeListingPage(listingPage, csrfToken, pageNum);
    const listings = parseListings(html);
    console.log(`    Found ${listings.length} listings`);
    allListings.push(...listings);

    // Save progress
    fs.writeFileSync("listings-progress.json", JSON.stringify(allListings, null, 2));

    if (pageNum < totalPages) {
      await listingPage.waitForTimeout(1000 + Math.random() * 1000);
    }
  }

  // Deduplicate
  const uniqueMap = new Map();
  for (const item of allListings) {
    if (!uniqueMap.has(item.slug)) {
      uniqueMap.set(item.slug, item);
    }
  }
  allListings = Array.from(uniqueMap.values());
  console.log(`\nPhase 1 complete: ${allListings.length} unique listings\n`);
  fs.writeFileSync("listings.json", JSON.stringify(allListings, null, 2));

  // Phase 2: Scrape detail pages
  console.log("Phase 2: Scraping detail pages...");

  // Load existing progress if any
  let detailData = {};
  try {
    detailData = JSON.parse(fs.readFileSync("details-progress.json", "utf-8"));
    console.log(`  Resuming from ${Object.keys(detailData).length} already scraped\n`);
  } catch {}

  const detailPage = await context.newPage();
  let scraped = 0;
  const total = allListings.length;

  for (const listing of allListings) {
    scraped++;

    if (detailData[listing.slug]) {
      console.log(`  [${scraped}/${total}] Skipping ${listing.name} (already done)`);
      continue;
    }

    console.log(`  [${scraped}/${total}] ${listing.name}...`);
    const detail = await scrapeDetailPage(detailPage, listing.detailUrl);

    if (detail) {
      detailData[listing.slug] = detail;
    }

    // Save progress every 10
    if (scraped % 10 === 0) {
      fs.writeFileSync("details-progress.json", JSON.stringify(detailData, null, 2));
      console.log(`    (Progress saved: ${Object.keys(detailData).length} details)`);
    }

    // Be polite
    await detailPage.waitForTimeout(800 + Math.random() * 1200);
  }

  // Save final details
  fs.writeFileSync("details-progress.json", JSON.stringify(detailData, null, 2));

  // Phase 3: Merge everything
  console.log("\nPhase 3: Merging data...");
  const finalData = allListings.map((listing) => {
    const detail = detailData[listing.slug] || {};
    return {
      ...listing,
      ...detail,
    };
  });

  fs.writeFileSync("jobboards-complete.json", JSON.stringify(finalData, null, 2));
  console.log(`\nDone! ${finalData.length} job boards saved to jobboards-complete.json`);

  await browser.close();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
