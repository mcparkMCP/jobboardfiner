const { chromium } = require("playwright");

async function findApi() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  // Intercept all network requests
  const apiCalls = [];
  page.on("request", (req) => {
    const url = req.url();
    if (
      url.includes("api") ||
      url.includes("search") ||
      url.includes("ajax") ||
      url.includes("json") ||
      req.resourceType() === "xhr" ||
      req.resourceType() === "fetch"
    ) {
      apiCalls.push({
        url,
        method: req.method(),
        type: req.resourceType(),
        headers: req.headers(),
        postData: req.postData(),
      });
    }
  });

  page.on("response", async (res) => {
    const url = res.url();
    if (
      res.request().resourceType() === "xhr" ||
      res.request().resourceType() === "fetch"
    ) {
      try {
        const body = await res.text();
        console.log(`\n--- XHR/Fetch: ${url} ---`);
        console.log(`Status: ${res.status()}`);
        console.log(`Body preview: ${body.substring(0, 500)}`);
      } catch {}
    }
  });

  await page.goto("https://www.jobboardfinder.com/search", {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await page.waitForTimeout(3000);

  console.log("\n=== Initial page load API calls ===");
  apiCalls.forEach((c) =>
    console.log(`${c.method} ${c.type} ${c.url} ${c.postData || ""}`)
  );

  // Now try changing the per_page dropdown to trigger an AJAX call
  console.log("\n\n=== Changing per_page to 50 ===");
  apiCalls.length = 0;

  // Try to change the dropdown
  await page.evaluate(() => {
    const select = document.querySelector("#per_page");
    if (select) {
      select.value = "50";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
  await page.waitForTimeout(3000);

  console.log("API calls after change:");
  apiCalls.forEach((c) =>
    console.log(`${c.method} ${c.type} ${c.url} ${c.postData || ""}`)
  );

  // Try clicking next page
  console.log("\n\n=== Clicking page 2 ===");
  apiCalls.length = 0;

  try {
    await page.click('a[data-page="2"]', { timeout: 3000 });
  } catch {
    console.log("No page 2 link found, trying other selectors...");
    const pagination = await page.evaluate(() => {
      const links = document.querySelectorAll('.pagination a, [data-page]');
      return Array.from(links).map(a => ({
        text: a.textContent,
        href: a.getAttribute('href'),
        dataPage: a.getAttribute('data-page'),
      }));
    });
    console.log("Pagination links:", JSON.stringify(pagination, null, 2));
  }
  await page.waitForTimeout(3000);

  console.log("API calls after page click:");
  apiCalls.forEach((c) =>
    console.log(`${c.method} ${c.type} ${c.url} ${c.postData || ""}`)
  );

  // Check for any JS files that might contain the API endpoint
  const scripts = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('script[src]')).map(s => s.src);
  });
  console.log("\n\n=== Script sources ===");
  scripts.forEach(s => console.log(s));

  await browser.close();
}

findApi().catch(console.error);
