// Re-scrape detail pages with fixed selectors
// Usage: node rescrape-batch.js <start> <end>
// e.g. node rescrape-batch.js 0 200

const { chromium } = require("playwright");
const fs = require("fs");

const BATCH_START = parseInt(process.argv[2] || "0");
const BATCH_END = parseInt(process.argv[3] || "200");
const OUTPUT_FILE = `details-batch-${BATCH_START}-${BATCH_END}.json`;

async function scrapeDetail(page, url) {
  try {
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });
    if (!response || response.status() !== 200) return null;
    await page.waitForTimeout(1200);

    const currentUrl = page.url();
    if (!currentUrl.includes("/jobboard-")) {
      return { _error: "redirected" };
    }

    return await page.evaluate(() => {
      const r = {};

      // === HEADER SECTION ===
      const h1 = document.querySelector("h1");
      r.name = h1 ? h1.textContent.trim() : "";

      // Website URL
      const link = document.querySelector('#header a.redirect[target="_blank"]');
      r.websiteUrl = link ? link.getAttribute("href") : null;

      // Score
      const scoreEl = document.querySelector(".btn-mark");
      if (scoreEl) {
        const m = scoreEl.textContent.match(/([\d.]+)/);
        r.score = m ? m[1] : null;
      }

      // Type/Scope
      const typeEl = document.querySelector(".uppercase.italic.grey.size14");
      r.typeScope = typeEl ? typeEl.textContent.trim() : null;

      // Foundation year
      const html = document.body.innerHTML;
      const foundMatch = html.match(/Foundation[^<]*<\/span>\s*<span>(\d{4})/i);
      r.yearFounded = foundMatch ? foundMatch[1] : null;

      // Employees
      const empMatch = html.match(/Nb of employees[^<]*<\/span>\s*<span>([\d\-+]+)/i);
      r.employees = empMatch ? empMatch[1] : null;

      // Countries (from header)
      const headerCol = document.querySelector("#header .col-md-5");
      if (headerCol) {
        const headerHtml = headerCol.innerHTML;
        // Multi countries
        const multiMatch = headerHtml.match(/Multi countries\s*:\s*<\/strong>\s*([\s\S]*?)(?:<br|<span|<h3)/i);
        if (multiMatch) {
          r.countriesServed = multiMatch[1].replace(/<[^>]+>/g, "").trim().split(/\s{2,}/).map(c => c.trim()).filter(c => c.length > 1 && c.length < 50);
        }
        // Or national
        const natMatch = headerHtml.match(/National\s*:\s*<\/strong>\s*([\s\S]*?)(?:<br|<span|<h3)/i);
        if (natMatch && !r.countriesServed) {
          r.countriesServed = natMatch[1].replace(/<[^>]+>/g, "").trim().split(/\s{2,}/).map(c => c.trim()).filter(c => c.length > 1 && c.length < 50);
        }
      }

      // Languages
      const langMatch = html.match(/Site Languages[^<]*<\/span>\s*<span>([\s\S]*?)<\/span>/i);
      if (langMatch) {
        r.languages = langMatch[1].replace(/<[^>]+>/g, "").trim().split(/\s{2,}/).map(l => l.trim()).filter(l => l.length > 0 && l.length < 30);
      }

      // Specialties
      const specMatch = html.match(/Specialities[^<]*<\/span>\s*<span>([\s\S]*?)<\/span>/i);
      if (specMatch) {
        r.specialties = specMatch[1].replace(/<br\s*\/?>/g, "|").replace(/<[^>]+>/g, "").split("|").map(s => s.trim()).filter(s => s.length > 0);
      }

      // Job board link text (sometimes different from the redirect link)
      const linkMatch = html.match(/Job board link\s*:\s*<\/span>\s*<a[^>]*>([^<]+)/i);
      r.jobBoardLink = linkMatch ? linkMatch[1].trim() : null;

      // Screenshot
      const screenshot = document.querySelector("img.printscreen_fond");
      r.screenshotUrl = screenshot ? screenshot.src : null;

      // Logo from header
      const logoImg = document.querySelector('#header a.redirect img');
      r.logoUrl = logoImg ? logoImg.src : null;

      // === ABOUT / PRESENTATION SECTION ===

      // Pricing model (free/chargeable etc)
      const feesUl = document.querySelector("ul.label-fees");
      if (feesUl) {
        r.pricingModel = Array.from(feesUl.querySelectorAll("li")).map(li => li.textContent.trim()).filter(Boolean);
      }

      // Job offers count from about section
      const offersEl = document.querySelector('a[href="#contents"] .size30');
      r.currentJobOffers = offersEl ? offersEl.textContent.trim() : null;

      // Site's statement (#positioning .justify)
      const positioningDiv = document.querySelector("#positioning");
      if (positioningDiv) {
        const justifySpan = positioningDiv.querySelector("span.justify, .justify");
        r.siteStatement = justifySpan ? justifySpan.textContent.trim() : null;
      }

      // JBF Opinion (#sitestatement)
      const sitestatementDiv = document.querySelector("#sitestatement");
      if (sitestatementDiv) {
        // Get all the text inside the p.justify or direct p elements
        const paras = sitestatementDiv.querySelectorAll("p");
        const texts = [];
        for (const p of paras) {
          const t = p.textContent.trim();
          if (t.length > 10) texts.push(t);
        }
        r.jbfOpinion = texts.join("\n\n") || null;
      }

      // === INFO SECTION ===
      const infoSection = document.querySelector("#info");
      if (infoSection) {
        // Marketing activities
        const marketingDiv = infoSection.querySelector("#marketing_communcation .blockview_content");
        r.marketingActivities = marketingDiv ? marketingDiv.textContent.trim() : null;

        // Additional info blocks
        const infoBlocks = infoSection.querySelectorAll(".bloc-content");
        r.additionalInfo = {};
        for (const block of infoBlocks) {
          const titleEl = block.querySelector("h2");
          const contentEl = block.querySelector(".blockview_content");
          if (titleEl && contentEl) {
            const key = titleEl.textContent.trim();
            const val = contentEl.textContent.trim();
            if (key && val && !val.includes("Sign up to access")) {
              r.additionalInfo[key] = val;
            }
          }
        }
      }

      // Last update date
      const lastUpdateMatch = html.match(/Last update\s*:\s*([\d-]+)/i);
      r.lastUpdate = lastUpdateMatch ? lastUpdateMatch[1] : null;

      // === REVIEW SECTION ===
      const reviewSection = document.querySelector("#review");
      if (reviewSection) {
        // Global review score
        const globalRateEl = reviewSection.querySelector(".block_grey-sub-block .rate[data-score]");
        r.globalReviewScore = globalRateEl ? globalRateEl.getAttribute("data-score") : null;

        // Review breakdown (Excellent/Very good/Average/Poor/Bad counts)
        const breakdownRows = reviewSection.querySelectorAll(".block_grey-sub-block .progress-bar");
        if (breakdownRows.length > 0) {
          r.reviewBreakdown = {};
          const labels = ["Excellent", "Very good", "Average", "Poor", "Bad"];
          breakdownRows.forEach((bar, i) => {
            if (labels[i]) {
              const countEl = bar.closest(".row")?.querySelector(".col-md-1");
              r.reviewBreakdown[labels[i]] = countEl ? parseInt(countEl.textContent.trim()) || 0 : 0;
            }
          });
        }

        // Review by type (Recruiters / Jobseekers)
        const sortRows = reviewSection.querySelectorAll(".block_grey-sub-block:nth-child(2) .row.placeholder5");
        if (sortRows.length > 0) {
          r.reviewsByType = {};
          for (const row of sortRows) {
            const cols = row.querySelectorAll("div");
            if (cols.length >= 2) {
              const label = cols[0].textContent.trim();
              const count = parseInt(cols[1].textContent.trim()) || 0;
              if (label) r.reviewsByType[label] = count;
            }
          }
        }

        // Detailed review scores
        const detailBlock = reviewSection.querySelector(".block_grey-sub-block-nor-border");
        if (detailBlock) {
          r.reviewDetailScores = {};
          const rows = detailBlock.querySelectorAll(".row");
          for (const row of rows) {
            const label = row.querySelector(".col-md-6:first-child");
            const rateEl = row.querySelector(".rate[data-score]");
            if (label && rateEl) {
              const key = label.textContent.trim();
              const score = rateEl.getAttribute("data-score");
              if (key && score && key !== "Details") {
                r.reviewDetailScores[key] = parseFloat(score);
              }
            }
          }
        }

        // Individual reviews
        const reviewDivs = reviewSection.querySelectorAll(".div-review");
        r.reviews = Array.from(reviewDivs).map(rev => {
          const headerDiv = rev.querySelector(".col-md-12.size16.grey.italic");
          const headerText = headerDiv ? headerDiv.textContent.trim() : "";

          // Extract rating
          const rateEl = rev.querySelector(".rate[data-score]");
          const rating = rateEl ? parseFloat(rateEl.getAttribute("data-score")) : null;

          // Extract author info
          const authorMatch = headerText.match(/^(.+?)(?:\s*-\s*|\s{2,})/);
          const authorName = authorMatch ? authorMatch[1].trim() : headerText.split("-")[0]?.trim();

          // Role (Recruiter/Jobseeker)
          const roleMatch = headerText.match(/- (Recruiter|Jobseeker)/i);
          const role = roleMatch ? roleMatch[1] : null;

          // Comment text
          const commentSpans = rev.querySelectorAll("span");
          let comment = "";
          for (const span of commentSpans) {
            const text = span.textContent.trim();
            if (text.includes("comment :")) continue;
            if (text.length > 20 && !text.includes("data-score") && !text.includes("User friendly")) {
              comment = text;
              break;
            }
          }

          // Per-review detail scores
          const detailScores = {};
          const reviewRows = rev.querySelectorAll(".col-md-4 .row");
          for (const row of reviewRows) {
            const labelEl = row.querySelector(".col-md-5");
            const scoreEl = row.querySelector(".rate[data-score]");
            if (labelEl && scoreEl) {
              detailScores[labelEl.textContent.trim()] = parseFloat(scoreEl.getAttribute("data-score"));
            }
          }

          return {
            rating,
            author: authorName || null,
            role,
            comment: comment || null,
            detailScores: Object.keys(detailScores).length > 0 ? detailScores : null,
          };
        });

        // Cloud tags (keywords from reviews)
        const cloudTags = reviewSection.querySelectorAll("#cloudtags span");
        r.reviewTags = Array.from(cloudTags).map(s => s.textContent.trim()).filter(t => t.length > 0);
      }

      // === SIMILAR JOB BOARDS ===
      const similarSection = document.querySelector("#similar-jobboards");
      if (similarSection) {
        r.similarJobBoards = Array.from(similarSection.querySelectorAll("a.btn[href*='/jobboard-']")).map(a => ({
          name: a.textContent.replace("Discover ", "").trim(),
          slug: a.getAttribute("href")?.replace(/^.*\/jobboard-/, ""),
        }));
      }

      // === CONTACT ===
      const bodyText = document.body.textContent;
      const emailMatch = bodyText.match(/[\w.+-]+@[\w-]+\.[\w.-]+/g);
      if (emailMatch) {
        r.emails = [...new Set(emailMatch.filter(e => !e.includes("jobboardfinder")))];
      }

      // Phone
      const phoneMatch = bodyText.match(/\+\d[\d\s()-]{7,20}/g);
      if (phoneMatch) {
        r.phones = [...new Set(phoneMatch.map(p => p.trim()))];
      }

      return r;
    });
  } catch (err) {
    return { _error: err.message };
  }
}

async function main() {
  const listings = JSON.parse(fs.readFileSync("listings.json", "utf-8"));
  const batch = listings.slice(BATCH_START, BATCH_END);
  console.log(`Batch ${BATCH_START}-${BATCH_END}: ${batch.length} pages`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  const results = {};
  let done = 0;

  for (const listing of batch) {
    done++;
    const detail = await scrapeDetail(page, listing.detailUrl);
    if (detail) results[listing.slug] = detail;
    if (done % 20 === 0) {
      console.log(`  [${done}/${batch.length}] done`);
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
    }
    await page.waitForTimeout(500 + Math.random() * 500);
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
  console.log(`Done! ${Object.keys(results).length} saved to ${OUTPUT_FILE}`);
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
