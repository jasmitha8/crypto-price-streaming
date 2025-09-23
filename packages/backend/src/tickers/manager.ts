import { EventEmitter } from "events";
import { Browser } from "playwright";
import { readPriceFromPage } from "./priceScraper.js";
import { PriceUpdate } from "../gen/pricefeed/v1/pricefeed_pb.js";

export class TickerManager {
  constructor(private browser: Browser) {}

  async acquire(exchange: string, ticker: string) {
    const emitter = new EventEmitter();
    let active = true;

    // Open one page for this ticker
    const page = await this.browser.newPage();
    const url = `https://www.tradingview.com/symbols/${ticker}/?exchange=${exchange}`;
    await page.goto(url, { waitUntil: "domcontentloaded" });
    console.log(`[manager] Opened page for ${exchange}:${ticker}`);

    const loop = async () => {
  while (active) {
    try {
      const price = await readPriceFromPage(page);
      const update = new PriceUpdate({
        ticker,
        exchange,
        price,
        tsUnixMs: BigInt(Date.now()),
      });
      emitter.emit("price", update);
      console.log(`[manager] emit ${exchange}:${ticker} = ${price}`);
    } catch (err) {
  if (err instanceof Error) {
    console.error(`[manager] Failed ${exchange}:${ticker}:`, err.message);
  } else {
    console.error(`[manager] Failed ${exchange}:${ticker}:`, err);
  }
}

    if (active) {
      await new Promise((r) => setTimeout(r, 5000));
    }
  }

  await page.close().catch(() => {});
  console.log(`[manager] Closed page for ${exchange}:${ticker}`);
};


    loop(); // fire and forget

    return {
      emitter,
      release: () => {
        active = false;
      },
    };
  }
}
