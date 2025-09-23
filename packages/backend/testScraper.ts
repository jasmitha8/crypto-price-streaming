import { chromium, Page } from "playwright";

async function getPriceForTicker(page: Page, ticker: string): Promise<number> {
  await page.goto(`https://www.tradingview.com/symbols/${ticker}/`, {
    waitUntil: "domcontentloaded",
  });

  const priceSelector = ".lastContainer-zoF9r75I .js-symbol-last";
  await page.waitForSelector(priceSelector, { timeout: 15000 });

  const priceString = await page.locator(priceSelector).first().textContent();
  console.log(`[${ticker}] Raw price text:`, priceString);

  const numberStr = priceString?.replace(/,/g, "").replace(/[^\d.]+/g, "");
  const price = parseFloat(numberStr || "NaN");

  console.log(`[${ticker}] Parsed price:`, price);
  return price;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: pnpm tsx testScraper.ts BTCUSD ADAUSD ETHUSD");
    process.exit(1);
  }

  const tickers = args;
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  for (const ticker of tickers) {
    try {
      await getPriceForTicker(page, ticker.toUpperCase());
    } catch (err) {
      console.error(`[${ticker}] Failed to fetch:`, err);
    }
  }

  await browser.close();
}

main().catch((err) => {
  console.error("Fatal scraper error:", err);
  process.exit(1);
});
