import { Page } from "playwright";

export async function readPriceFromPage(page: Page): Promise<number> {
  const selectors = [
    ".lastContainer-zoF9r75I .js-symbol-last", // main layout
    "span.js-symbol-last",                      // fallback
    "span.value-MounR3ug.js-symbol-last",       // alt layout
  ];

  for (const sel of selectors) {
    try {
      await page.waitForSelector(sel, { timeout: 5000 });
      const txt = await page.locator(sel).first().textContent();
      if (txt) {
        const num = parseFloat(txt.replace(/,/g, "").replace(/[^\d.]+/g, ""));
        if (!Number.isNaN(num)) {
          return num;
        }
      }
    } catch {
      continue; // try next selector
    }
  }

  // As a last fallback, inspect all js-symbol-last spans
  const texts: string[] = await page.evaluate(() =>
    Array.from(document.querySelectorAll("span.js-symbol-last")).map(
      (el) => el.textContent || ""
    )
  );
  for (const t of texts) {
    const num = parseFloat(t.replace(/,/g, "").replace(/[^\d.]+/g, ""));
    if (!Number.isNaN(num)) {
      return num;
    }
  }

  throw new Error("Price element not found or unparsable");
}
