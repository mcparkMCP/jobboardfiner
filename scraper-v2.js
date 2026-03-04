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

    const nameLink = $card.find("h3 a").first();
    const name = nameLink.text().trim();
    const detailPath = nameLink.attr("href") || "";

    if (!name || !detailPath.includes("/jobboard-")) return;

    const logoImg = $card.find("img.center, img[title]").first();
    const logo = logoImg.attr("src") || "";
    const country = $card.find(".country-name").text().trim();

    const scopeText = $card
      .find(".col-sm-7.col-md-7 strong.size16")
      .first()
      .text()
      .trim();
    const typeStrongs = $card.find(".col-sm-7.col-md-7 strong.size16");
    const type = typeStrongs.length > 1 ? typeStrongs.eq(1).text().trim() : "";

    const score = $card.find(".score").text().trim();

    const reviewText = $card.find(".go-to-profile").text().trim();
    const reviewMatch = reviewText.match(/(\d+)\s*reviews?/i);
    const reviewCount = reviewMatch ? parseInt(reviewMatch[1]) : 0;

    const visitorText = $card.find(".col-sm-5.col-md-5.size16").text().trim();
    const visitorMatch = visitorText.match(/([\d,]+)\s*visitors/i);
    const visitors = visitorMatch ? visitorMatch[1].replace(/,/g, "") : null;

    const offersMatch = $card.text().match(/([\d,]+)\s*job offers?/i);
    const jobOffers = offersMatch ? offersMatch[1].replace(/,/g, "") : null;

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
      visitors,
      jobOffers,
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

    if (!response || response.status() !== 200) return null;
    await page.waitForTimeout(1500);

    // Check if we got redirected to homepage (job board not found)
    const currentUrl = page.url();
    if (!currentUrl.includes("/jobboard-")) {
      return { error: "redirected_to_homepage" };
    }

    const data = await page.evaluate(() => {
      const result = {};

      // Name
      const h1 = document.querySelector("h1");
      result.name = h1 ? h1.textContent.trim() : "";

      // Website URL - from the header link
      const redirectLink = document.querySelector('#header a.redirect[target="_blank"]');
      if (redirectLink) {
        result.websiteUrl = redirectLink.getAttribute("href");
      }

      // Score
      const scoreEl = document.querySelector(".btn-mark");
      if (scoreEl) {
        const match = scoreEl.textContent.match(/([\d.]+)/);
        result.score = match ? match[1] : null;
      }

      // Type & Scope from the header
      const typeEl = document.querySelector(".uppercase.italic.grey.size14");
      if (typeEl) {
        result.typeScope = typeEl.textContent.trim();
      }

      // Foundation year
      const bodyText = document.body.innerHTML;
      const foundMatch = bodyText.match(/Foundation[^:]*:\s*<\/span>\s*<span>(\d{4})/i);
      result.yearFounded = foundMatch ? foundMatch[1] : null;

      // Number of employees
      const empMatch = bodyText.match(/Nb of employees[^:]*:\s*<\/span>\s*<span>([\d\-+]+)/i);
      result.employees = empMatch ? empMatch[1] : null;

      // Countries served
      const countrySection = document.querySelector("#header .col-md-5");
      if (countrySection) {
        const countryMatch = countrySection.innerHTML.match(/Multi countries\s*:\s*<\/strong>\s*([^<]+)/);
        if (countryMatch) {
          result.countriesServed = countryMatch[1].trim().split(/\s{2,}/).map(c => c.trim()).filter(Boolean);
        }
      }

      // Languages
      const langMatch = bodyText.match(/Site Languages[^:]*:\s*<\/span>\s*<span>\s*([^<]+)/i);
      if (langMatch) {
        result.languages = langMatch[1].trim().split(/\s{2,}/).map(l => l.trim()).filter(Boolean);
      }

      // Specialties
      const specMatch = bodyText.match(/Specialities[^:]*:\s*<\/span>\s*<span>\s*([\s\S]*?)<\/span>/i);
      if (specMatch) {
        result.specialties = specMatch[1]
          .replace(/<br\s*\/?>/g, "|")
          .replace(/<[^>]+>/g, "")
          .split("|")
          .map(s => s.trim())
          .filter(Boolean);
      }

      // Pricing model (free/chargeable)
      const feesUl = document.querySelector("ul.label-fees");
      if (feesUl) {
        result.pricingModel = Array.from(feesUl.querySelectorAll("li"))
          .map(li => li.textContent.trim())
          .filter(Boolean);
      }

      // Job offers count
      const offersLink = document.querySelector('a[href="#contents"] .size30');
      if (offersLink) {
        result.currentJobOffers = offersLink.textContent.trim();
      }

      // Site statement (their own description)
      const siteStatement = document.querySelector("#positioning .justify");
      if (siteStatement) {
        result.siteStatement = siteStatement.textContent.trim();
      }

      // JBF opinion
      const jbfOpinion = document.querySelector("#sitestatement .justify");
      if (jbfOpinion) {
        result.jbfOpinion = jbfOpinion.textContent.trim();
      }

      // Screenshot
      const screenshot = document.querySelector("img.printscreen_fond");
      if (screenshot) {
        result.screenshotUrl = screenshot.src;
      }

      // Logo
      const logo = document.querySelector('#header a.redirect img');
      if (logo) {
        result.logoUrl = logo.src;
      }

      // Reviews
      const reviewDivs = document.querySelectorAll(".div-review");
      result.reviews = Array.from(reviewDivs).map(rev => {
        const ratingEl = rev.querySelector("[data-score]");
        const textEl = rev.querySelector("p, .review-text, .col-md-8");
        const authorEl = rev.querySelector("strong, .bold");
        return {
          rating: ratingEl ? ratingEl.getAttribute("data-score") : null,
          text: textEl ? textEl.textContent.trim().substring(0, 500) : "",
          author: authorEl ? authorEl.textContent.trim() : "",
        };
      }).filter(r => r.text.length > 5);

      // Info section
      const infoSection = document.querySelector("#info");
      if (infoSection) {
        const infoBlocks = infoSection.querySelectorAll(".block_grey-sub-block, .block_grey-sub-block-nor-border");
        result.additionalInfo = {};
        for (const block of infoBlocks) {
          const title = block.querySelector(".block-title, h3, strong");
          const content = block.querySelector(".block-content, .blockview_content, p");
          if (title && content) {
            const key = title.textContent.trim();
            const val = content.textContent.trim();
            if (key && val && val !== "Sign up to access this feature, it's FREE!") {
              result.additionalInfo[key] = val;
            }
          }
        }
      }

      // Similar job boards
      const similarSection = document.querySelector("#similar-jobboards");
      if (similarSection) {
        const simLinks = similarSection.querySelectorAll("a.btn[href*='/jobboard-']");
        result.similarJobBoards = Array.from(simLinks).map(a => ({
          name: a.textContent.replace("Discover ", "").trim(),
          url: a.getAttribute("href"),
        }));
      }

      // Contact email from body text
      const emailMatch = document.body.textContent.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
      if (emailMatch && !emailMatch[0].includes("jobboardfinder")) {
        result.contactEmail = emailMatch[0];
      }

      return result;
    });

    return data;
  } catch (err) {
    console.log(`    Error: ${err.message}`);
    return null;
  }
}

async function main() {
  console.log("=== JobBoardFinder Scraper v2 ===\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  // Phase 1: Get all listings (check if we already have them)
  let allListings = [];
  try {
    allListings = JSON.parse(fs.readFileSync("listings.json", "utf-8"));
    console.log(`Phase 1: Loaded ${allListings.length} listings from cache\n`);
  } catch {
    console.log("Phase 1: Scraping listing pages...");
    const listingPage = await context.newPage();
    await listingPage.goto(`${BASE}/search`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await listingPage.waitForTimeout(2000);

    const csrfToken = await getCsrfToken(listingPage);
    console.log(`CSRF Token: ${csrfToken?.substring(0, 10)}...`);

    const countText = await listingPage.textContent("body");
    const countMatch = countText.match(/(\d+)\s+job boards? match/i);
    const totalCount = countMatch ? parseInt(countMatch[1]) : 993;
    const totalPages = Math.ceil(totalCount / PER_PAGE);
    console.log(`Total: ${totalCount} job boards, ${totalPages} pages\n`);

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      console.log(`  Page ${pageNum}/${totalPages}...`);
      const html = await scrapeListingPage(listingPage, csrfToken, pageNum);
      const listings = parseListings(html);
      console.log(`    Found ${listings.length} listings`);
      allListings.push(...listings);

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
    await listingPage.close();
  }

  // Phase 2: Scrape detail pages
  console.log("Phase 2: Scraping detail pages...");

  let detailData = {};
  try {
    detailData = JSON.parse(fs.readFileSync("details-v2.json", "utf-8"));
    console.log(`  Resuming from ${Object.keys(detailData).length} already scraped\n`);
  } catch {}

  const detailPage = await context.newPage();
  let scraped = 0;
  const total = allListings.length;
  let errors = 0;

  for (const listing of allListings) {
    scraped++;

    if (detailData[listing.slug]) {
      if (scraped % 50 === 0) {
        console.log(`  [${scraped}/${total}] Skipping (already done)`);
      }
      continue;
    }

    console.log(`  [${scraped}/${total}] ${listing.name}...`);
    const detail = await scrapeDetailPage(detailPage, listing.detailUrl);

    if (detail) {
      detailData[listing.slug] = detail;
    } else {
      errors++;
      detailData[listing.slug] = { error: "failed_to_scrape" };
    }

    // Save progress every 20
    if (scraped % 20 === 0) {
      fs.writeFileSync("details-v2.json", JSON.stringify(detailData, null, 2));
      console.log(`    [Progress saved: ${Object.keys(detailData).length} details, ${errors} errors]`);
    }

    // Polite delay
    await detailPage.waitForTimeout(600 + Math.random() * 900);
  }

  // Final save of details
  fs.writeFileSync("details-v2.json", JSON.stringify(detailData, null, 2));

  // Phase 3: Merge
  console.log("\nPhase 3: Merging data...");
  const finalData = allListings.map((listing) => {
    const detail = detailData[listing.slug] || {};
    if (detail.error) {
      return { ...listing, _scrapeError: detail.error };
    }
    return {
      ...listing,
      websiteUrl: detail.websiteUrl || null,
      yearFounded: detail.yearFounded || null,
      employees: detail.employees || null,
      countriesServed: detail.countriesServed || [],
      languages: detail.languages || [],
      specialties: detail.specialties || [],
      pricingModel: detail.pricingModel || [],
      currentJobOffers: detail.currentJobOffers || listing.jobOffers,
      siteStatement: detail.siteStatement || null,
      jbfOpinion: detail.jbfOpinion || null,
      screenshotUrl: detail.screenshotUrl || null,
      reviews: detail.reviews || [],
      additionalInfo: detail.additionalInfo || {},
      similarJobBoards: detail.similarJobBoards || [],
      contactEmail: detail.contactEmail || null,
    };
  });

  fs.writeFileSync("jobboards-complete.json", JSON.stringify(finalData, null, 2));

  // Stats
  const withUrl = finalData.filter((j) => j.websiteUrl).length;
  const withDesc = finalData.filter((j) => j.siteStatement).length;
  const withSpecialties = finalData.filter((j) => j.specialties?.length > 0).length;
  const withReviews = finalData.filter((j) => j.reviews?.length > 0).length;
  const withErrors = finalData.filter((j) => j._scrapeError).length;

  console.log(`\n=== Final Stats ===`);
  console.log(`Total job boards: ${finalData.length}`);
  console.log(`With website URL: ${withUrl}`);
  console.log(`With description: ${withDesc}`);
  console.log(`With specialties: ${withSpecialties}`);
  console.log(`With reviews: ${withReviews}`);
  console.log(`Scrape errors: ${withErrors}`);
  console.log(`\nSaved to jobboards-complete.json`);

  await browser.close();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
