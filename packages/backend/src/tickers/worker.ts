import { Browser, Page } from "playwright";
import { EventEmitter } from "events";
import { PriceUpdate } from "../gen/pricefeed/v1/pricefeed_pb";

export class TickerWorker {
  private browser: Browser;
  private exchange: string;
  private ticker: string;
  private page: Page | null = null;
  public emitter = new EventEmitter();

  constructor(browser: Browser, exchange: string, ticker: string) {
    this.browser = browser;
    this.exchange = exchange;
    this.ticker = ticker;
  }

  async start() {
    const ctx = await this.browser.newContext();
    const page = await ctx.newPage();
    this.page = page;

    const url = `https://www.tradingview.com/symbols/${this.ticker}/?exchange=${this.exchange}`;
    console.log(`[worker] Opening ${url}`);
    await page.goto(url, { waitUntil: "domcontentloaded" });

    // Propagate page console logs to server logs (visibility requirement)
    page.on("console", (msg) => {
      console.log(`[worker:${this.exchange}:${this.ticker}] [page]`, msg.type(), msg.text());
    });

    // Listen for price emissions from the page
    page.on("pageerror", (err) => console.error(`[worker:${this.ticker}] pageerror`, err));
    page.on("crash", () => console.error(`[worker:${this.ticker}] page crashed`));

    // Inject observer: NOTE — selector might need tweaking if TradingView updates DOM.
    // Inspect in DevTools and adjust if needed.
    await page.addInitScript(() => {
      // no-op; placeholder if you want pre-init
    });

    await page.waitForLoadState("networkidle");

    // Try a few plausible selectors; adjust to the one that matches in your run.
    const priceSelectors = [
      '[data-name="last-price-value"]',
      'div[data-symbol-last="true"]',
      'div[data-name="price"]',
      'span.js-symbol-last' // legacy guesses
    ];

    await page.evaluate((selectors) => {
      // Find first matching node
      function findNode(): HTMLElement | null {
        for (const sel of selectors) {
          const el = document.querySelector(sel) as HTMLElement | null;
          if (el && el.textContent && el.textContent.trim().length > 0) return el;
        }
        // fallback: pick the biggest numeric-looking span on the page
        const spans = Array.from(document.querySelectorAll("span")) as HTMLElement[];
        let best: HTMLElement | null = null;
        let bestLen = 0;
        for (const s of spans) {
          const t = (s.textContent || "").trim();
          if (/^\d[\d,]*\.?\d*$/.test(t) && t.length > bestLen) {
            best = s;
            bestLen = t.length;
          }
        }
        return best;
      }

      const target = findNode();
      if (!target) {
        console.warn("[observer] Could not locate a price node yet; DOM may differ.");
        return;
      }
      console.log("[observer] Observing node:", target);

      const send = (value: string) => {
        console.log(JSON.stringify({ __pluto_price__: value }));
      };

      // Emit initial
      if (target.textContent) send(target.textContent.trim());

      const obs = new MutationObserver(() => {
        const txt = target.textContent?.trim() || "";
        if (txt) send(txt);
      });
      obs.observe(target, { characterData: true, subtree: true, childList: true, attributes: true });
    }, priceSelectors);

    // Parse console messages to forward prices to server-side emitter
    page.on("console", (msg) => {
      try {
        const text = msg.text();
        if (!text.includes("__pluto_price__")) return;
        const data = JSON.parse(text);
        const raw = String(data.__pluto_price__);
        const num = Number(raw.replace(/,/g, ""));
        if (!Number.isFinite(num)) return;
        const update: PriceUpdate = {
          ticker: this.ticker,
          exchange: this.exchange,
          price: num,
          tsUnixMs: BigInt(Date.now()) // will be serialized as string then cast
        } as unknown as PriceUpdate;
        this.emitter.emit("price", update);
      } catch {
        // ignore
      }
    });

    console.log(`[worker] Started observer for ${this.exchange}:${this.ticker}`);
  }

  async stop() {
    if (!this.page) return;
    console.log(`[worker] Stopping ${this.exchange}:${this.ticker}`);
    const ctx = this.page.context();
    await this.page.close().catch(() => {});
    await ctx.close().catch(() => {});
    this.page = null;
  }
}
